import ky from 'ky';
import { useAuthStore } from '@/stores/auth';

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

export const api = ky.create({
  prefixUrl: '/api/v1',
  timeout: 30000,
  credentials: 'include',
  hooks: {
    beforeRequest: [
      (request) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (request, _options, response) => {
        if (response.status === 401) {
          // Login yoki refresh endpoint bo'lsa — loop qilma
          if (request.url.includes('/auth/refresh') || request.url.includes('/auth/login')) {
            return response;
          }

          // Allaqachon login sahifada bo'lsa — redirect qilma
          if (window.location.pathname === '/login') {
            return response;
          }

          // Faqat 1 marta refresh qilish (parallel requestlar uchun)
          if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = refreshToken();
          }

          const refreshed = await refreshPromise;
          isRefreshing = false;
          refreshPromise = null;

          if (!refreshed) {
            useAuthStore.getState().logout();
            window.location.href = '/login';
          }
        }
        return response;
      },
    ],
  },
});

async function refreshToken(): Promise<boolean> {
  try {
    const res = await ky.post('/api/v1/auth/refresh', {
      credentials: 'include',
      timeout: 10000,
    });
    const data = (await res.json()) as { success: boolean; data: { accessToken: string } };
    if (data.success) {
      useAuthStore.getState().setAccessToken(data.data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
