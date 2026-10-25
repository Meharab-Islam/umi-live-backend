import { query } from '../config/db.js';
import cache from '../config/redis.js';

// ==========================================
// THUMBNAILS CONTROLLERS
// ==========================================

export async function getThumbnails(req, res) {
  try {
    const thumbnails = await cache.getOrSet('thumbnails:catalog', 600, async () => {
      const rows = await query(`
        SELECT 
          st.*,
          (SELECT COUNT(*) FROM user_thumbnails ut 
           WHERE ut.thumbnail_id = st.id AND ut.status = 'active' AND ut.expires_at > NOW()) as active_holders_count
        FROM special_thumbnails st
        ORDER BY st.id DESC
      `);
      return rows || [];
    });

    return res.json({
      success: true,
      thumbnails: thumbnails || [],
    });
  } catch (err) {
    console.error('getThumbnails error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch thumbnails.', error: err.message });
  }
}

export async function createThumbnail(req, res) {
  try {
    const { name, image_url, price, validity_days, is_active = true } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Thumbnail name is required.' });
    }
    if (!image_url || !image_url.trim()) {
      return res.status(400).json({ success: false, message: 'Thumbnail image URL is required.' });
    }

    const result = await query(
      `INSERT INTO special_thumbnails (name, image_url, price, validity_days, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [
        name.trim(),
        image_url.trim(),
        parseInt(price, 10) || 0,
        parseInt(validity_days, 10) || 30,
        is_active ? 1 : 0,
      ]
    );

    // Invalidate Redis thumbnails cache
    await cache.delByPattern('thumbnails:*');

    return res.json({
      success: true,
      message: `Thumbnail "${name}" created successfully.`,
      thumbnailId: result.insertId,
    });
  } catch (err) {
    console.error('createThumbnail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create thumbnail.', error: err.message });
  }
}

export async function updateThumbnail(req, res) {
  try {
    const { id } = req.params;
    const { name, image_url, price, validity_days, is_active } = req.body;

    const [existing] = await query('SELECT * FROM special_thumbnails WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Thumbnail not found.' });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (image_url !== undefined) {
      updates.push('image_url = ?');
      params.push(image_url.trim());
    }
    if (price !== undefined) {
      updates.push('price = ?');
      params.push(parseInt(price, 10) || 0);
    }
    if (validity_days !== undefined) {
      updates.push('validity_days = ?');
      params.push(parseInt(validity_days, 10) || 30);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (updates.length > 0) {
      params.push(id);
      await query(`UPDATE special_thumbnails SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Invalidate Redis thumbnails cache
    await cache.delByPattern('thumbnails:*');

    return res.json({
      success: true,
      message: 'Thumbnail updated successfully.',
    });
  } catch (err) {
    console.error('updateThumbnail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update thumbnail.', error: err.message });
  }
}

export async function deleteThumbnail(req, res) {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT * FROM special_thumbnails WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Thumbnail not found.' });
    }

    // Cascade delete user subscriptions
    await query('DELETE FROM user_thumbnails WHERE thumbnail_id = ?', [id]);
    // Delete thumbnail
    await query('DELETE FROM special_thumbnails WHERE id = ?', [id]);

    // Invalidate Redis thumbnails cache
    await cache.delByPattern('thumbnails:*');

    return res.json({
      success: true,
      message: `Thumbnail "${existing.name}" and associated assignments deleted.`,
    });
  } catch (err) {
    console.error('deleteThumbnail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete thumbnail.', error: err.message });
  }
}

