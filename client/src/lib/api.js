const rawApi = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').trim();
const API = rawApi.endsWith('/api') ? rawApi : `${rawApi.replace(/\/+$/, '')}/api`;

export async function api(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: isFormData ? { ...options.headers } : { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error?.message || 'Request failed');
  }
  return response.status === 204 ? null : response.json();
}

export async function downloadFile(path, filename) {
  const response = await fetch(`${API}${path}`, {
    credentials: 'include'
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
