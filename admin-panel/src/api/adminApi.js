import { request } from './client';

export const adminApi = {
  /**
   * Bulk delete items across any entity
   * @param {string} entity - 'users' | 'banners' | 'gifts' | 'thumbnails' | 'entry-effects' | 'packages' | 'categories' | 'moderators' | 'agencies' | 'resellers' | 'reseller-sales' | 'withdrawals' | 'host-requests'
   * @param {Array<number|string>} ids - Array of item IDs to delete
   */
  bulkDelete: async (entity, ids) => {
    return await request('/admin/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ entity, ids }),
    });
  },
};

export default adminApi;
