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
// Reload muvaffaqiyatli bo'lsa flag'ni tozalash
sessionStorage.removeItem('chunk-reload');

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
