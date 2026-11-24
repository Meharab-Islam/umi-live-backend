import { request } from './client';

export const deviceApi = {
  getBannedDevices: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/admin/devices/banned?${query}`);
  },

  unbanDevices: async (deviceIds) => {
    return await request('/admin/devices/unban', {
      method: 'POST',
      body: JSON.stringify({ device_ids: Array.isArray(deviceIds) ? deviceIds : [deviceIds] }),
    });
  },
};

export default deviceApi;
