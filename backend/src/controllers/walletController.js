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

    // Fetch system settings & conversion ratios
    const [settingsRows] = await connection.execute(
      "SELECT key_name, key_value FROM system_settings WHERE key_name IN ('is_convert_to_diamond', 'diamond_to_usd_rate', 'min_withdrawal_diamonds', 'withdrawal_presets', 'allow_manual_withdrawal_input', 'video_host_diamond_base', 'video_host_taka_amount', 'audio_host_diamond_base', 'audio_host_taka_amount')"
    );
    const settingsMap = {};
    settingsRows.forEach((r) => { settingsMap[r.key_name] = r.key_value; });

    const isDiamondMode = settingsMap['is_convert_to_diamond'] === 'true' || settingsMap['is_convert_to_diamond'] === '1';
    const currencyName = isDiamondMode ? 'diamonds' : 'coins';

    // 1. Minimum withdrawal check (admin configurable)
    const minWithdrawal = parseInt(settingsMap['min_withdrawal_diamonds'] || '1000', 10);
    if (amount < minWithdrawal) {
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal is ${minWithdrawal.toLocaleString()} ${currencyName}.`,
        minWithdrawal,
      });
    }

    // 2. Preset & manual input restriction check
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

    // Check user balance and host_type
    const [users] = await connection.execute('SELECT coins, diamonds, host_type FROM users WHERE id = ?', [userId]);
    const userBalance = isDiamondMode ? (users[0]?.diamonds || 0) : (users[0]?.coins || 0);

    if (users.length === 0 || userBalance < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient ${currencyName}. You have ${userBalance} ${currencyName}.`,
      });
    }

    const hostType = users[0].host_type === 'audio' ? 'audio' : 'video';

    const rate = settingsMap['diamond_to_usd_rate'] ? parseFloat(settingsMap['diamond_to_usd_rate']) : 0.005;
    const usdAmount = (amount * rate).toFixed(2);

    let baseUnits = hostType === 'audio' 
      ? parseFloat(settingsMap['audio_host_diamond_base'] || '100000') 
      : parseFloat(settingsMap['video_host_diamond_base'] || '100000');
    let takaAmount = hostType === 'audio' 
      ? parseFloat(settingsMap['audio_host_taka_amount'] || '3500') 
      : parseFloat(settingsMap['video_host_taka_amount'] || '5000');
    
    if (baseUnits <= 0) baseUnits = 100000;
    const takaRatePerUnit = takaAmount / baseUnits;
    const payoutAmount = (amount * takaRatePerUnit).toFixed(2);

    await connection.beginTransaction();

    if (isDiamondMode) {
      // Deduct diamonds pending payout
      await connection.execute('UPDATE users SET diamonds = diamonds - ? WHERE id = ?', [amount, userId]);
      await connection.execute(
        `INSERT INTO withdrawals (host_id, diamond_amount, coin_amount, usd_amount, payout_amount, payout_currency, host_type, payment_method, account_details, status)
         VALUES (?, ?, 0, ?, ?, 'BDT', ?, ?, ?, 'pending')`,
        [userId, amount, usdAmount, payoutAmount, hostType, paymentMethod, accountDetails]
      );
    } else {
      // Deduct coins pending payout
      await connection.execute('UPDATE users SET coins = coins - ? WHERE id = ?', [amount, userId]);
      await connection.execute(
        `INSERT INTO withdrawals (host_id, diamond_amount, coin_amount, usd_amount, payout_amount, payout_currency, host_type, payment_method, account_details, status)
         VALUES (?, 0, ?, ?, ?, 'BDT', ?, ?, ?, 'pending')`,
        [userId, amount, usdAmount, payoutAmount, hostType, paymentMethod, accountDetails]
      );
    }

    await connection.execute(
      `INSERT INTO transactions (user_id, type, amount, description, status)
       VALUES (?, 'withdrawal', ?, ?, 'pending')`,
      [userId, amount, `Requested cashout of ${amount} ${currencyName} (৳${payoutAmount} BDT / $${usdAmount}) via ${paymentMethod}`]
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
      message: 'Withdrawal request submitted for review.',
      usdAmount,
      payoutAmount,
      currency: 'BDT',
      currencyName,
      isDiamondMode,
      remainingBalance: updatedBalance,
      remainingCoins: isDiamondMode ? (users[0]?.coins || 0) : updatedBalance,
      remainingDiamonds: isDiamondMode ? updatedBalance : (users[0]?.diamonds || 0),
    });
  } catch (err) {
    await connection.rollback();
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

export async function getWithdrawalConfig(req, res) {
  try {
    const config = await cache.getOrSet('wallet:withdrawal:config', 60, async () => {
      const rows = await query(
        "SELECT key_name, key_value FROM system_settings WHERE key_name IN ('is_convert_to_diamond', 'diamond_to_usd_rate', 'min_withdrawal_diamonds', 'withdrawal_presets', 'allow_manual_withdrawal_input', 'video_host_diamond_base', 'video_host_taka_amount', 'audio_host_diamond_base', 'audio_host_taka_amount')"
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
      const videoBase = parseFloat(map['video_host_diamond_base'] || '100000');
      const videoTaka = parseFloat(map['video_host_taka_amount'] || '5000');
      const audioBase = parseFloat(map['audio_host_diamond_base'] || '100000');
      const audioTaka = parseFloat(map['audio_host_taka_amount'] || '3500');

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
        rates: {
          video: {
            diamond_base: videoBase,
            coin_base: videoBase,
            taka_amount: videoTaka,
            rate_per_diamond: videoBase > 0 ? parseFloat((videoTaka / videoBase).toFixed(6)) : 0.05,
            rate_per_coin: videoBase > 0 ? parseFloat((videoTaka / videoBase).toFixed(6)) : 0.05,
            currency: 'BDT',
          },
          audio: {
            diamond_base: audioBase,
            coin_base: audioBase,
            taka_amount: audioTaka,
            rate_per_diamond: audioBase > 0 ? parseFloat((audioTaka / audioBase).toFixed(6)) : 0.035,
            rate_per_coin: audioBase > 0 ? parseFloat((audioTaka / audioBase).toFixed(6)) : 0.035,
            currency: 'BDT',
          },
        },
      };
    });

    return res.json({ success: true, config });
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
