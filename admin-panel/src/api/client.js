export function getApiBase() {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const { protocol, hostname, port } = window.location;
    if (port === '5050') {
      return `${protocol}//${hostname}:5050/api`;
    }
    // Both Vite dev server (port 3000/5173) and Nginx production (port 80/443) proxy /api
    return '/api';
  }
  return 'http://localhost:5050/api';
}

export const API_BASE = (function() {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const { protocol, hostname, port } = window.location;
    if (port === '5050') {
      return `${protocol}//${hostname}:5050/api`;
    }
    return '/api';
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

  const currentApiBase = getApiBase();

  const url = (normalizedEndpoint.startsWith('http://') || normalizedEndpoint.startsWith('https://'))
    ? normalizedEndpoint
    : `${currentApiBase}${normalizedEndpoint.startsWith('/') ? normalizedEndpoint : '/' + normalizedEndpoint}`;

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

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      if (!res.ok) {
        if (res.status === 413) {
          throw new Error('File payload too large (413 Request Entity Too Large). Maximum allowed upload is 100MB.');
        }
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText || 'Unexpected non-JSON response'}`);
      }
      data = {};
    }

    if (!res.ok) {
      throw new Error(data.message || `API request failed with status ${res.status}`);
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
  const trimmed = String(url).trim();
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // If URL contains localhost:5050 or old domain with /uploads/, extract relative upload path
  const uploadIndex = trimmed.indexOf('/uploads/');
  if (uploadIndex !== -1) {
    const relativeUpload = trimmed.slice(uploadIndex);
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${relativeUpload}`;
    }
    return `http://localhost:5050${relativeUpload}`;
  }

  if (trimmed.startsWith('uploads/')) {
    const relativeUpload = `/${trimmed}`;
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${relativeUpload}`;
    }
    return `http://localhost:5050${relativeUpload}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${trimmed.startsWith('/') ? trimmed : '/' + trimmed}`;
  }
  return `http://localhost:5050${trimmed.startsWith('/') ? trimmed : '/' + trimmed}`;
}

export async function uploadFile(file, category = 'general') {
  const formData = new FormData();
  formData.append('category', category);
  formData.append('file', file);

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const currentApiBase = getApiBase();
  const res = await fetch(`${currentApiBase}/admin/upload?category=${encodeURIComponent(category)}`, {
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
