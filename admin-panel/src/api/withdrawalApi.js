import { request } from './client';

export const withdrawalApi = {
  getWithdrawals: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/admin/withdrawals?${query}`);
  },

  processWithdrawal: async (id, status, adminNotes) => {
    return await request(`/admin/withdrawals/${id}/process`, {
      method: 'POST',
      body: JSON.stringify({ status, adminNotes }),
    });
  },

  getWithdrawalConfig: async () => {
    return await request('/admin/withdrawal-config');
  },

  updateWithdrawalConfig: async (data) => {
    return await request('/admin/withdrawal-config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

export default withdrawalApi;
