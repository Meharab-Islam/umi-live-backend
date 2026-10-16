import { request } from './client';

export const settingsApi = {
  getSettings: async () => {
    return await request('/admin/settings');
  },

  updateSetting: async (key, value, description) => {
    return await request(`/admin/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value, description }),
    });
  },
};

export default settingsApi;
