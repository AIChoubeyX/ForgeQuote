const rawApi = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').trim();
const API = rawApi.endsWith('/api') ? rawApi : `${rawApi.replace(/\/+$/, '')}/api`;

export function setToken(token) {
  if (token) {
    localStorage.setItem('forgequote_token', token);
  } else {
    localStorage.removeItem('forgequote_token');
  }
}

export function getToken() {
  return localStorage.getItem('forgequote_token');
}

export async function api(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const token = getToken();
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: isFormData
      ? { ...authHeader, ...options.headers }
      : { 'Content-Type': 'application/json', ...authHeader, ...options.headers },
    ...options
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error?.message || 'Request failed');
  }
  return response.status === 204 ? null : response.json();
}

export async function downloadFile(path, filename) {
  const token = getToken();
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: authHeader
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error?.message || 'Download failed');
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'document.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
