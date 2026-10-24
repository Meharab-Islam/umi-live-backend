import { request } from './client';

export const levelApi = {
  getLevels: async () => {
    return await request('/admin/levels');
  },

  getRewardOptions: async () => {
    return await request('/admin/levels/reward-options');
  },

  createLevel: async (data) => {
    return await request('/admin/levels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateLevel: async (id, data) => {
    return await request(`/admin/levels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteLevel: async (id) => {
    return await request(`/admin/levels/${id}`, {
      method: 'DELETE',
    });
  },

  getHistory: async (page = 1, limit = 20) => {
    return await request(`/admin/levels/history?page=${page}&limit=${limit}`);
  },

  seedDefaultLevels: async () => {
    return await request('/admin/levels/seed', {
      method: 'POST',
    });
  },
};

export default levelApi;
