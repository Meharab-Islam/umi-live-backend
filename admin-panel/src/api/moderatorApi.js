import { request } from './client';

export const moderatorApi = {
  getModerators: async () => {
    return await request('/admin/moderators');
  },

  addModerator: async (data) => {
    return await request('/admin/moderators', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateModerator: async (id, data) => {
    return await request(`/admin/moderators/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteModerator: async (id) => {
    return await request(`/admin/moderators/${id}`, {
      method: 'DELETE',
    });
  },
};

export default moderatorApi;
