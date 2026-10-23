import { request } from './client';

export const themeApi = {
  // Get all theme items (with optional type, search query, status)
  getThemeItems: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.type && params.type !== 'all') query.append('type', params.type);
    if (params.q) query.append('q', params.q);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    const qs = query.toString();
    const endpoint = qs ? `/admin/themes?${qs}` : '/admin/themes';
    return await request(endpoint);
  },

  // Get stats & active defaults
  getStats: async () => {
    return await request('/admin/themes/stats');
  },

  // Create new theme item (JSON or FormData)
  createThemeItem: async (data) => {
    const isFormData = data instanceof FormData;
    return await request('/admin/themes', {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
    });
  },

  // Update theme item
  updateThemeItem: async (id, data) => {
    const isFormData = data instanceof FormData;
    return await request(`/admin/themes/${id}`, {
      method: 'PUT',
      body: isFormData ? data : JSON.stringify(data),
    });
  },

  // Set as default for its type
  setDefault: async (id) => {
    return await request(`/admin/themes/${id}/default`, {
      method: 'PATCH',
    });
  },

  // Delete theme item
  deleteThemeItem: async (id) => {
    return await request(`/admin/themes/${id}`, {
      method: 'DELETE',
    });
  },
};

export default themeApi;
