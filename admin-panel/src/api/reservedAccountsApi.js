import { request } from './client';

export const reservedAccountsApi = {
  // Get reserved accounts with filters and pagination
  getAccounts: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.category) query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    return await request(`/admin/reserved-accounts?${query.toString()}`);
  },

  // Get statistics (total, available, assigned)
  getStats: async () => {
    return await request('/admin/reserved-accounts/stats');
  },

  // Add new reserved ID or range of IDs
  addReserved: async (payload) => {
    return await request('/admin/reserved-accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Configure initial reserved range (e.g. from 2 to 100 or 200)
  setRange: async (payload) => {
    return await request('/admin/reserved-accounts/set-range', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Assign an available reserved ID to an existing user
  assignReserved: async (payload) => {
    return await request('/admin/reserved-accounts/assign', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Release an assigned reserved ID back to available pool
  releaseReserved: async (payload) => {
    return await request('/admin/reserved-accounts/release', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Delete an unassigned reserved ID
  deleteReserved: async (id) => {
    return await request(`/admin/reserved-accounts/${id}`, {
      method: 'DELETE',
    });
  },
};

export default reservedAccountsApi;
