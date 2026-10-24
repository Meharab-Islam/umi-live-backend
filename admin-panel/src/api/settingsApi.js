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

  resetAllCoins: async (actionPassword, includeAdmins = false) => {
    return await request('/admin/wallets/reset-all-coins', {
      method: 'POST',
      body: JSON.stringify({ actionPassword, includeAdmins }),
    });
  },

  resetAllDiamonds: async (actionPassword, includeAdmins = false) => {
    return await request('/admin/wallets/reset-all-diamonds', {
      method: 'POST',
      body: JSON.stringify({ actionPassword, includeAdmins }),
    });
  },

  resetAllBalances: async (actionPassword, includeAdmins = false) => {
    return await request('/admin/wallets/reset-all-balances', {
      method: 'POST',
      body: JSON.stringify({ actionPassword, includeAdmins }),
    });
  },
};

export default settingsApi;
