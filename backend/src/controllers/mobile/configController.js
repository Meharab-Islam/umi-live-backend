import { query } from '../../config/db.js';
import { cache } from '../../config/redis.js';
import { getLiveKitConfig } from '../../config/livekit.js';

/**
 * Mobile App Global Configuration Endpoint
 * GET /api/mobile/config or GET /api/config or GET /api/v1/config
 * 
 * Provides complete application bootstrap parameters in a single round-trip:
 * 1. App identity & maintenance status
 * 2. Socket.IO & WebRTC real-time connection credentials
 * 3. Currency & Dual Economy mode settings (diamond vs direct coin commissions)
 * 4. Media & upload CDN base URLs
 * 5. Feature flags
 */
export async function getAppConfig(req, res) {
  try {
    // 1. Determine host & protocol dynamically (100% portable)
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.get('host') || 'localhost:5050';
    const baseUrl = `${protocol}://${host}`;

    // Read system environment variables
    const projectName = process.env.PROJECT_NAME || 'umi';
    const socketUrl = process.env.SOCKET_URL || baseUrl;
    const socketPingInterval = parseInt(process.env.SOCKET_PING_INTERVAL || '25000', 10);
    const socketPingTimeout = parseInt(process.env.SOCKET_PING_TIMEOUT || '30000', 10);
    const agoraAppId = process.env.AGORA_APP_ID || '';

    // 2. Fetch and Cache Platform Settings using Cache-Aside (TTL: 120s)
    const configData = await cache.getOrSet('config:mobile:app', 120, async () => {
      const rows = await query('SELECT key_name, key_value FROM system_settings');
      const settingsMap = {};
      for (const row of rows) {
        settingsMap[row.key_name] = row.key_value;
      }

      const livekitConfig = await getLiveKitConfig();
      const livekitUrl = livekitConfig.url;
      const livekitApiKey = livekitConfig.apiKey;

      const isDiamondMode = settingsMap['is_convert_to_diamond'] !== 'false';
      const coinToDiamondRatio = parseFloat(settingsMap['coin_to_diamond_ratio'] || '1.0');
      const adminGiftCommission = parseFloat(settingsMap['admin_gift_commission_percent'] || '15.0');
      const agencyGiftCommission = parseFloat(settingsMap['agency_gift_commission_percent'] || '10.0');
      const userTransferCommission = parseFloat(settingsMap['user_transfer_commission_percent'] || '5.0');
      const diamondToUsdRate = parseFloat(settingsMap['diamond_to_usd_rate'] || '0.005');
      const minWithdrawalDiamonds = parseInt(settingsMap['min_withdrawal_diamonds'] || '1000', 10);
      const allowManualWithdrawalInput = settingsMap['allow_manual_withdrawal_input'] !== 'false';

      let withdrawalPresets = [1000, 2000, 5000, 10000, 25000, 50000];
      try {
        const wpRaw = settingsMap['withdrawal_presets'];
        if (wpRaw) {
          withdrawalPresets = typeof wpRaw === 'string' && wpRaw.startsWith('[')
            ? JSON.parse(wpRaw)
            : wpRaw.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
        }
      } catch (e) { }

      let rechargePresets = [500, 1000, 2500, 5000, 10000, 50000, 100000];
      try {
        const rpRaw = settingsMap['recharge_presets'];
        if (rpRaw) {
          rechargePresets = typeof rpRaw === 'string' && rpRaw.startsWith('[')
            ? JSON.parse(rpRaw)
            : rpRaw.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
        }
      } catch (e) { }

      const liveStreamProvider = settingsMap['live_stream_provider'] || livekitConfig.provider || 'livekit';
      const appName = settingsMap['app_name'] || `${projectName.toUpperCase()} LIVE`;
      const maintenanceMode = settingsMap['maintenance_mode'] === 'true';

      const hostCoinShare = Math.max(0, 100 - adminGiftCommission - agencyGiftCommission);

      return {
        app_name: appName,
        app_version: settingsMap['app_version'] || '1.0.0',
        min_supported_version: settingsMap['min_supported_version'] || '1.0.0',
        maintenance_mode: maintenanceMode,
        maintenance_message: settingsMap['maintenance_message'] || 'Platform is under scheduled maintenance. Please check back shortly.',

        // Economy & Currency Configuration
        economy: {
          is_convert_to_diamond: isDiamondMode,
          currency_mode: isDiamondMode ? 'diamond_conversion' : 'direct_coin_commission',
          coin_to_diamond_ratio: coinToDiamondRatio,
          admin_gift_commission_percent: adminGiftCommission,
          agency_gift_commission_percent: agencyGiftCommission,
          host_coin_share_percent: parseFloat(hostCoinShare.toFixed(1)),
          user_transfer_commission_percent: userTransferCommission,
          diamond_to_usd_rate: diamondToUsdRate,
          min_withdrawal_diamonds: minWithdrawalDiamonds,
          withdrawal_presets: withdrawalPresets,
          allow_manual_withdrawal_input: allowManualWithdrawalInput,
          recharge_presets: rechargePresets,
          primary_currency: 'coin',
          secondary_currency: isDiamondMode ? 'diamond' : null,
          currency_symbols: {
            coin: '🪙',
            diamond: isDiamondMode ? '💎' : null,
            fiat: '৳',
            fiat_code: 'BDT',
          },
        },

        // WebRTC & Streaming Provider
        streaming: {
          provider: liveStreamProvider, // 'livekit' | 'agora' | 'rtmp'
          livekit_url: livekitUrl,
          server_url: livekitUrl,
          livekit_host: livekitUrl,
          api_key: livekitApiKey,
          is_configured: Boolean(livekitUrl && livekitApiKey),
          agora_app_id: agoraAppId || null,
        },

        // Feature Toggles
        features: {
          enable_guest_login: true,
          enable_coin_transfer: false,
          enable_p2p_transfer: false,
          enable_agency_recruitment: true,
          enable_vip_store: true,
          enable_diamond_cashout: isDiamondMode,
        },

        // Screen Guard & Anti-Screenshot / Anti-Record Privacy Controls
        screen_guard: {
          app_screen_guard_enabled: settingsMap['app_screen_guard_enabled'] !== 'false',
          live_screen_guard_enabled: settingsMap['live_screen_guard_enabled'] !== 'false',
          live_screen_record_enabled: settingsMap['live_screen_record_enabled'] === 'true',
          live_screen_share_enabled: settingsMap['live_screen_share_enabled'] !== 'false',
          live_screen_share_roles: settingsMap['live_screen_share_roles'] || 'host_only',
          permissions: {
            allow_host: settingsMap['screen_guard_allow_host'] !== 'false',
            allow_moderator: settingsMap['screen_guard_allow_moderator'] !== 'false',
            allow_agency: settingsMap['screen_guard_allow_agency'] !== 'false',
            allow_general_users: settingsMap['screen_guard_allow_general_users'] !== 'false',
          },
          watermark_enabled: settingsMap['screen_guard_watermark_enabled'] !== 'false',
        },
      };
    });

    // 3. Return Combined Bootstrap Configuration
    return res.json({
      success: true,
      project_name: projectName,
      server_time: new Date().toISOString(),

      // Dynamic URLs
      urls: {
        base_url: baseUrl,
        api_base_url: `${baseUrl}/api`,
        uploads_base_url: `${baseUrl}/uploads`,
        avatar_upload_endpoint: `${baseUrl}/api/mobile/auth/avatar`,
      },

      // Socket.IO Connection Credentials
      socket: {
        url: socketUrl,
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        ping_interval_ms: socketPingInterval,
        ping_timeout_ms: socketPingTimeout,
        reconnection_attempts: 10,
        reconnection_delay_ms: 1000,
        auth_required: false, // handshake allowed public; authenticate via token on connect or join
      },

      // Merged Config payload
      ...configData,
    });
  } catch (err) {
    console.error('Mobile getAppConfig error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve application configuration.',
      error: err.message,
    });
  }
}

