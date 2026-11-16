import {
  getAgxConfig,
  verifyWebhookSignature,
  isTimestampFresh,
  processRoundSettled,
} from '../services/agxGameService.js';
import { resolveAbsoluteUrl } from './mobile/giftController.js';

/**
 * POST /api/webhooks/agx
 * AGX round settlement webhook. Must be mounted with `express.raw({ type: '*\/*' })` BEFORE the global
 * JSON parser, because the HMAC signature is computed over the exact raw body bytes.
 * AGX treats any non-2xx (or > 8 s) as a failed delivery and retries, so DB failures return 500 and the
 * per-settlement idempotency key makes retries harmless.
 */
export function createAgxWebhookHandler(io) {
  return async function agxWebhook(req, res) {
    try {
      const cfg = await getAgxConfig();
      if (!cfg.webhook_secret) {
        return res.status(503).json({ success: false, message: 'Webhook secret not configured.' });
      }

      const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
      if (!verifyWebhookSignature(raw, req.get('X-Webhook-Signature'), cfg.webhook_secret)) {
        return res.status(401).send('bad signature');
      }
      if (!isTimestampFresh(req.get('X-Webhook-Timestamp'))) {
        return res.status(401).send('stale timestamp');
      }

      let event;
      try {
        event = JSON.parse(raw.toString('utf8'));
      } catch {
        return res.status(400).send('invalid json');
      }

      if (event.event === 'webhook.test') {
        console.log('[AGX] Test webhook received and verified.');
        return res.status(200).json({ success: true, test: true });
      }
      if (event.event !== 'game.round_settled') {
        return res.status(200).json({ success: true, ignored: event.event || 'unknown' });
      }

      const summary = await processRoundSettled(event, io, { toAbsoluteUrl: (u) => resolveAbsoluteUrl(req, u) });
      if (summary.applied || summary.skipped) {
        console.log(`[AGX] ${event.round_id}: applied ${summary.applied}, duplicates ${summary.duplicates}, skipped ${summary.skipped}`);
      }
      return res.status(200).json({ success: true, ...summary });
    } catch (err) {
      console.error('[AGX] Webhook processing failed:', err.message);
      return res.status(500).json({ success: false, message: 'Processing failed, please retry.' });
    }
  };
}
