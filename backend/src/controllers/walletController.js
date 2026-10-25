import { query, getPool } from '../config/db.js';
import { cache } from '../config/redis.js';

export async function getBalances(req, res) {
  try {
    const data = await cache.getOrSet(`user:balance:${req.user.id}`, 30, async () => {
      const users = await query('SELECT coins, diamonds FROM users WHERE id = ?', [req.user.id]);
      return {
        coins: users[0]?.coins || 0,
        diamonds: users[0]?.diamonds || 0,
      };
    });

    return res.json({
      success: true,
      coins: data.coins,
      diamonds: data.diamonds,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch balances.' });
  }
}

export async function getPackages(req, res) {
  try {
    const packages = await cache.getOrSet('wallet:packages', 300, async () => {
      const rows = await query('SELECT * FROM coin_packages WHERE is_active = TRUE ORDER BY price_usd ASC');
      return rows || [];
    });

    return res.json({
      success: true,
      packages,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch packages.' });
  }
}

export async function purchaseCoins(req, res) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;
    const { packageId } = req.body;

    const [packages] = await connection.execute('SELECT * FROM coin_packages WHERE id = ? AND is_active = TRUE', [packageId]);
    if (packages.length === 0) {
      return res.status(404).json({ success: false, message: 'Coin package not found.' });
    }

    const pkg = packages[0];
    const totalCoinsToAdd = pkg.coins + (pkg.bonus_coins || 0);

    await connection.beginTransaction();

    await connection.execute('UPDATE users SET coins = coins + ? WHERE id = ?', [totalCoinsToAdd, userId]);

    await connection.execute(
      `INSERT INTO transactions (user_id, type, amount, description, status)
       VALUES (?, 'coin_purchase', ?, ?, 'completed')`,
      [userId, totalCoinsToAdd, `Purchased ${pkg.name} (${pkg.coins} + ${pkg.bonus_coins} bonus coins) for $${pkg.price_usd}`]
    );

    await connection.commit();

    // Database writes succeeded -> Invalidate Redis cache immediately
    await cache.del(`user:${userId}`);
    await cache.del(`user:balance:${userId}`);
    await cache.delByPattern(`user:transactions:${userId}*`);
    await cache.delByPattern('admin:users*');
    await cache.delByPattern('admin:dashboard*');

    const [updatedUser] = await connection.execute('SELECT coins FROM users WHERE id = ?', [userId]);

    return res.json({
      success: true,
      message: `Successfully topped up ${totalCoinsToAdd} coins!`,
      coins: updatedUser[0].coins,
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: 'Purchase failed.', error: err.message });
  } finally {
    connection.release();
  }
}

export async function requestWithdrawal(req, res) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;
    const requestedAmount = req.body.amount || req.body.coinAmount || req.body.coin_amount || req.body.diamondAmount || req.body.diamond_amount;
    const { paymentMethod, accountDetails } = req.body;

    const amount = parseInt(requestedAmount, 10);
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid withdrawal amount is required.' });
    }

    if (!paymentMethod || !accountDetails) {
      return res.status(400).json({ success: false, message: 'Payment method and account details are required.' });
    }

    // Fetch system settings & conversion ratios for all roles
    const [settingsRows] = await connection.execute(
      `SELECT key_name, key_value FROM system_settings WHERE key_name IN (
        'is_convert_to_diamond', 'diamond_to_usd_rate', 'min_withdrawal_diamonds', 'withdrawal_presets', 'allow_manual_withdrawal_input',
        'video_host_withdrawal_enabled', 'video_host_diamond_base', 'video_host_taka_amount', 'video_host_min_withdrawal',
        'audio_host_withdrawal_enabled', 'audio_host_diamond_base', 'audio_host_taka_amount', 'audio_host_min_withdrawal',
        'user_withdrawal_enabled', 'user_diamond_base', 'user_taka_amount', 'user_min_withdrawal',
        'agency_withdrawal_enabled', 'agency_diamond_base', 'agency_taka_amount', 'agency_min_withdrawal',
        'reseller_withdrawal_enabled', 'reseller_diamond_base', 'reseller_taka_amount', 'reseller_min_withdrawal',
        'moderator_withdrawal_enabled', 'moderator_diamond_base', 'moderator_taka_amount', 'moderator_min_withdrawal'
      )`
    );
    const settingsMap = {};
    settingsRows.forEach((r) => { settingsMap[r.key_name] = r.key_value; });

    const isDiamondMode = settingsMap['is_convert_to_diamond'] === 'true' || settingsMap['is_convert_to_diamond'] === '1';
    const currencyName = isDiamondMode ? 'diamonds' : 'coins';

    // Fetch user info including role and host_type
    const [users] = await connection.execute('SELECT id, full_name, role, host_type, coins, diamonds, is_banned FROM users WHERE id = ?', [userId]);
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }
    const currentUser = users[0];

    // Determine user's role and cashout profile
    const userRole = currentUser.role || 'user';
    let roleKey = 'user';
    let roleSettingPrefix = 'user';
    let roleLabel = 'Normal User';

    if (userRole === 'host') {
      if (currentUser.host_type === 'audio') {
        roleKey = 'audio';
        roleSettingPrefix = 'audio_host';
        roleLabel = 'Audio Host';
      } else {
        roleKey = 'video';
        roleSettingPrefix = 'video_host';
        roleLabel = 'Video Host';
      }
    } else if (userRole === 'agency') {
      roleKey = 'agency';
      roleSettingPrefix = 'agency';
      roleLabel = 'Agency Partner';
    } else if (userRole === 'reseller') {
      roleKey = 'reseller';
      roleSettingPrefix = 'reseller';
      roleLabel = 'Diamond / Coin Reseller';
    } else if (userRole === 'moderator') {
      roleKey = 'moderator';
      roleSettingPrefix = 'moderator';
      roleLabel = 'Platform Moderator';
    } else {
      roleKey = 'user';
      roleSettingPrefix = 'user';
      roleLabel = 'Normal User';
    }

    // 1. Check if cashout is enabled for this role
    const isRoleWithdrawalEnabled = settingsMap[`${roleSettingPrefix}_withdrawal_enabled`] !== 'false';
    if (!isRoleWithdrawalEnabled) {
      return res.status(403).json({
        success: false,
        message: `Cashout is currently disabled for ${roleLabel} accounts. Please contact support.`,
        role: userRole,
        role_label: roleLabel,
      });
    }

    // 2. Minimum withdrawal check for this specific role
    const globalMin = parseInt(settingsMap['min_withdrawal_diamonds'] || '1000', 10);
    const roleMin = parseInt(settingsMap[`${roleSettingPrefix}_min_withdrawal`] || String(globalMin), 10);
    const minWithdrawal = Math.max(1, roleMin);

    if (amount < minWithdrawal) {
      return res.status(400).json({
        success: false,
        message: `Minimum cashout for ${roleLabel} is ${minWithdrawal.toLocaleString()} ${currencyName}.`,
        minWithdrawal,
        role_label: roleLabel,
      });
    }

    // 3. Preset & manual input restriction check
    const allowManualInput = settingsMap['allow_manual_withdrawal_input'] !== 'false';
    let presets = [];
    try {
      const rawPresets = settingsMap['withdrawal_presets'];
      if (rawPresets) {
        presets = typeof rawPresets === 'string' && rawPresets.startsWith('[')
          ? JSON.parse(rawPresets)
          : rawPresets.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      }
    } catch (e) {
      presets = [1000, 2000, 5000, 10000, 25000, 50000];
    }

    if (!allowManualInput && presets.length > 0) {
      if (!presets.includes(amount)) {
        return res.status(400).json({
          success: false,
          message: `Manual withdrawal amount is disabled. You must choose one of the preset options: ${presets.join(', ')} ${currencyName}.`,
          presets,
        });
      }
    }

    // 4. Check user balance
    const userBalance = isDiamondMode ? (currentUser.diamonds || 0) : (currentUser.coins || 0);
    if (userBalance < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient ${currencyName}. You have ${userBalance.toLocaleString()} ${currencyName}.`,
        balance: userBalance,
      });
    }

    // 5. Calculate payout based on this role's specific exchange rate
    const usdRate = settingsMap['diamond_to_usd_rate'] ? parseFloat(settingsMap['diamond_to_usd_rate']) : 0.005;
    const usdAmount = (amount * usdRate).toFixed(2);

    let defaultBase = 100000;
    let defaultTaka = 4000;
    if (roleKey === 'video') { defaultBase = 100000; defaultTaka = 5000; }
    else if (roleKey === 'audio') { defaultBase = 100000; defaultTaka = 3500; }
    else if (roleKey === 'agency') { defaultBase = 100000; defaultTaka = 6000; }
    else if (roleKey === 'reseller') { defaultBase = 100000; defaultTaka = 5500; }
    else if (roleKey === 'moderator') { defaultBase = 100000; defaultTaka = 4500; }

    let baseUnits = parseFloat(settingsMap[`${roleSettingPrefix}_diamond_base`] || String(defaultBase));
    let takaAmount = parseFloat(settingsMap[`${roleSettingPrefix}_taka_amount`] || String(defaultTaka));
    if (baseUnits <= 0) baseUnits = 100000;

    const takaRatePerUnit = takaAmount / baseUnits;
    const payoutAmount = (amount * takaRatePerUnit).toFixed(2);

    await connection.beginTransaction();

    if (isDiamondMode) {
      // Deduct diamonds pending payout with atomic balance guard (anti-race condition)
      const [deductRes] = await connection.execute(
        'UPDATE users SET diamonds = diamonds - ? WHERE id = ? AND diamonds >= ?',
        [amount, userId, amount]
      );
      if (!deductRes || deductRes.affectedRows === 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Insufficient diamonds balance or concurrent transaction detected.' });
      }
      await connection.execute(
        `INSERT INTO withdrawals (host_id, diamond_amount, coin_amount, usd_amount, payout_amount, payout_currency, host_type, user_role, payment_method, account_details, status)
         VALUES (?, ?, 0, ?, ?, 'BDT', ?, ?, ?, ?, 'pending')`,
        [userId, amount, usdAmount, payoutAmount, roleKey, userRole, paymentMethod, accountDetails]
      );
    } else {
      // Deduct coins pending payout with atomic balance guard (anti-race condition)
      const [deductRes] = await connection.execute(
        'UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?',
        [amount, userId, amount]
      );
      if (!deductRes || deductRes.affectedRows === 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Insufficient coins balance or concurrent transaction detected.' });
      }
      await connection.execute(
        `INSERT INTO withdrawals (host_id, diamond_amount, coin_amount, usd_amount, payout_amount, payout_currency, host_type, user_role, payment_method, account_details, status)
         VALUES (?, 0, ?, ?, ?, 'BDT', ?, ?, ?, ?, 'pending')`,
        [userId, amount, usdAmount, payoutAmount, roleKey, userRole, paymentMethod, accountDetails]
      );
    }

    await connection.execute(
      `INSERT INTO transactions (user_id, type, amount, description, status)
       VALUES (?, 'withdrawal', ?, ?, 'pending')`,
      [userId, amount, `Requested cashout of ${amount.toLocaleString()} ${currencyName} (৳${payoutAmount} BDT / $${usdAmount}) via ${paymentMethod} [${roleLabel}]`]
    );

    await connection.commit();

    // Database writes succeeded -> Invalidate Redis cache immediately
    await cache.del(`user:${userId}`);
    await cache.del(`user:balance:${userId}`);
    await cache.delByPattern(`user:transactions:${userId}*`);
    await cache.delByPattern('admin:withdrawals*');
    await cache.delByPattern('admin:dashboard*');
    await cache.delByPattern(`withdrawal:list:${userId}*`);
    await cache.del(`withdrawal:pending:${userId}`);

    const updatedBalance = userBalance - amount;

    return res.json({
      success: true,
      message: `Cashout application of ${amount.toLocaleString()} ${currencyName} (৳${payoutAmount} BDT) submitted successfully!`,
      withdrawal: {
        amount,
        currency: currencyName,
        payoutAmount,
        payoutCurrency: 'BDT',
        usdAmount,
        paymentMethod,
        role: userRole,
        roleLabel,
        hostType: roleKey,
        status: 'pending',
      },
      usdAmount,
      payoutAmount,
      currency: 'BDT',
      currencyName,
      isDiamondMode,
      remainingBalance: updatedBalance,
      remainingCoins: isDiamondMode ? (currentUser.coins || 0) : updatedBalance,
      remainingDiamonds: isDiamondMode ? updatedBalance : (currentUser.diamonds || 0),
    });
  } catch (err) {
    await connection.rollback();
    console.error('requestWithdrawal error:', err);
    return res.status(500).json({ success: false, message: 'Withdrawal request failed.', error: err.message });
  } finally {
    connection.release();
  }
}

export async function getTransactions(req, res) {
  try {
    const transactions = await cache.getOrSet(`user:transactions:${req.user.id}`, 60, async () => {
      const rows = await query(
        'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
        [req.user.id]
      );
      return rows || [];
    });

    return res.json({
      success: true,
      transactions,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch transactions.' });
  }
}

function parseRoleRate(map, prefix, defaultName, defaultBase, defaultTaka, defaultMin, defaultEnabled = true) {
  const isEnabled = map[`${prefix}_withdrawal_enabled`] !== undefined 
    ? (map[`${prefix}_withdrawal_enabled`] === 'true' || map[`${prefix}_withdrawal_enabled`] === '1') 
    : defaultEnabled;
  const base = parseFloat(map[`${prefix}_diamond_base`] || String(defaultBase));
  const taka = parseFloat(map[`${prefix}_taka_amount`] || String(defaultTaka));
  const minAmt = parseInt(map[`${prefix}_min_withdrawal`] || String(defaultMin), 10);
  const ratePerUnit = base > 0 ? parseFloat((taka / base).toFixed(6)) : parseFloat((defaultTaka / defaultBase).toFixed(6));

  return {
    role_key: prefix,
    label: defaultName,
    is_enabled: isEnabled,
    diamond_base: base,
    coin_base: base,
    taka_amount: taka,
    rate_per_unit: ratePerUnit,
    rate_per_diamond: ratePerUnit,
    rate_per_coin: ratePerUnit,
    min_amount: minAmt,
    currency: 'BDT',
  };
}

export async function fetchFreshWithdrawalConfig() {
  const rows = await query(
    `SELECT key_name, key_value FROM system_settings WHERE key_name IN (
      'is_convert_to_diamond', 'diamond_to_usd_rate', 'min_withdrawal_diamonds', 'withdrawal_presets', 'allow_manual_withdrawal_input',
      'video_host_withdrawal_enabled', 'video_host_diamond_base', 'video_host_taka_amount', 'video_host_min_withdrawal',
      'audio_host_withdrawal_enabled', 'audio_host_diamond_base', 'audio_host_taka_amount', 'audio_host_min_withdrawal',
      'user_withdrawal_enabled', 'user_diamond_base', 'user_taka_amount', 'user_min_withdrawal',
      'agency_withdrawal_enabled', 'agency_diamond_base', 'agency_taka_amount', 'agency_min_withdrawal',
      'reseller_withdrawal_enabled', 'reseller_diamond_base', 'reseller_taka_amount', 'reseller_min_withdrawal',
      'moderator_withdrawal_enabled', 'moderator_diamond_base', 'moderator_taka_amount', 'moderator_min_withdrawal'
    )`
  );
  const map = {};
  rows.forEach((r) => { map[r.key_name] = r.key_value; });

  const isDiamondMode = map['is_convert_to_diamond'] === 'true' || map['is_convert_to_diamond'] === '1';
  const minWithdrawal = parseInt(map['min_withdrawal_diamonds'] || '1000', 10);
  const allowManualInput = map['allow_manual_withdrawal_input'] !== 'false';
  let presets = [1000, 2000, 5000, 10000, 25000, 50000];
  try {
    const rawP = map['withdrawal_presets'];
    if (rawP) {
      presets = typeof rawP === 'string' && rawP.startsWith('[')
        ? JSON.parse(rawP)
        : rawP.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
    }
  } catch (e) {}

  const usdRate = parseFloat(map['diamond_to_usd_rate'] || '0.005');

  const rates = {
    video: parseRoleRate(map, 'video_host', 'Video Host', 100000, 5000, minWithdrawal, true),
    audio: parseRoleRate(map, 'audio_host', 'Audio Host', 100000, 3500, minWithdrawal, true),
    user: parseRoleRate(map, 'user', 'Normal User', 100000, 4000, minWithdrawal, true),
    agency: parseRoleRate(map, 'agency', 'Agency Partner', 100000, 6000, 5000, true),
    reseller: parseRoleRate(map, 'reseller', 'Coin / Diamond Reseller', 100000, 5500, 5000, true),
    moderator: parseRoleRate(map, 'moderator', 'Platform Moderator', 100000, 4500, minWithdrawal, true),
  };

  return {
    is_convert_to_diamond: isDiamondMode,
    withdrawal_currency: isDiamondMode ? 'diamonds' : 'coins',
    min_withdrawal_amount: minWithdrawal,
    min_withdrawal_diamonds: minWithdrawal,
    min_withdrawal_coins: minWithdrawal,
    withdrawal_presets: presets,
    allow_manual_withdrawal_input: allowManualInput,
    diamond_to_usd_rate: usdRate,
    coin_to_usd_rate: usdRate,
    rates,
  };
}

export async function invalidateWalletWithdrawalCache(io = null) {
  try {
    // 1. Delete ONLY the specific affected withdrawal and economy configuration keys
    // (Never perform wholesale wildcard sweeps like wallet:* or config:* to prevent database spikes)
    await cache.del(
      'wallet:withdrawal:config',
      'host_ratios:all',
      'config:mobile:app',
      'settings:all',
      'setting:is_convert_to_diamond',
      'setting:coin_to_diamond_ratio',
      'setting:diamond_to_usd_rate',
      'setting:coin_to_usd_rate',
      'setting:min_withdrawal_diamonds',
      'setting:withdrawal_presets',
      'setting:allow_manual_withdrawal_input',
      'admin:withdrawals:config'
    );
    // Delete only admin-specific withdrawal report patterns
    await cache.delByPattern('admin:withdrawals*');

    // 2. Pre-warm cache immediately with fresh data from database
    const freshConfig = await fetchFreshWithdrawalConfig();
    await cache.set('wallet:withdrawal:config', freshConfig, 30);
    if (freshConfig.rates) {
      await cache.set('host_ratios:all', freshConfig.rates, 30);
    }

    // 3. Real-time broadcast if socket.io is available
    if (io) {
      io.emit('wallet:withdrawal_config_updated', {
        success: true,
        config: freshConfig,
        updated_at: new Date().toISOString(),
      });
      io.emit('config:economy_updated', {
        is_convert_to_diamond: freshConfig.is_convert_to_diamond,
        withdrawal_currency: freshConfig.withdrawal_currency,
        updated_at: new Date().toISOString(),
      });
    }

    return freshConfig;
  } catch (err) {
    console.warn('invalidateWalletWithdrawalCache error:', err.message);
  }
}

export async function getWithdrawalConfig(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const config = await cache.getOrSet('wallet:withdrawal:config', 30, async () => {
      return await fetchFreshWithdrawalConfig();
    });

    // If caller is authenticated, compute their personalized withdrawal rule & live limits
    let myRule = null;
    if (req.user && req.user.id) {
      const userRole = req.user.role || 'user';
      let roleKey = 'user';
      if (userRole === 'host') {
        roleKey = req.user.host_type === 'audio' ? 'audio' : 'video';
      } else if (userRole === 'agency') {
        roleKey = 'agency';
      } else if (userRole === 'reseller') {
        roleKey = 'reseller';
      } else if (userRole === 'moderator') {
        roleKey = 'moderator';
      } else {
        roleKey = 'user';
      }

      const roleConfig = config.rates[roleKey] || config.rates.user;
      const currentBalance = config.is_convert_to_diamond ? (req.user.diamonds || 0) : (req.user.coins || 0);

      myRule = {
        user_id: req.user.id,
        user_name: req.user.full_name,
        user_role: userRole,
        role_key: roleKey,
        role_label: roleConfig.label,
        is_withdrawal_allowed: roleConfig.is_enabled,
        rate_per_unit: roleConfig.rate_per_unit,
        diamond_base: roleConfig.diamond_base,
        taka_amount: roleConfig.taka_amount,
        min_withdrawal_amount: roleConfig.min_amount,
        currency: 'BDT',
        current_balance: currentBalance,
        estimated_payout_bdt: (currentBalance * roleConfig.rate_per_unit).toFixed(2),
        explanation: `${roleConfig.diamond_base.toLocaleString()} ${config.withdrawal_currency} = ৳${roleConfig.taka_amount.toLocaleString()} BDT (৳${roleConfig.rate_per_unit}/unit)`,
      };
    }

    return res.json({
      success: true,
      config: {
        ...config,
        my_rule: myRule,
      },
    });
  } catch (err) {
    console.error('getWithdrawalConfig error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch withdrawal configuration.' });
  }
}

export async function getRechargeConfig(req, res) {
  try {
    const data = await cache.getOrSet('wallet:recharge:config', 120, async () => {
      const [packages, settings] = await Promise.all([
        query('SELECT * FROM coin_packages WHERE is_active = TRUE ORDER BY price_usd ASC'),
        query("SELECT key_value FROM system_settings WHERE key_name = 'recharge_presets'"),
      ]);

      let presets = [500, 1000, 2500, 5000, 10000, 50000, 100000];
      try {
        const raw = settings[0]?.key_value;
        if (raw) {
          presets = typeof raw === 'string' && raw.startsWith('[')
            ? JSON.parse(raw)
            : raw.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
        }
      } catch (e) {}

      return {
        packages: packages || [],
        quick_presets: presets,
      };
    });

    return res.json({ success: true, ...data });
  } catch (err) {
    console.error('getRechargeConfig error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch recharge configuration.' });
  }
}
