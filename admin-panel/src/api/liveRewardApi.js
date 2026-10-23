import { request } from './client';

export const liveRewardApi = {
  getSettings: async () => {
    return await request('/admin/live-rewards/settings');
  },

  updateSettings: async (data) => {
    return await request('/admin/live-rewards/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getStats: async () => {
    return await request('/admin/live-rewards/stats');
  },

  getHistory: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/admin/live-rewards/history?${query}`);
  },
};

export default liveRewardApi;
