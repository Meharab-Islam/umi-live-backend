export const API_BASE = (function() {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5050/api`;
  }
  return 'http://localhost:5050/api';
})();

let token = localStorage.getItem('umi_admin_token') || '';

export function setToken(newToken) {
  token = newToken;
  if (newToken) {
    localStorage.setItem('umi_admin_token', newToken);
  } else {
    localStorage.removeItem('umi_admin_token');
  }
}

export function getToken() {
  return token;
}

export function getCurrentUser() {
  const saved = localStorage.getItem('umi_admin_user');
  return saved ? JSON.parse(saved) : null;
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('umi_admin_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('umi_admin_user');
  }
}

function wrapResponse(data) {
  if (data && typeof data === 'object' && !('data' in data)) {
    return { ...data, data };
  }
  return data;
}

export async function request(endpoint, options = {}) {
  // Normalize endpoint to prevent double '/api/api' prefixes
  const normalizedEndpoint = endpoint.startsWith('/api/')
    ? endpoint.slice(4)
    : endpoint.startsWith('/api')
    ? endpoint.slice(4)
    : endpoint;

  const url = (normalizedEndpoint.startsWith('http://') || normalizedEndpoint.startsWith('https://'))
    ? normalizedEndpoint
    : `${API_BASE}${normalizedEndpoint.startsWith('/') ? normalizedEndpoint : '/' + normalizedEndpoint}`;

  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'API request failed');
    }
    return data;
  } catch (err) {
    console.warn(`Request failed to ${endpoint}:`, err.message);
    throw err;
  }
}

export async function get(endpoint, options = {}) {
  const res = await request(endpoint, { ...options, method: 'GET' });
  return wrapResponse(res);
}

export async function post(endpoint, body, options = {}) {
  const res = await request(endpoint, {
    ...options,
    method: 'POST',
    body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
  });
  return wrapResponse(res);
}

export async function put(endpoint, body, options = {}) {
  const res = await request(endpoint, {
    ...options,
    method: 'PUT',
    body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
  });
  return wrapResponse(res);
}

export async function patch(endpoint, body, options = {}) {
  const res = await request(endpoint, {
    ...options,
    method: 'PATCH',
    body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
  });
  return wrapResponse(res);
}

export async function del(endpoint, options = {}) {
  const res = await request(endpoint, { ...options, method: 'DELETE' });
  return wrapResponse(res);
}

export function resolveAssetUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  if (url.startsWith('/uploads/')) {
    if (typeof window !== 'undefined' && window.location.port === '3000') {
      return url;
    }
    const host = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5050` : 'http://localhost:5050';
    return `${host}${url}`;
  }
  return url;
}

export async function uploadFile(file, category = 'general') {
  const formData = new FormData();
  formData.append('category', category);
  formData.append('file', file);

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/admin/upload?category=${encodeURIComponent(category)}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'File upload failed');
  }
  return data;
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return await res.json();
  } catch (e) {
    return { status: 'offline', error: e.message };
  }
}

export default {
  API_BASE,
  setToken,
  getToken,
  getCurrentUser,
  setCurrentUser,
  request,
  uploadFile,
  resolveAssetUrl,
  checkHealth,
  get,
  post,
  put,
  patch,
  delete: del,
  del,
};
