import { request } from './client';

export const dashboardApi = {
  getStats: async () => {
    return await request('/admin/stats');
  },
};

export default dashboardApi;
