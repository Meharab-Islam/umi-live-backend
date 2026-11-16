import { request } from './client';

/** AGX third-party games admin endpoints (backend: /api/admin/agx-games/*). */
export const agxGamesApi = {
  getConfig: () => request('/admin/agx-games/config'),

  saveConfig: (config) =>
    request('/admin/agx-games/config', { method: 'PUT', body: JSON.stringify(config) }),

  testConnection: () => request('/admin/agx-games/test', { method: 'POST' }),

  getSettlements: ({ days = 7, limit = 50, userId = '' } = {}) => {
    const qs = new URLSearchParams({ days: String(days), limit: String(limit) });
    if (userId) qs.set('user_id', String(userId));
    return request(`/admin/agx-games/settlements?${qs.toString()}`);
  },
};

export default agxGamesApi;
