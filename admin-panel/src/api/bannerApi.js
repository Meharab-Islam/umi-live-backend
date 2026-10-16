import { request } from './client';

export const bannerApi = {
  // Get all admin banners
  getBanners: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.status) query.append('status', params.status);
    const queryString = query.toString();
    const endpoint = queryString ? `/admin/banners?${queryString}` : '/admin/banners';
    return await request(endpoint);
  },

  // Create a new banner
  createBanner: async (data) => {
    return await request('/admin/banners', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update existing banner
  updateBanner: async (id, data) => {
    return await request(`/admin/banners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete banner
  deleteBanner: async (id) => {
    return await request(`/admin/banners/${id}`, {
      method: 'DELETE',
    });
  },

  // Toggle active status
  toggleBannerStatus: async (id) => {
    return await request(`/admin/banners/${id}/toggle`, {
      method: 'PATCH',
    });
  },

  // Reorder banners
  reorderBanners: async (orderings) => {
    return await request('/admin/banners/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderings }),
    });
  },
};

export default bannerApi;
