import { request } from './client';

export const coinPackageApi = {
  // Get all coin recharge packages and quick presets
  getCoinPackages: async () => {
    return await request('/admin/coin-packages');
  },

  // Create a new coin recharge package / preset
  createCoinPackage: async (data) => {
    return await request('/admin/coin-packages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update an existing coin package / preset
  updateCoinPackage: async (id, data) => {
    return await request(`/admin/coin-packages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete a coin package
  deleteCoinPackage: async (id) => {
    return await request(`/admin/coin-packages/${id}`, {
      method: 'DELETE',
    });
  },

  // Toggle package active state
  toggleCoinPackage: async (id) => {
    return await request(`/admin/coin-packages/${id}/toggle`, {
      method: 'PATCH',
    });
  },

  // Quick preset amounts
  getQuickPresets: async () => {
    return await request('/admin/coin-packages/quick-presets');
  },

  updateQuickPresets: async (presets) => {
    return await request('/admin/coin-packages/quick-presets', {
      method: 'PUT',
      body: JSON.stringify({ presets }),
    });
  },
};

export default coinPackageApi;
