import { request } from './client';

export const streamApi = {
  getStreams: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/admin/streams?${query}`);
  },

  terminateStream: async (roomId, reason) => {
    return await request(`/admin/streams/${roomId}/terminate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};

export default streamApi;
