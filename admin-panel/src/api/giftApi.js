import { request } from './client';

export const giftApi = {
  getGifts: async () => {
    return await request('/admin/gifts');
  },

  createGift: async (data) => {
    return await request('/admin/gifts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateGift: async (id, data) => {
    return await request(`/admin/gifts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteGift: async (id) => {
    return await request(`/admin/gifts/${id}`, {
      method: 'DELETE',
    });
  },

  getTopContributors: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return await request(`/admin/gifts/top-contributors${qs ? `?${qs}` : ''}`);
  },

  clearGiftHistory: async (data = {}) => {
    return await request('/admin/gifts/clear-history', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getUserContributions: async (userId) => {
    return await request(`/mobile/gifts/user/${userId}/contributions`);
  },

  uploadMedia: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return await request('/admin/upload?category=gifts', {
      method: 'POST',
      body: formData,
    });
  },

  getGlobalBannerConfig: async () => {
    return await request('/admin/gifts/global-banner');
  },

  updateGlobalBannerConfig: async (data) => {
    return await request('/admin/gifts/global-banner', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  sendTestBanner: async () => {
    return await request('/admin/gifts/global-banner/test', {
      method: 'POST',
    });
  },
};

export default giftApi;
