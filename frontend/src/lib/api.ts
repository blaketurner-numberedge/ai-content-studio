// API client configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export async function apiFetch(path: string, options?: RequestInit) {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res;
}

export function getImageUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path}`;
}
