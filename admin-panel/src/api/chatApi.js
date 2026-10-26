import { request } from './client';

export const chatApi = {
  // Search users for chat moderation
  searchChatUsers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/admin/chats/users${query ? `?${query}` : ''}`);
  },

  // Get conversations (optional userId filter, search, pagination)
  getConversations: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/admin/chats/conversations${query ? `?${query}` : ''}`);
  },

  // Get conversation messages
  getConversationMessages: async (conversationId) => {
    return await request(`/admin/chats/conversations/${conversationId}/messages`);
  },

  // Delete single chat message (cleans storage media + DB)
  deleteChatMessage: async (messageId) => {
    return await request(`/admin/chats/messages/${messageId}`, {
      method: 'DELETE',
    });
  },

  // Delete entire conversation (cleans all storage media + DB)
  deleteConversation: async (conversationId) => {
    return await request(`/admin/chats/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  },
};

export default chatApi;
