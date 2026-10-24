import { query } from '../config/db.js';
import { cache } from '../config/redis.js';
import { sendLevelUpPushNotification } from '../config/firebase.js';
import { getStarProgressionConfig, calculateUserStars } from './systemService.js';

/**
 * Level Progression & Rewards Engine
 * Evaluates coin spending, updates cumulative exp/spent, grants level rewards (coins, diamonds, entry effects, thumbnails, packages)
 * with designated validity periods, and pushes real-time WebSocket notifications.
 */
export async function recordCoinsSpentAndCheckLevelUp(userId, coinsSpent, io = null) {
  try {
    const numCoins = parseInt(coinsSpent, 10);
    if (!userId || isNaN(numCoins) || numCoins <= 0) return null;

    // 1. Database-First Atomic Increment of total_coins_spent
    await query('UPDATE users SET total_coins_spent = total_coins_spent + ? WHERE id = ?', [numCoins, userId]);

    // 2. Fetch updated user stats
    const userRows = await query(
      'SELECT id, level, total_coins_spent, coins, diamonds, full_name, avatar_url FROM users WHERE id = ?',
      [userId]
    );
    if (!userRows || userRows.length === 0) return null;
    const user = userRows[0];
    const currentLevel = parseInt(user.level || 1, 10);
    const totalSpent = BigInt(user.total_coins_spent || 0);

    // 2.1 Calculate and update User Star Rating dynamically (SSOT)
    const starConfig = await getStarProgressionConfig();
    const newStars = calculateUserStars(totalSpent, starConfig);
    await query('UPDATE users SET star = ? WHERE id = ?', [newStars, userId]);

    // 3. Fetch all active level configs (cached via Redis Cache-Aside, TTL: 300s)
    const levelConfigs = await cache.getOrSet('levels:all_active', 300, async () => {
      return await query(
        `SELECT lc.*, 
                ee.name as effect_name, ee.preview_image_url as effect_preview,
                st.name as thumbnail_name, st.image_url as thumbnail_preview,
                pp.name as package_name, pp.image_url as package_preview, pp.category_id as package_category_id
         FROM level_configs lc
         LEFT JOIN entry_effects ee ON lc.reward_entry_effect_id = ee.id
         LEFT JOIN special_thumbnails st ON lc.reward_thumbnail_id = st.id
         LEFT JOIN privilege_packages pp ON lc.reward_package_id = pp.id
         WHERE lc.is_active = TRUE
         ORDER BY lc.level_number ASC`
      );
    });

    if (!levelConfigs || levelConfigs.length === 0) return null;

    // 4. Find the highest eligible level configuration
    let targetLevelConfig = levelConfigs[0];
    for (const lc of levelConfigs) {
      if (totalSpent >= BigInt(lc.min_coins_spent)) {
        targetLevelConfig = lc;
      } else {
        break;
      }
    }

    const newLevel = parseInt(targetLevelConfig.level_number, 10);

    // 5. If user leveled up, apply all unlocked level rewards sequentially
    if (newLevel > currentLevel) {
      const awardedLevels = [];

      for (const lc of levelConfigs) {
        const lvlNum = parseInt(lc.level_number, 10);
        if (lvlNum > currentLevel && lvlNum <= newLevel) {
          // Check if this level's rewards were already awarded
          const claimedRows = await query(
            'SELECT id FROM user_level_rewards WHERE user_id = ? AND level_reached = ?',
            [userId, lvlNum]
          );

          if (!claimedRows || claimedRows.length === 0) {
            const rewardCoins = parseInt(lc.reward_coins || 0, 10);
            const rewardDiamonds = parseInt(lc.reward_diamonds || 0, 10);
            const validityDays = parseInt(lc.reward_validity_days || 7, 10);

            // A. Award Coins & Diamonds to user wallet
            if (rewardCoins > 0 || rewardDiamonds > 0) {
              await query(
                'UPDATE users SET coins = coins + ?, diamonds = diamonds + ? WHERE id = ?',
                [rewardCoins, rewardDiamonds, userId]
              );
            }

            // B. Award Entry Effect (with expiration)
            if (lc.reward_entry_effect_id) {
              await query(
                `INSERT INTO user_entry_effects (user_id, effect_id, start_date, expires_at, status, is_equipped)
                 VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 'active', 1)
                 ON DUPLICATE KEY UPDATE 
                   expires_at = DATE_ADD(GREATEST(expires_at, NOW()), INTERVAL ? DAY),
                   status = 'active',
                   is_equipped = 1`,
                [userId, lc.reward_entry_effect_id, validityDays, validityDays]
              );
            }

            // C. Award Special Thumbnail (with expiration)
            if (lc.reward_thumbnail_id) {
              await query(
                `INSERT INTO user_thumbnails (user_id, thumbnail_id, start_date, expires_at, status, is_equipped)
                 VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 'active', 1)
                 ON DUPLICATE KEY UPDATE 
                   expires_at = DATE_ADD(GREATEST(expires_at, NOW()), INTERVAL ? DAY),
                   status = 'active',
                   is_equipped = 1`,
                [userId, lc.reward_thumbnail_id, validityDays, validityDays]
              );
            }

            // D. Award Privilege VIP Package (with expiration)
            if (lc.reward_package_id) {
              const catId = lc.package_category_id || 1;
              await query(
                `INSERT INTO user_package_subscriptions (user_id, package_id, category_id, start_date, expires_at, status, is_equipped)
                 VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 'active', 1)
                 ON DUPLICATE KEY UPDATE 
                   expires_at = DATE_ADD(GREATEST(expires_at, NOW()), INTERVAL ? DAY),
                   status = 'active',
                   is_equipped = 1`,
                [userId, lc.reward_package_id, catId, validityDays, validityDays]
              );
            }

            // Record into audit ledger
            await query(
              `INSERT INTO user_level_rewards 
                (user_id, level_reached, coins_awarded, diamonds_awarded, entry_effect_id, thumbnail_id, package_id, reward_duration_days)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                userId,
                lvlNum,
                rewardCoins,
                rewardDiamonds,
                lc.reward_entry_effect_id || null,
                lc.reward_thumbnail_id || null,
                lc.reward_package_id || null,
                validityDays,
              ]
            );

            awardedLevels.push({
              level: lvlNum,
              name: lc.level_name,
              badge_color: lc.badge_color,
              coins: rewardCoins,
              diamonds: rewardDiamonds,
              entry_effect: lc.effect_name || null,
              thumbnail: lc.thumbnail_name || null,
              package: lc.package_name || null,
              validity_days: validityDays,
            });
          }
        }
      }

      // Update user's official level in database
      await query('UPDATE users SET level = ? WHERE id = ?', [newLevel, userId]);

      // Instant Invalidation of user profile and level Redis caches
      await cache.del(`user:profile:${userId}`);
      await cache.del(`mobile:user:profile:${userId}`);
      await cache.del(`levels:user:${userId}`);
      await cache.del('leaderboard:gifters:*');

      const levelUpPayload = {
        user_id: userId,
        user_name: user.full_name,
        user_avatar: user.avatar_url,
        old_level: currentLevel,
        new_level: newLevel,
        level_name: targetLevelConfig.level_name,
        badge_color: targetLevelConfig.badge_color,
        awarded_levels: awardedLevels,
        timestamp: new Date().toISOString(),
      };

      // Broadcast real-time Socket.IO event if io instance provided
      if (io) {
        // Emit to user's private channel
        io.to(`user_${userId}`).emit('user:level_up', levelUpPayload);
        // Also broadcast global celebratory toast
        io.emit('global:user_level_up', {
          user_id: userId,
          user_name: user.full_name,
          new_level: newLevel,
          level_name: targetLevelConfig.level_name,
        });
      }

      // Format human-readable rewards summary for Push Notification
      const rewardItems = [];
      let totalCoinsGranted = 0;
      let totalDiamondsGranted = 0;

      for (const a of awardedLevels) {
        if (a.coins > 0) totalCoinsGranted += a.coins;
        if (a.diamonds > 0) totalDiamondsGranted += a.diamonds;
        if (a.entry_effect) rewardItems.push(`${a.entry_effect} (${a.validity_days}d effect)`);
        if (a.thumbnail) rewardItems.push(`${a.thumbnail} (${a.validity_days}d frame)`);
        if (a.package) rewardItems.push(`${a.package} (${a.validity_days}d VIP)`);
      }
      if (totalCoinsGranted > 0) rewardItems.unshift(`+${totalCoinsGranted} Coins 🪙`);
      if (totalDiamondsGranted > 0) rewardItems.unshift(`+${totalDiamondsGranted} Diamonds 💎`);

      const rewardsSummary = rewardItems.join(', ');

      // Dispatch FCM Push Notification to the user who leveled up
      sendLevelUpPushNotification({
        userId,
        oldLevel: currentLevel,
        newLevel,
        levelName: targetLevelConfig.level_name,
        rewardsSummary,
        badgeIcon: targetLevelConfig.badge_icon || null,
      }).catch((err) => {
        console.warn('[LevelUp Push Error]:', err.message);
      });

      return levelUpPayload;
    }

    return null;
  } catch (err) {
    console.error('[levelService] recordCoinsSpentAndCheckLevelUp error:', err);
    return null;
  }
}

/**
 * Returns current user level progression, progress bar %, and upcoming rewards
 */
export async function getUserLevelProgression(userId) {
  const userRows = await query(
    'SELECT id, level, total_coins_spent, coins, diamonds, full_name, avatar_url FROM users WHERE id = ?',
    [userId]
  );
  if (!userRows || userRows.length === 0) return null;
  const user = userRows[0];
  const currentLevel = parseInt(user.level || 1, 10);
  const totalSpent = BigInt(user.total_coins_spent || 0);

  const levelConfigs = await cache.getOrSet('levels:all_active', 300, async () => {
    return await query(
      `SELECT lc.*, 
              ee.name as effect_name, ee.preview_image_url as effect_preview,
              st.name as thumbnail_name, st.image_url as thumbnail_preview,
              pp.name as package_name, pp.image_url as package_preview
       FROM level_configs lc
       LEFT JOIN entry_effects ee ON lc.reward_entry_effect_id = ee.id
       LEFT JOIN special_thumbnails st ON lc.reward_thumbnail_id = st.id
       LEFT JOIN privilege_packages pp ON lc.reward_package_id = pp.id
       WHERE lc.is_active = TRUE
       ORDER BY lc.level_number ASC`
    );
  });

  const currentConfig = levelConfigs.find((l) => l.level_number === currentLevel) || levelConfigs[0];
  const nextConfig = levelConfigs.find((l) => l.level_number === currentLevel + 1) || null;

  let progressPercent = 100;
  let coinsNeeded = 0;

  if (nextConfig) {
    const minCurrent = BigInt(currentConfig.min_coins_spent || 0);
    const minNext = BigInt(nextConfig.min_coins_spent);
    const range = minNext - minCurrent;
    const progressIntoLevel = totalSpent > minCurrent ? totalSpent - minCurrent : 0n;

    if (range > 0n) {
      progressPercent = Number((progressIntoLevel * 100n) / range);
      if (progressPercent > 100) progressPercent = 100;
      if (progressPercent < 0) progressPercent = 0;
    }
    coinsNeeded = totalSpent < minNext ? Number(minNext - totalSpent) : 0;
  }

  // Claimed rewards history
  const claimedRewards = await query(
    `SELECT ulr.*, lc.level_name, lc.badge_color,
            ee.name as effect_name, st.name as thumbnail_name, pp.name as package_name
     FROM user_level_rewards ulr
     LEFT JOIN level_configs lc ON ulr.level_reached = lc.level_number
     LEFT JOIN entry_effects ee ON ulr.entry_effect_id = ee.id
     LEFT JOIN special_thumbnails st ON ulr.thumbnail_id = st.id
     LEFT JOIN privilege_packages pp ON ulr.package_id = pp.id
     WHERE ulr.user_id = ?
     ORDER BY ulr.level_reached DESC`,
    [userId]
  );

  return {
    user: {
      id: user.id,
      name: user.full_name,
      avatar_url: user.avatar_url,
      current_level: currentLevel,
      total_coins_spent: user.total_coins_spent,
    },
    current_tier: currentConfig,
    next_tier: nextConfig,
    progress_percent: progressPercent,
    coins_needed_for_next_level: coinsNeeded,
    claimed_rewards: claimedRewards,
    all_levels: levelConfigs,
  };
}
