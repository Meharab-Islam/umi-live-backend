import { getMobileGames, launchGameForUser } from '../../services/agxGameService.js';

/**
 * GET /api/mobile/games
 * Games the admin enabled (and that are added to our app in the AGX Game Center).
 */
export async function listGames(req, res) {
  try {
    const data = await getMobileGames();
    return res.json({ success: true, ...data });
  } catch (err) {
    console.error('[Games] list error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load games.' });
  }
}

/**
 * POST /api/mobile/games/launch   body: { game_id }
 * Creates an AGX game session with the player's current coin balance and returns the WebView URL.
 */
export async function launchGame(req, res) {
  const gameId = String(req.body?.game_id || '').trim();
  if (!gameId) {
    return res.status(400).json({ success: false, message: 'game_id is required.' });
  }
  try {
    const data = await launchGameForUser(req.user.id, gameId);
    return res.json({ success: true, ...data });
  } catch (err) {
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
    if (status >= 500) console.error('[Games] launch error:', err.message);
    return res.status(status).json({ success: false, message: err.message || 'Failed to open the game.' });
  }
}
