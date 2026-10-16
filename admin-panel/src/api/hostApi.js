import { request } from './client';

export const hostApi = {
  getHosts: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/admin/hosts?${query}`);
  },

  updateHost: async (id, data) => {
    return await request(`/admin/hosts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  getHostRequests: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/admin/host-requests?${query}`);
  },

  createHostRequest: async (data) => {
    return await request('/admin/host-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  processHostRequest: async (id, status, adminNotes = '') => {
    return await request(`/admin/host-requests/${id}/process`, {
      method: 'POST',
      body: JSON.stringify({ status, adminNotes }),
    });
  },

  getHostRatios: async () => {
    return await request('/admin/host-ratios');
  },

  updateHostRatios: async (data) => {
    return await request('/admin/host-ratios', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

export default hostApi;