/**
 * Dedicated LiveKit Config Endpoint for Mobile App
 * GET /api/mobile/config/livekit or GET /api/mobile/live/livekit-config
 */
export async function getLiveKitConfigEndpoint(req, res) {
  try {
    const livekitConfig = await getLiveKitConfig();
    return res.json({
      success: true,
      provider: livekitConfig.provider || 'livekit',
      livekit_url: livekitConfig.url,
      server_url: livekitConfig.url,
      url: livekitConfig.url,
      api_key: livekitConfig.apiKey,
      is_configured: Boolean(livekitConfig.url && livekitConfig.apiKey),
    });
  } catch (err) {
    console.error('getLiveKitConfigEndpoint error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve LiveKit configuration.', error: err.message });
  }
}

/**
 * Dedicated Screen Guard & Media Security Configuration Endpoint
 * GET /api/mobile/config/screen-guard or GET /api/config/screen-guard
 */
export async function getScreenGuardConfig(req, res) {
  try {
    const config = await cache.getOrSet('config:screen_guard', 120, async () => {
      const rows = await query('SELECT key_name, key_value FROM system_settings WHERE key_name LIKE "screen_guard_%" OR key_name LIKE "app_screen_%" OR key_name LIKE "live_screen_%"');
      const map = {};
      for (const r of rows) {
        map[r.key_name] = r.key_value;
      }
      return {
        app_screen_guard_enabled: map['app_screen_guard_enabled'] !== 'false',
        live_screen_guard_enabled: map['live_screen_guard_enabled'] !== 'false',
        live_screen_record_enabled: map['live_screen_record_enabled'] === 'true',
        live_screen_share_enabled: map['live_screen_share_enabled'] !== 'false',
        live_screen_share_roles: map['live_screen_share_roles'] || 'host_only',
        permissions: {
          allow_host: map['screen_guard_allow_host'] !== 'false',
          allow_moderator: map['screen_guard_allow_moderator'] !== 'false',
          allow_agency: map['screen_guard_allow_agency'] !== 'false',
          allow_general_users: map['screen_guard_allow_general_users'] !== 'false',
        },
        watermark_enabled: map['screen_guard_watermark_enabled'] !== 'false',
      };
    });

    return res.json({
      success: true,
      screen_guard: config,
    });
  } catch (err) {
    console.error('getScreenGuardConfig error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve screen guard configuration.', error: err.message });
  }
}