export async function getThumbnailSubscribers(req, res) {
  try {
    const { thumbnailId, search, page = 1, limit = 15 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const conditions = [];
    const params = [];

    if (thumbnailId) {
      conditions.push('ut.thumbnail_id = ?');
      params.push(thumbnailId);
    }
    if (search) {
      conditions.push('(u.id = ? OR u.full_name LIKE ? OR u.email LIKE ?)');
      params.push(search, `%${search}%`, `%${search}%`);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const subscribers = await query(`
      SELECT 
        ut.id as subscription_id,
        ut.user_id,
        ut.thumbnail_id,
        ut.start_date,
        ut.expires_at,
        ut.status,
        CASE WHEN ut.status = 'active' AND ut.expires_at > NOW() THEN 1 ELSE 0 END as is_currently_active,
        GREATEST(0, TIMESTAMPDIFF(DAY, NOW(), ut.expires_at)) as days_remaining,
        u.full_name as user_name,
        u.email as user_email,
        u.avatar_url as user_avatar,
        st.name as thumbnail_name,
        st.image_url as thumbnail_image,
        st.validity_days
      FROM user_thumbnails ut
      JOIN users u ON ut.user_id = u.id
      JOIN special_thumbnails st ON ut.thumbnail_id = st.id
      ${whereSql}
      ORDER BY is_currently_active DESC, ut.expires_at DESC
      LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}
    `, params);

    const [totalRows] = await query(`
      SELECT COUNT(*) as count 
      FROM user_thumbnails ut
      JOIN users u ON ut.user_id = u.id
      JOIN special_thumbnails st ON ut.thumbnail_id = st.id
      ${whereSql}
    `, params);

    return res.json({
      success: true,
      subscribers: subscribers || [],
      pagination: {
        total: totalRows.count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      },
    });
  } catch (err) {
    console.error('getThumbnailSubscribers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch thumbnail subscribers.', error: err.message });
  }
}

export async function grantThumbnailToUser(req, res) {
  try {
    const { userId, thumbnailId, customValidityDays } = req.body;

    if (!userId || !thumbnailId) {
      return res.status(400).json({ success: false, message: 'User ID and Thumbnail are required.' });
    }

    const cleanUserId = parseInt(String(userId).replace(/^#/, ''), 10);
    const [user] = await query('SELECT * FROM users WHERE id = ?', [cleanUserId]);
    if (!user) {
      return res.status(404).json({ success: false, message: `User #${cleanUserId} not found.` });
    }

    const [thumb] = await query('SELECT * FROM special_thumbnails WHERE id = ?', [thumbnailId]);
    if (!thumb) {
      return res.status(404).json({ success: false, message: 'Selected thumbnail not found.' });
    }

    const parsedCustom = parseInt(customValidityDays, 10);
    const durationDays = (!isNaN(parsedCustom) && parsedCustom > 0)
      ? parsedCustom
      : (parseInt(thumb.validity_days, 10) || 30);

    // Check if user already holds active thumbnail; extend if so
    const [existing] = await query(`
      SELECT * FROM user_thumbnails 
      WHERE user_id = ? AND thumbnail_id = ? AND status = 'active' AND expires_at > NOW()
      ORDER BY expires_at DESC LIMIT 1
    `, [cleanUserId, thumb.id]);

    if (existing) {
      await query(`
        UPDATE user_thumbnails 
        SET expires_at = DATE_ADD(expires_at, INTERVAL ? DAY), updated_at = NOW()
        WHERE id = ?
      `, [durationDays, existing.id]);
    } else {
      await query(`
        INSERT INTO user_thumbnails 
        (user_id, thumbnail_id, start_date, expires_at, status)
        VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 'active')
      `, [cleanUserId, thumb.id, durationDays]);
    }

    // Invalidate caches
    await cache.delByPattern('thumbnails:*');
    await cache.del(`user:${cleanUserId}`);
    await cache.del(`user:thumbnails:${cleanUserId}`);
    await cache.del(`mobile:user:profile:${cleanUserId}`);

    return res.json({
      success: true,
      message: `Thumbnail "${thumb.name}" (${durationDays} days) assigned to User #${cleanUserId} (${user.full_name || 'User'}).`,
    });
  } catch (err) {
    console.error('grantThumbnailToUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to grant thumbnail.', error: err.message });
  }
}

export async function revokeThumbnailSubscription(req, res) {
  try {
    const { id } = req.params;
    const subRows = await query('SELECT user_id FROM user_thumbnails WHERE id = ? LIMIT 1', [id]);
    const userId = subRows[0]?.user_id;

    await query("UPDATE user_thumbnails SET status = 'cancelled' WHERE id = ?", [id]);
    await cache.delByPattern('thumbnails:*');
    if (userId) {
      await cache.del(
        `user:${userId}`,
        `user:thumbnails:${userId}`,
        `mobile:user:profile:${userId}`
      );
    } else {
      await cache.delByPattern('user:thumbnails:*');
      await cache.delByPattern('mobile:user:profile:*');
    }
    return res.json({ success: true, message: 'Thumbnail assignment revoked.' });
  } catch (err) {
    console.error('revokeThumbnailSubscription error:', err);
    return res.status(500).json({ success: false, message: 'Failed to revoke thumbnail.', error: err.message });
  }
}

// ==========================================
// ENTRY EFFECTS CONTROLLERS
// ==========================================

export async function getEntryEffects(req, res) {
  try {
    const effects = await cache.getOrSet('entry_effects:catalog', 600, async () => {
      const rows = await query(`
        SELECT 
          ee.*,
          (SELECT COUNT(*) FROM user_entry_effects uee 
           WHERE uee.effect_id = ee.id AND uee.status = 'active' AND uee.expires_at > NOW()) as active_holders_count
        FROM entry_effects ee
        ORDER BY ee.id DESC
      `);
      return rows || [];
    });

    return res.json({
      success: true,
      effects: effects || [],
    });
  } catch (err) {
    console.error('getEntryEffects error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch entry effects.', error: err.message });
  }
}

export async function createEntryEffect(req, res) {
  try {
    const {
      name,
      effect_type = 'gif',
      preview_image_url = '',
      svga_url = '',
      gif_url = '',
      sound_url = '',
      price = 2000,
      validity_days = 30,
      is_active = true,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Entry effect name is required.' });
    }

    if (effect_type === 'svga') {
      if (!svga_url || !svga_url.trim()) {
        return res.status(400).json({ success: false, message: 'SVGA file URL is required when format is SVGA.' });
      }
    } else {
      if (!gif_url || !gif_url.trim()) {
        return res.status(400).json({ success: false, message: 'GIF image URL is required when format is GIF.' });
      }
    }

    const result = await query(
      `INSERT INTO entry_effects 
       (name, effect_type, preview_image_url, svga_url, gif_url, sound_url, price, validity_days, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        effect_type === 'svga' ? 'svga' : 'gif',
        preview_image_url ? preview_image_url.trim() : '',
        svga_url ? svga_url.trim() : '',
        gif_url ? gif_url.trim() : '',
        sound_url ? sound_url.trim() : '',
        parseInt(price, 10) || 0,
        parseInt(validity_days, 10) || 30,
        is_active ? 1 : 0,
      ]
    );

    // Invalidate Redis entry effects cache
    await cache.delByPattern('entry_effects:*');

    return res.json({
      success: true,
      message: `Entry effect "${name}" (${effect_type.toUpperCase()}) created successfully.`,
      effectId: result.insertId,
    });
  } catch (err) {
    console.error('createEntryEffect error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create entry effect.', error: err.message });
  }
}

export async function updateEntryEffect(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      effect_type,
      preview_image_url,
      svga_url,
      gif_url,
      sound_url,
      price,
      validity_days,
      is_active,
    } = req.body;

    const [existing] = await query('SELECT * FROM entry_effects WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Entry effect not found.' });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (effect_type !== undefined) {
      updates.push('effect_type = ?');
      params.push(effect_type === 'svga' ? 'svga' : 'gif');
    }
    if (preview_image_url !== undefined) {
      updates.push('preview_image_url = ?');
      params.push(preview_image_url.trim());
    }
    if (svga_url !== undefined) {
      updates.push('svga_url = ?');
      params.push(svga_url.trim());
    }
    if (gif_url !== undefined) {
      updates.push('gif_url = ?');
      params.push(gif_url.trim());
    }
    if (sound_url !== undefined) {
      updates.push('sound_url = ?');
      params.push(sound_url.trim());
    }
    if (price !== undefined) {
      updates.push('price = ?');
      params.push(parseInt(price, 10) || 0);
    }
    if (validity_days !== undefined) {
      updates.push('validity_days = ?');
      params.push(parseInt(validity_days, 10) || 30);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (updates.length > 0) {
      params.push(id);
      await query(`UPDATE entry_effects SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Invalidate Redis entry effects cache
    await cache.delByPattern('entry_effects:*');

    return res.json({
      success: true,
      message: 'Entry effect updated successfully.',
    });
  } catch (err) {
    console.error('updateEntryEffect error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update entry effect.', error: err.message });
  }
}

export async function deleteEntryEffect(req, res) {
  try {
    const { id } = req.params;
    const [existing] = await query('SELECT * FROM entry_effects WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Entry effect not found.' });
    }

    // Cascade delete user subscriptions
    await query('DELETE FROM user_entry_effects WHERE effect_id = ?', [id]);
    // Delete effect
    await query('DELETE FROM entry_effects WHERE id = ?', [id]);

    // Invalidate Redis entry effects cache
    await cache.delByPattern('entry_effects:*');

    return res.json({
      success: true,
      message: `Entry effect "${existing.name}" and associated assignments deleted.`,
    });
  } catch (err) {
    console.error('deleteEntryEffect error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete entry effect.', error: err.message });
  }
}

