import { request } from './client';

export const dashboardApi = {
  getStats: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.period) searchParams.append('period', params.period);
    if (params.start_date) searchParams.append('start_date', params.start_date);
    if (params.end_date) searchParams.append('end_date', params.end_date);
    const queryString = searchParams.toString();
    return await request(`/admin/stats${queryString ? `?${queryString}` : ''}`);
  },
};

export default dashboardApi;
