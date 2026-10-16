import { request } from './client';

export const packageApi = {
  // Categories
  getCategories: async () => {
    return await request('/admin/package-categories');
  },

  createCategory: async (data) => {
    return await request('/admin/package-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateCategory: async (id, data) => {
    return await request(`/admin/package-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteCategory: async (id) => {
    return await request(`/admin/package-categories/${id}`, {
      method: 'DELETE',
    });
  },

  reorderCategories: async (orderings) => {
    return await request('/admin/package-categories/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderings }),
    });
  },

  // Packages
  getPackages: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/admin/packages?${query}`);
  },

  createPackage: async (data) => {
    return await request('/admin/packages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updatePackage: async (id, data) => {
    return await request(`/admin/packages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deletePackage: async (id) => {
    return await request(`/admin/packages/${id}`, {
      method: 'DELETE',
    });
  },

  // Subscribers & Granting
  getSubscribers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/admin/package-subscribers?${query}`);
  },

  grantPackage: async (data) => {
    return await request('/admin/packages/grant', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  revokeSubscription: async (id) => {
    return await request(`/admin/package-subscribers/${id}`, {
      method: 'DELETE',
    });
  },
};

export default packageApi;
