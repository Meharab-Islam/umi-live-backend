import { getPool, query } from '../config/db.js';
import { cache } from '../config/redis.js';

/**
 * Preview Merge
 * Fetches both the old account and new account and details what will be merged.
 */
export async function previewMerge(req, res) {
  try {
    const { oldUserId, newUserId } = req.query;

    if (!oldUserId || !newUserId) {
      return res.status(400).json({
        success: false,
        message: 'Both Old Account ID and New Account ID are required.',
      });
    }

    const cleanOldId = parseInt(String(oldUserId).replace(/^#/, ''), 10);
    const cleanNewId = parseInt(String(newUserId).replace(/^#/, ''), 10);

    if (isNaN(cleanOldId) || isNaN(cleanNewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user IDs provided.',
      });
    }

    if (cleanOldId === cleanNewId) {
      return res.status(400).json({
        success: false,
        message: 'Old Account and New Account cannot be the same user.',
      });
    }

    // Fetch Old User & New User
    const [oldUser] = await query(
      `SELECT 
        u.*, 
        a.name as agency_name,
        (SELECT COUNT(*) FROM user_entry_effects WHERE user_id = u.id AND is_active = 1 AND expires_at > NOW()) as active_effects_count,
        (SELECT COUNT(*) FROM user_thumbnails WHERE user_id = u.id AND status = 'active' AND expires_at > NOW()) as active_thumbnails_count,
        (SELECT COUNT(*) FROM user_package_subscriptions WHERE user_id = u.id AND status = 'active' AND expires_at > NOW()) as active_packages_count
       FROM users u
       LEFT JOIN agencies a ON u.agency_id = a.id
       WHERE u.id = ?`,
      [cleanOldId]
    );

    const [newUser] = await query(
      `SELECT 
        u.*, 
        a.name as agency_name,
        (SELECT COUNT(*) FROM user_entry_effects WHERE user_id = u.id AND is_active = 1 AND expires_at > NOW()) as active_effects_count,
        (SELECT COUNT(*) FROM user_thumbnails WHERE user_id = u.id AND status = 'active' AND expires_at > NOW()) as active_thumbnails_count,
        (SELECT COUNT(*) FROM user_package_subscriptions WHERE user_id = u.id AND status = 'active' AND expires_at > NOW()) as active_packages_count
       FROM users u
       LEFT JOIN agencies a ON u.agency_id = a.id
       WHERE u.id = ?`,
      [cleanNewId]
    );

    if (!oldUser) {
      return res.status(404).json({
        success: false,
        message: `Old Account #${cleanOldId} was not found.`,
      });
    }

    if (!newUser) {
      return res.status(404).json({
        success: false,
        message: `New Account #${cleanNewId} was not found.`,
      });
    }

    const preview = {
      targetId: oldUser.id,
      newLoginEmail: newUser.email,
      oldEmail: oldUser.email,
      combinedCoins: (oldUser.coins || 0) + (newUser.coins || 0),
      combinedDiamonds: (oldUser.diamonds || 0) + (newUser.diamonds || 0),
      finalRole: oldUser.role && oldUser.role !== 'user' ? oldUser.role : newUser.role,
      finalAgency: oldUser.agency_name || newUser.agency_name || 'None',
      finalVipPackage: oldUser.vip_package || newUser.vip_package || 'Standard',
      oldAccountSummary: {
        id: oldUser.id,
        email: oldUser.email,
        full_name: oldUser.full_name,
        avatar_url: oldUser.avatar_url,
        role: oldUser.role,
        host_type: oldUser.host_type,
        coins: oldUser.coins,
        diamonds: oldUser.diamonds,
        vip_package: oldUser.vip_package,
        agency_name: oldUser.agency_name,
        active_effects_count: oldUser.active_effects_count,
        active_thumbnails_count: oldUser.active_thumbnails_count,
        active_packages_count: oldUser.active_packages_count,
        created_at: oldUser.created_at,
      },
      newAccountSummary: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        avatar_url: newUser.avatar_url,
        role: newUser.role,
        coins: newUser.coins,
        diamonds: newUser.diamonds,
        created_at: newUser.created_at,
      },
    };

    return res.json({
      success: true,
      preview,
    });
  } catch (err) {
    console.error('previewMerge error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate merge preview.',
      error: err.message,
    });
  }
}

/**
 * Execute Merge
 * Atomically transfers new credentials and merges all assets into old account.
 */
export async function executeMerge(req, res) {
  let conn;
  try {
    const { oldUserId, newUserId, reason } = req.body;

    if (!oldUserId || !newUserId) {
      return res.status(400).json({
        success: false,
        message: 'Both Old Account ID and New Account ID are required.',
      });
    }

    const cleanOldId = parseInt(String(oldUserId).replace(/^#/, ''), 10);
    const cleanNewId = parseInt(String(newUserId).replace(/^#/, ''), 10);

    if (isNaN(cleanOldId) || isNaN(cleanNewId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user IDs provided.',
      });
    }

    if (cleanOldId === cleanNewId) {
      return res.status(400).json({
        success: false,
        message: 'Old Account and New Account cannot be the same user.',
      });
    }

    conn = await getPool().getConnection();
    await conn.beginTransaction();

    // 1. Lock and fetch both users
    const [oldUsers] = await conn.execute(
      'SELECT * FROM users WHERE id = ? FOR UPDATE',
      [cleanOldId]
    );
    const [newUsers] = await conn.execute(
      'SELECT * FROM users WHERE id = ? FOR UPDATE',
      [cleanNewId]
    );

    if (oldUsers.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, message: `Old Account #${cleanOldId} not found.` });
    }

    if (newUsers.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, message: `New Account #${cleanNewId} not found.` });
    }

    const oldUser = oldUsers[0];
    const newUser = newUsers[0];

    // 2. Consolidate Coins & Diamonds
    const totalCoins = (oldUser.coins || 0) + (newUser.coins || 0);
    const totalDiamonds = (oldUser.diamonds || 0) + (newUser.diamonds || 0);

    // 3. Move user_entry_effects from newUser to oldUser
    const [newEffects] = await conn.execute(
      'SELECT * FROM user_entry_effects WHERE user_id = ?',
      [newUser.id]
    );
    for (const eff of newEffects) {
      const [existing] = await conn.execute(
        'SELECT id FROM user_entry_effects WHERE user_id = ? AND effect_id = ?',
        [oldUser.id, eff.effect_id]
      );
      if (existing.length === 0) {
        await conn.execute(
          'UPDATE user_entry_effects SET user_id = ? WHERE id = ?',
          [oldUser.id, eff.id]
        );
      } else {
        await conn.execute('DELETE FROM user_entry_effects WHERE id = ?', [eff.id]);
      }
    }

    // 4. Move user_thumbnails from newUser to oldUser
    const [newThumbs] = await conn.execute(
      'SELECT * FROM user_thumbnails WHERE user_id = ?',
      [newUser.id]
    );
    for (const th of newThumbs) {
      const [existing] = await conn.execute(
        'SELECT id FROM user_thumbnails WHERE user_id = ? AND thumbnail_id = ?',
        [oldUser.id, th.thumbnail_id]
      );
      if (existing.length === 0) {
        await conn.execute(
          'UPDATE user_thumbnails SET user_id = ? WHERE id = ?',
          [oldUser.id, th.id]
        );
      } else {
        await conn.execute('DELETE FROM user_thumbnails WHERE id = ?', [th.id]);
      }
    }

    // 5. Move user_package_subscriptions from newUser to oldUser
    const [newSubs] = await conn.execute(
      'SELECT * FROM user_package_subscriptions WHERE user_id = ?',
      [newUser.id]
    );
    for (const s of newSubs) {
      await conn.execute(
        'UPDATE user_package_subscriptions SET user_id = ? WHERE id = ?',
        [oldUser.id, s.id]
      );
    }

    // 6. Migrate other relationships where newUser was involved
    await conn.execute('UPDATE gift_transactions SET sender_id = ? WHERE sender_id = ?', [oldUser.id, newUser.id]);
    await conn.execute('UPDATE gift_transactions SET receiver_id = ? WHERE receiver_id = ?', [oldUser.id, newUser.id]);
    await conn.execute('UPDATE transactions SET user_id = ? WHERE user_id = ?', [oldUser.id, newUser.id]);
    await conn.execute('UPDATE chat_messages SET sender_id = ? WHERE sender_id = ?', [oldUser.id, newUser.id]);
    await conn.execute('UPDATE chat_messages SET receiver_id = ? WHERE receiver_id = ?', [oldUser.id, newUser.id]);
    await conn.execute('UPDATE moderation_reports SET reporter_id = ? WHERE reporter_id = ?', [oldUser.id, newUser.id]);
    await conn.execute('UPDATE moderation_reports SET reported_id = ? WHERE reported_id = ?', [oldUser.id, newUser.id]);
    await conn.execute('UPDATE reseller_sales SET buyer_id = ? WHERE buyer_id = ?', [oldUser.id, newUser.id]);
    await conn.execute('UPDATE reseller_sales SET reseller_id = ? WHERE reseller_id = ?', [oldUser.id, newUser.id]);
    await conn.execute('UPDATE posts SET user_id = ? WHERE user_id = ?', [oldUser.id, newUser.id]);
    await conn.execute('UPDATE host_requests SET user_id = ? WHERE user_id = ?', [oldUser.id, newUser.id]);
    await conn.execute('UPDATE live_rooms SET host_id = ? WHERE host_id = ?', [oldUser.id, newUser.id]);
    await conn.execute('UPDATE withdrawals SET host_id = ? WHERE host_id = ?', [oldUser.id, newUser.id]);

    // 7. Store new email & new password from newUser
    const targetEmail = newUser.email;
    const targetPasswordHash = newUser.password_hash;

    // 8. Rename newUser email temporarily to avoid UNIQUE(email) constraint collision
    const tempEmail = `merged_closed_${newUser.id}_${Date.now()}@merged.local`;
    await conn.execute('UPDATE users SET email = ? WHERE id = ?', [tempEmail, newUser.id]);

    // 9. Now delete the placeholder newUser account
    await conn.execute('DELETE FROM users WHERE id = ?', [newUser.id]);

    // 10. Update oldUser credentials, assets, and roles
    const finalRole = oldUser.role && oldUser.role !== 'user' ? oldUser.role : newUser.role;
    const finalHostType = oldUser.host_type && oldUser.host_type !== 'none' ? oldUser.host_type : newUser.host_type;
    const finalAgencyId = oldUser.agency_id || newUser.agency_id;
    const finalVipPackage = oldUser.vip_package && oldUser.vip_package !== 'Standard' ? oldUser.vip_package : newUser.vip_package;

    await conn.execute(
      `UPDATE users 
       SET 
         email = ?, 
         password_hash = ?, 
         coins = ?, 
         diamonds = ?, 
         role = ?, 
         host_type = ?, 
         agency_id = ?, 
         vip_package = ?, 
         updated_at = NOW() 
       WHERE id = ?`,
      [
        targetEmail,
        targetPasswordHash,
        totalCoins,
        totalDiamonds,
        finalRole,
        finalHostType,
        finalAgencyId,
        finalVipPackage,
        oldUser.id,
      ]
    );

    // 11. Write audit log
    await conn.execute(
      `INSERT INTO account_merges 
       (source_user_id, source_old_email, target_user_id, target_new_email, admin_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        oldUser.id,
        oldUser.email,
        newUser.id,
        targetEmail,
        req.user?.id || null,
        JSON.stringify({
          reason: reason || 'User lost old account email; transferred login email and merged assets.',
          mergedCoins: newUser.coins || 0,
          mergedDiamonds: newUser.diamonds || 0,
          totalCoins,
          totalDiamonds,
          finalRole,
          timestamp: new Date().toISOString(),
        }),
      ]
    );

    await conn.commit();
    conn.release();

    // Database write succeeded -> Invalidate Redis cache
    await cache.del(
      `user:${oldUser.id}`,
      `user:${newUser.id}`,
      `user:balance:${oldUser.id}`,
      `user:balance:${newUser.id}`,
      `user:privileges:${oldUser.id}`,
      `user:privileges:${newUser.id}`,
      `mobile:user:profile:${oldUser.id}`,
      `mobile:user:profile:${newUser.id}`
    );
    await cache.delByPattern('admin:users*');
    await cache.delByPattern('admin:dashboard*');
    await cache.delByPattern('merges:*');

    return res.json({
      success: true,
      message: `Account #${oldUser.id} successfully updated! The user can now log in using "${targetEmail}" and access all their original data, ID #${oldUser.id}, VIP perks, diamonds, coins, and host/agency status.`,
      mergedUser: {
        id: oldUser.id,
        email: targetEmail,
        coins: totalCoins,
        diamonds: totalDiamonds,
        role: finalRole,
      },
    });
  } catch (err) {
    if (conn) {
      await conn.rollback();
      conn.release();
    }
    console.error('executeMerge error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to merge accounts: ' + err.message,
      error: err.message,
    });
  }
}

/**
 * Get Merge History
 * Returns log of past account merges for admin audit.
 */
export async function getMergeHistory(req, res) {
  try {
    const history = await cache.getOrSet('merges:history', 60, async () => {
      const rows = await query(
        `SELECT 
          am.*,
          u.full_name as current_user_name,
          u.role as current_user_role,
          admin.full_name as admin_name
         FROM account_merges am
         LEFT JOIN users u ON am.source_user_id = u.id
         LEFT JOIN users admin ON am.admin_id = admin.id
         ORDER BY am.id DESC
         LIMIT 100`
      );
      return rows || [];
    });

    return res.json({
      success: true,
      history: history || [],
    });
  } catch (err) {
    console.error('getMergeHistory error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch merge history.',
      error: err.message,
    });
  }
}
