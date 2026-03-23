import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
// Devtools faqat dev da — lazy import
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { queryClient } from '@/lib/queryClient';
import { routeTree } from './app/routeTree.gen';
import { useAuthStore } from '@/stores/auth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ToastProvider } from '@/components/ui/toast';
import '@/i18n';
import './app.css';

// Yangi deploy'dan keyin eski chunk 404 bo'lsa — avtomatik reload
window.addEventListener('vite:preloadError', () => {
  if (!sessionStorage.getItem('chunk-reload')) {
    sessionStorage.setItem('chunk-reload', '1');
    window.location.reload();
  }
});
sessionStorage.removeItem('chunk-reload');

/* ─── Yangi versiya tekshirish ─── */
const CURRENT_SCRIPT = document.querySelector('script[src*="/assets/index-"]')?.getAttribute('src') ?? '';

async function checkForUpdate() {
  try {
    const html = await fetch('/index.html', { cache: 'no-store' }).then((r) => r.text());
    const match = html.match(/src="(\/assets\/index-[^"]+)"/);
    if (match && match[1] && match[1] !== CURRENT_SCRIPT) {
      // Yangi versiya mavjud — banner ko'rsatish va reload
      const banner = document.createElement('div');
      banner.innerHTML = `
        <div style="position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:white;padding:12px 20px;display:flex;align-items:center;justify-content:center;gap:10px;font-family:Inter,sans-serif;font-size:14px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,0.15);animation:slideDown 0.3s ease-out">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
          Yangi versiya yuklanmoqda...
        </div>
        <style>@keyframes slideDown{from{transform:translateY(-100%)}to{transform:translateY(0)}}</style>
      `;
      document.body.appendChild(banner);
      setTimeout(() => window.location.reload(), 1500);
    }
  } catch { /* network error — skip */ }
}

// Tab'ga qaytganda tekshirish
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkForUpdate();
});

const router = createRouter({
  routeTree,
  defaultOnCatch: () => {
    // Chunk 404 — yangi deploy bo'lgan, sahifani reload qilamiz
    if (!sessionStorage.getItem('chunk-reload')) {
      sessionStorage.setItem('chunk-reload', '1');
      window.location.reload();
    }
  },
});

// Har sahifa o'tishda yangi deploy tekshirish
router.subscribe('onResolved', checkForUpdate);

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Auto-refresh token on page reload if user was authenticated
async function initAuth() {
  const { isAuthenticated, setAccessToken, logout } = useAuthStore.getState();
  if (!isAuthenticated) return;

  try {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        setAccessToken(data.data.accessToken);
        return;
      }
    }
    logout();
  } catch {
    logout();
  }
}

initAuth().then(() => {
  const rootEl = document.getElementById('root')!;
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <ToastProvider>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </ToastProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
});