export async function getEntryEffectSubscribers(req, res) {
  try {
    const { effectId, search, page = 1, limit = 15 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const conditions = [];
    const params = [];

    if (effectId) {
      conditions.push('uee.effect_id = ?');
      params.push(effectId);
    }
    if (search) {
      conditions.push('(u.id = ? OR u.full_name LIKE ? OR u.email LIKE ?)');
      params.push(search, `%${search}%`, `%${search}%`);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const subscribers = await query(`
      SELECT 
        uee.id as subscription_id,
        uee.user_id,
        uee.effect_id,
        uee.start_date,
        uee.expires_at,
        uee.status,
        CASE WHEN uee.status = 'active' AND uee.expires_at > NOW() THEN 1 ELSE 0 END as is_currently_active,
        GREATEST(0, TIMESTAMPDIFF(DAY, NOW(), uee.expires_at)) as days_remaining,
        u.full_name as user_name,
        u.email as user_email,
        u.avatar_url as user_avatar,
        ee.name as effect_name,
        ee.effect_type,
        ee.preview_image_url,
        ee.gif_url,
        ee.svga_url,
        ee.sound_url,
        ee.validity_days
      FROM user_entry_effects uee
      JOIN users u ON uee.user_id = u.id
      JOIN entry_effects ee ON uee.effect_id = ee.id
      ${whereSql}
      ORDER BY is_currently_active DESC, uee.expires_at DESC
      LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}
    `, params);

    const [totalRows] = await query(`
      SELECT COUNT(*) as count 
      FROM user_entry_effects uee
      JOIN users u ON uee.user_id = u.id
      JOIN entry_effects ee ON uee.effect_id = ee.id
      ${whereSql}
    `, params);

    return res.json({
      success: true,
      subscribers: subscribers || [],
      pagination: {
        total: totalRows.count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      },
    });
  } catch (err) {
    console.error('getEntryEffectSubscribers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch entry effect subscribers.', error: err.message });
  }
}

export async function grantEntryEffectToUser(req, res) {
  try {
    const { userId, effectId, customValidityDays } = req.body;

    if (!userId || !effectId) {
      return res.status(400).json({ success: false, message: 'User ID and Entry Effect are required.' });
    }

    const cleanUserId = parseInt(String(userId).replace(/^#/, ''), 10);
    const [user] = await query('SELECT * FROM users WHERE id = ?', [cleanUserId]);
    if (!user) {
      return res.status(404).json({ success: false, message: `User #${cleanUserId} not found.` });
    }

    const [eff] = await query('SELECT * FROM entry_effects WHERE id = ?', [effectId]);
    if (!eff) {
      return res.status(404).json({ success: false, message: 'Selected entry effect not found.' });
    }

    const parsedCustom = parseInt(customValidityDays, 10);
    const durationDays = (!isNaN(parsedCustom) && parsedCustom > 0)
      ? parsedCustom
      : (parseInt(eff.validity_days, 10) || 30);

    // Check if user already holds active effect; extend if so
    const [existing] = await query(`
      SELECT * FROM user_entry_effects 
      WHERE user_id = ? AND effect_id = ? AND status = 'active' AND expires_at > NOW()
      ORDER BY expires_at DESC LIMIT 1
    `, [cleanUserId, eff.id]);

    if (existing) {
      await query(`
        UPDATE user_entry_effects 
        SET expires_at = DATE_ADD(expires_at, INTERVAL ? DAY), updated_at = NOW()
        WHERE id = ?
      `, [durationDays, existing.id]);
    } else {
      await query(`
        INSERT INTO user_entry_effects 
        (user_id, effect_id, start_date, expires_at, status)
        VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 'active')
      `, [cleanUserId, eff.id, durationDays]);
    }

    // Invalidate caches
    await cache.delByPattern('entry_effects:*');
    await cache.del(`user:${cleanUserId}`);
    await cache.del(`user:entry_effects:${cleanUserId}`);
    await cache.del(`mobile:user:profile:${cleanUserId}`);

    return res.json({
      success: true,
      message: `Entry effect "${eff.name}" (${durationDays} days) assigned to User #${cleanUserId} (${user.full_name || 'User'}).`,
    });
  } catch (err) {
    console.error('grantEntryEffectToUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to grant entry effect.', error: err.message });
  }
}

export async function revokeEntryEffectSubscription(req, res) {
  try {
    const { id } = req.params;
    const subRows = await query('SELECT user_id FROM user_entry_effects WHERE id = ? LIMIT 1', [id]);
    const userId = subRows[0]?.user_id;

    await query("UPDATE user_entry_effects SET status = 'cancelled' WHERE id = ?", [id]);
    await cache.delByPattern('entry_effects:*');
    if (userId) {
      await cache.del(
        `user:${userId}`,
        `user:entry_effects:${userId}`,
        `mobile:user:profile:${userId}`
      );
    } else {
      await cache.delByPattern('user:entry_effects:*');
      await cache.delByPattern('mobile:user:profile:*');
    }
    return res.json({ success: true, message: 'Entry effect assignment revoked.' });
  } catch (err) {
    console.error('revokeEntryEffectSubscription error:', err);
    return res.status(500).json({ success: false, message: 'Failed to revoke entry effect.', error: err.message });
  }
}
