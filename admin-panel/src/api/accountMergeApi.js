import { request } from './client';

export const accountMergeApi = {
  // Get merge preview
  previewMerge: async (oldUserId, newUserId) => {
    return await request(`/admin/merge-accounts/preview?oldUserId=${oldUserId}&newUserId=${newUserId}`);
  },

  // Execute merge
  executeMerge: async (payload) => {
    return await request('/admin/merge-accounts/execute', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Get past merge audit history
  getMergeHistory: async () => {
    return await request('/admin/merge-accounts/history');
  },
};

export default accountMergeApi;
