import { request } from './client';

export const specialItemApi = {
  // ============================
  // Thumbnails API
  // ============================
  getThumbnails: async () => {
    return await request('/admin/thumbnails');
  },

  createThumbnail: async (data) => {
    return await request('/admin/thumbnails', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateThumbnail: async (id, data) => {
    return await request(`/admin/thumbnails/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteThumbnail: async (id) => {
    return await request(`/admin/thumbnails/${id}`, {
      method: 'DELETE',
    });
  },

  getThumbnailSubscribers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/admin/thumbnails/subscribers?${query}`);
  },

  grantThumbnail: async (data) => {
    return await request('/admin/thumbnails/grant', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  revokeThumbnail: async (id) => {
    return await request(`/admin/thumbnails/subscribers/${id}`, {
      method: 'DELETE',
    });
  },

  // ============================
  // Entry Effects API
  // ============================
  getEntryEffects: async () => {
    return await request('/admin/entry-effects');
  },

  createEntryEffect: async (data) => {
    return await request('/admin/entry-effects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateEntryEffect: async (id, data) => {
    return await request(`/admin/entry-effects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteEntryEffect: async (id) => {
    return await request(`/admin/entry-effects/${id}`, {
      method: 'DELETE',
    });
  },

  getEntryEffectSubscribers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/admin/entry-effects/subscribers?${query}`);
  },

  grantEntryEffect: async (data) => {
    return await request('/admin/entry-effects/grant', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  revokeEntryEffect: async (id) => {
    return await request(`/admin/entry-effects/subscribers/${id}`, {
      method: 'DELETE',
    });
  },
};

export default specialItemApi;
