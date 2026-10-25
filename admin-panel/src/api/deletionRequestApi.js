import { request } from './client';

export const deletionRequestApi = {
  getDeletionRequests: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    return await request(`/admin/deletion-requests${query ? `?${query}` : ''}`);
  },

  approveRequest: async (id, data = {}) => {
    return await request(`/admin/deletion-requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  rejectRequest: async (id, data = {}) => {
    return await request(`/admin/deletion-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteRecord: async (id) => {
    return await request(`/admin/deletion-requests/${id}`, {
      method: 'DELETE',
    });
  },
};

export default deletionRequestApi;
