import { request } from './client';

export const reportApi = {
  getReports: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/admin/reports?${query}`);
  },

  getOffenderReports: async (userId) => {
    return await request(`/admin/reports/offender/${userId}`);
  },

  updateReportStatus: async (id, data) => {
    return await request(`/admin/reports/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  takeReportAction: async (id, actionData) => {
    return await request(`/admin/reports/${id}/action`, {
      method: 'POST',
      body: JSON.stringify(actionData),
    });
  },

  deleteReport: async (id) => {
    return await request(`/admin/reports/${id}`, {
      method: 'DELETE',
    });
  },

  bulkDeleteReports: async (ids) => {
    return await request('/admin/reports/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },
};

export default reportApi;
