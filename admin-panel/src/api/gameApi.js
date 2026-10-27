import { request } from './client';

export const gameApi = {
  /**
   * Fetch all mini-games with their active status and admin controls
   */
  getAdminGames: async () => {
    return await request('/admin/games', {
      method: 'GET',
    });
  },

  getGames: async () => {
    return await request('/admin/games', {
      method: 'GET',
    });
  },

  /**
   * Toggle a mini-game on or off (Active / Maintenance)
   */
  toggleGame: async (id) => {
    return await request(`/admin/games/${id}/toggle`, {
      method: 'PATCH',
    });
  },

  /**
   * Update mini-game configurations (min_bet, max_bet, chips, settings)
   */
  updateGame: async (id, data) => {
    return await request(`/admin/games/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

export default gameApi;
