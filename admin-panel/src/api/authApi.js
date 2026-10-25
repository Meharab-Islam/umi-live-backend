import { request, setToken, getToken, getCurrentUser, setCurrentUser } from './client';

export const authApi = {
  login: async (identifier, password) => {
    return await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier,
        password,
        device_name: 'Admin Web Console',
        device_unique_id: 'admin-web-console',
      }),
    });
  },

  getMe: async () => {
    return await request('/auth/me');
  },

  getAdminProfile: async () => {
    return await request('/admin/profile');
  },

  updateAdminProfile: async (data) => {
    return await request('/admin/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

export { setToken, getToken, getCurrentUser, setCurrentUser };
export default authApi;
