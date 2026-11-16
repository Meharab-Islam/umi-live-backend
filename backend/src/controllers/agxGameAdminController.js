import {
  getAgxConfigForAdmin,
  saveAgxConfig,
  fetchPartnerGames,
  getSettlementReport,
} from '../services/agxGameService.js';

/** GET /api/admin/agx-games/config — current settings (secrets masked) + game catalog. */
export async function getAgxGamesConfig(req, res) {
  try {
    const config = await getAgxConfigForAdmin();
    return res.json({ success: true, config });
  } catch (err) {
    console.error('[AGX Admin] get config:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load AGX settings.' });
  }
}

/** PUT /api/admin/agx-games/config — save settings. Empty api_key / webhook_secret keep the stored ones. */
export async function updateAgxGamesConfig(req, res) {
  try {
    const config = await saveAgxConfig(req.body || {});
    return res.json({ success: true, message: 'AGX games settings saved.', config });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error('[AGX Admin] save config:', err.message);
    return res.status(status).json({ success: false, message: err.message || 'Failed to save AGX settings.' });
  }
}

/** POST /api/admin/agx-games/test — call AGX `GET /partner/games` with the saved key. */
export async function testAgxConnection(req, res) {
  try {
    const data = await fetchPartnerGames({ fresh: true });
    return res.json({
      success: true,
      message: `Connected to AGX as ${data.tenant || 'your app'} — ${data.games.length} game(s) added in the Game Center.`,
      ...data,
    });
  } catch (err) {
    return res.status(200).json({ success: false, message: err.message || 'Could not reach AGX.' });
  }
}

/** GET /api/admin/agx-games/settlements?days=7&limit=50&user_id= — per-game totals and latest results. */
export async function getAgxSettlements(req, res) {
  try {
    const report = await getSettlementReport({
      days: req.query.days,
      limit: req.query.limit,
      userId: req.query.user_id,
    });
    return res.json({ success: true, ...report });
  } catch (err) {
    console.error('[AGX Admin] settlements:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load game results.' });
  }
}
