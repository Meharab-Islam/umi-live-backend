import { request } from './client';

export const resellerApi = {
  getResellers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/admin/resellers?${query}`);
  },

  assignReseller: async (data) => {
    return await request('/admin/resellers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteReseller: async (id) => {
    return await request(`/admin/resellers/${id}`, {
      method: 'DELETE',
    });
  },

  getResellerSales: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/admin/reseller-sales?${query}`);
  },

  recordResellerSale: async (data) => {
    return await request('/admin/reseller-sales', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteResellerSale: async (id) => {
    return await request(`/admin/reseller-sales/${id}`, {
      method: 'DELETE',
    });
  },

  clearResellerSales: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/admin/reseller-sales?${query}`, {
      method: 'DELETE',
    });
  },
};

export default resellerApi;
