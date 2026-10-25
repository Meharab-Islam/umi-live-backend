import { request } from './client';

export const legalApi = {
  getLegalPolicies: async () => {
    return await request('/admin/privacy-policy');
  },

  updateLegalPolicies: async (data) => {
    return await request('/admin/privacy-policy', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

export default legalApi;
