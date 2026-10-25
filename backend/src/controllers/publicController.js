import { query } from '../config/db.js';
import { cache } from '../config/redis.js';

/**
 * Public Web & Landing Page Controller
 * Handles Public Privacy Policy, Terms, Branding, and Google Play compliant Account Deletion Requests
 */

export async function getPublicPrivacyPolicy(req, res) {
  try {
    const data = await cache.getOrSet('public:privacy_policy', 300, async () => {
      const rows = await query(`
        SELECT key_name, key_value 
        FROM system_settings 
        WHERE key_name IN ('privacy_policy_title', 'privacy_policy_content', 'privacy_policy_updated_at', 'contact_support_email', 'platform_name', 'app_logo_url')
      `);

      const map = {};
      (rows || []).forEach((r) => {
        map[r.key_name] = r.key_value;
      });

      return {
        title: map['privacy_policy_title'] || 'UMI LIVE - Privacy Policy',
        content: map['privacy_policy_content'] || 'Privacy policy content is currently being updated.',
        updated_at: map['privacy_policy_updated_at'] || '2026-10-26',
        support_email: map['contact_support_email'] || 'support@umilive.com',
        platform_name: map['platform_name'] || 'Umi Live',
        logo_url: map['app_logo_url'] || '',
      };
    });

    return res.json({
      success: true,
      ...data,
    });
  } catch (err) {
    console.error('getPublicPrivacyPolicy error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve privacy policy.' });
  }
}

export async function getPublicTerms(req, res) {
  try {
    const data = await cache.getOrSet('public:terms', 300, async () => {
      const rows = await query(`
        SELECT key_name, key_value 
        FROM system_settings 
        WHERE key_name IN ('terms_of_service_title', 'terms_of_service_content', 'contact_support_email', 'platform_name')
      `);

      const map = {};
      (rows || []).forEach((r) => {
        map[r.key_name] = r.key_value;
      });

      return {
        title: map['terms_of_service_title'] || 'UMI LIVE - Terms of Service',
        content: map['terms_of_service_content'] || 'Terms of service content is currently being updated.',
        support_email: map['contact_support_email'] || 'support@umilive.com',
        platform_name: map['platform_name'] || 'Umi Live',
      };
    });

    return res.json({
      success: true,
      ...data,
    });
  } catch (err) {
    console.error('getPublicTerms error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve terms of service.' });
  }
}

export async function getPublicBranding(req, res) {
  try {
    const data = await cache.getOrSet('public:branding', 300, async () => {
      const rows = await query(`
        SELECT key_name, key_value 
        FROM system_settings 
        WHERE key_name IN ('platform_name', 'platform_logo_url', 'app_name', 'app_logo_url', 'admin_title', 'contact_support_email')
      `);

      const map = {};
      (rows || []).forEach((r) => {
        map[r.key_name] = r.key_value;
      });

      return {
        brandName: map['platform_name'] || map['app_name'] || 'UMI LIVE',
        logoUrl: map['platform_logo_url'] || map['app_logo_url'] || '',
        adminTitle: map['admin_title'] || 'Live Streaming Entertainment',
        supportEmail: map['contact_support_email'] || 'support@umilive.com',
      };
    });

    return res.json({
      success: true,
      ...data,
    });
  } catch (err) {
    console.error('getPublicBranding error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve branding.' });
  }
}

export async function submitAccountDeletionRequest(req, res) {
  try {
    const { identifier, name, email, phone, reason, details } = req.body;

    const cleanIdentifier = String(identifier || '').trim();
    if (!cleanIdentifier) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your User ID, registered Email, or Phone number.',
      });
    }

    // Try finding matching user ID in MySQL
    let matchedUserId = null;
    let matchedEmail = email ? String(email).trim() : null;

    const isNumericId = !isNaN(cleanIdentifier) && cleanIdentifier !== '';
    if (isNumericId) {
      const users = await query('SELECT id, full_name, email FROM users WHERE id = ? LIMIT 1', [parseInt(cleanIdentifier, 10)]);
      if (users && users.length > 0) {
        matchedUserId = users[0].id;
        matchedEmail = matchedEmail || users[0].email;
      }
    } else {
      const users = await query('SELECT id, full_name, email FROM users WHERE email = ? OR phone = ? LIMIT 1', [cleanIdentifier, cleanIdentifier]);
      if (users && users.length > 0) {
        matchedUserId = users[0].id;
        matchedEmail = matchedEmail || users[0].email;
      }
    }

    const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').slice(0, 45);
    const userAgent = String(req.headers['user-agent'] || '').slice(0, 255);

    // 1. Database-First Write (SSOT)
    const result = await query(
      `INSERT INTO account_deletion_requests 
        (user_id, identifier, name, email, phone, reason, details, ip_address, user_agent, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        matchedUserId,
        cleanIdentifier,
        name ? String(name).trim() : null,
        matchedEmail,
        phone ? String(phone).trim() : null,
        reason ? String(reason).trim() : 'Account Deletion Requested by User',
        details ? String(details).trim() : null,
        ipAddress,
        userAgent,
      ]
    );

    // 2. Invalidate Admin Deletion Requests Redis Cache
    await cache.delByPattern('admin:deletion_requests*');

    const referenceId = `REQ-${result.insertId}`;

    return res.status(201).json({
      success: true,
      message: 'Your account deletion request has been registered successfully. Our safety and data compliance team will process it within 24 to 48 hours.',
      reference_id: referenceId,
    });
  } catch (err) {
    console.error('submitAccountDeletionRequest error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit account deletion request. Please try again or email support.',
      error: err.message,
    });
  }
}
