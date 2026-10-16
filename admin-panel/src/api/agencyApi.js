import { request } from './client';

export const agencyApi = {
  getAgencies: async () => {
    return await request('/admin/agencies');
  },

  createAgency: async (data) => {
    return await request('/admin/agencies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateAgency: async (id, data) => {
    return await request(`/admin/agencies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteAgency: async (id) => {
    return await request(`/admin/agencies/${id}`, {
      method: 'DELETE',
    });
  },

  getAgencyHosts: async (id) => {
    return await request(`/admin/agencies/${id}/hosts`);
  },

  assignUserToAgency: async (id, userId, hostType = 'video') => {
    return await request(`/admin/agencies/${id}/hosts`, {
      method: 'POST',
      body: JSON.stringify({ userId, hostType }),
    });
  },

  removeUserFromAgency: async (id, userId) => {
    return await request(`/admin/agencies/${id}/hosts/${userId}`, {
      method: 'DELETE',
    });
  },
};

export default agencyApi;
