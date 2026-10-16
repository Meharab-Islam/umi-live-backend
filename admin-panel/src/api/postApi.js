import { request } from './client';

export const postApi = {
  getPosts: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await request(`/admin/posts?${query}`);
  },

  createPost: async (formDataOrData) => {
    return await request('/admin/posts', {
      method: 'POST',
      body: formDataOrData instanceof FormData ? formDataOrData : JSON.stringify(formDataOrData),
    });
  },

  deletePost: async (postId) => {
    return await request(`/admin/posts/${postId}`, {
      method: 'DELETE',
    });
  },

  bulkDeletePosts: async (ids) => {
    return await request('/admin/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({
        entity: 'posts',
        ids,
      }),
    });
  },

  uploadMedia: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return await request('/admin/upload?category=posts', {
      method: 'POST',
      body: formData,
    });
  },
};

export default postApi;
