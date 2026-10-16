import { request } from './client';

export const userApi = {
  getUsers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/admin/users?${query}`);
  },

  updateUser: async (id, data) => {
    return await request(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  adjustBalance: async (id, data) => {
    return await request(`/admin/users/${id}/balance`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  rechargeCoins: async (data) => {
    return await request('/admin/recharge-coin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getRechargeHistory: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/admin/recharge-history?${query}`);
  },

  getUserDetails: async (id) => {
    return await request(`/admin/users/${id}/details`);
  },

  getConversationMessages: async (userId, conversationId) => {
    return await request(`/admin/users/${userId}/chats/${conversationId}/messages`);
  },

  deleteUserPost: async (postId) => {
    return await request(`/admin/posts/${postId}`, {
      method: 'DELETE',
    });
  },

  deleteUser: async (id) => {
    return await request(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  },
};

export default userApi;
