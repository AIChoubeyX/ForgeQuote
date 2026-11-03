const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

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
