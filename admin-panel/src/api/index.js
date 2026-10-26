import client, { checkHealth, setToken, getToken, getCurrentUser, setCurrentUser } from './client';
import { authApi } from './authApi';
import { dashboardApi } from './dashboardApi';
import { userApi } from './userApi';
import { agencyApi } from './agencyApi';
import { streamApi } from './streamApi';
import { giftApi } from './giftApi';
import { withdrawalApi } from './withdrawalApi';
import { settingsApi } from './settingsApi';
import { moderatorApi } from './moderatorApi';
import { hostApi } from './hostApi';
import { resellerApi } from './resellerApi';
import { packageApi } from './packageApi';
import { coinPackageApi } from './coinPackageApi';
import { bannerApi } from './bannerApi';
import { accountMergeApi } from './accountMergeApi';
import { adminApi } from './adminApi';
import { postApi } from './postApi';
import { reportApi } from './reportApi';
import { chatApi } from './chatApi';

// Re-export individual modular API services
export {
  client,
  adminApi,
  authApi,
  dashboardApi,
  userApi,
  chatApi,
  postApi,
  reportApi,
  agencyApi,
  streamApi,
  giftApi,
  withdrawalApi,
  settingsApi,
  moderatorApi,
  hostApi,
  resellerApi,
  packageApi,
  coinPackageApi,
  bannerApi,
  accountMergeApi,
  setToken,
  getToken,
  getCurrentUser,
  setCurrentUser,
  checkHealth,
};

// Unified legacy API object combining all modular services
export const api = {
  checkHealth,
  ...authApi,
  ...dashboardApi,
  ...userApi,
  ...agencyApi,
  ...streamApi,
  ...giftApi,
  ...withdrawalApi,
  ...settingsApi,
  ...moderatorApi,
  ...hostApi,
  ...resellerApi,
  ...packageApi,
  ...coinPackageApi,
  ...bannerApi,
  ...accountMergeApi,
};

export default api;
