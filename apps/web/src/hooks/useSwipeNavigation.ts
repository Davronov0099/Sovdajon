import { useRef, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useNavSettingsStore } from '@/stores/navSettings';
import { useAuthStore } from '@/stores/auth';

/* ─── Nav route xaritasi (MobileTopNav bilan sync) ─── */
const NAV_ROUTES: Record<string, string> = {
  dashboard: '/',
  pos: '/pos',
  products: '/products',
  categories: '/categories',
  debts: '/debts',
  customers: '/customers',
  suppliers: '/suppliers',
  expenses: '/expenses',
  hr: '/hr',
  settings: '/settings',
  helper: '/helper',
};

const MAIN_ROUTES = new Set(Object.values(NAV_ROUTES));
const SWIPE_THRESHOLD = 70;

/** Detail page uchun parent route */
function getParentRoute(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 2) return '/' + segments.slice(0, -1).join('/');
  return null;
}

function isMainPage(pathname: string): boolean {
  return MAIN_ROUTES.has(pathname);
}

/** Swipe'ni e'tiborsiz qoldirishimiz kerakmi? */
function shouldIgnoreTarget(target: HTMLElement): boolean {
  let el: HTMLElement | null = target;
  while (el && el !== document.body) {
    if (el.dataset?.noSwipe !== undefined) return true;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'CANVAS' || tag === 'SELECT') return true;
    if (el.getAttribute('role') === 'slider') return true;
    if (el.getAttribute('contenteditable') === 'true') return true;
    // Horizontal scroll elementlari
    if (el.scrollWidth > el.clientWidth + 5 && el.clientWidth > 0) {
      const style = window.getComputedStyle(el);
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') return true;
    }
    el = el.parentElement;
  }
  return false;
}

/**
 * Sahifalar orasida swipe navigatsiya.
 * useLocation() ISHLATMAYDI — re-render qilmaydi!
 */
export function useSwipeNavigation() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const touchState = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    direction: 'horizontal' | 'vertical' | null;
    swiping: boolean;
  } | null>(null);

  const getVisibleRoutes = useCallback(() => {
    const items = useNavSettingsStore.getState().items;
    const user = useAuthStore.getState().user;
    if (!user) return [];
    return items
      .filter((item) => NAV_ROUTES[item.key] && item.visible)
      .map((item) => NAV_ROUTES[item.key]!);
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (shouldIgnoreTarget(e.target as HTMLElement)) return;
    touchState.current = {
      startX: e.touches[0]!.clientX,
      startY: e.touches[0]!.clientY,
      startTime: Date.now(),
      direction: null,
      swiping: false,
    };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const state = touchState.current;
    if (!state) return;

    const dx = e.touches[0]!.clientX - state.startX;
    const dy = e.touches[0]!.clientY - state.startY;

    if (!state.direction) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        state.direction = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
        if (state.direction === 'vertical') { touchState.current = null; return; }
      } else return;
    }

    if (state.direction !== 'horizontal') return;
    state.swiping = true;

    if (containerRef.current) {
      const damped = dx * 0.3;
      containerRef.current.style.transform = `translateX(${damped}px)`;
      containerRef.current.style.transition = 'none';
      containerRef.current.style.opacity = `${1 - Math.abs(damped) / 500}`;
    }
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const state = touchState.current;
      if (!state || !state.swiping) { touchState.current = null; return; }
      touchState.current = null;

      const dx = e.changedTouches[0]!.clientX - state.startX;
      const absX = Math.abs(dx);
      const velocity = absX / (Date.now() - state.startTime);

      // Reset vizual
      if (containerRef.current) {
        containerRef.current.style.transform = '';
        containerRef.current.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
        containerRef.current.style.opacity = '';
      }

      if (absX < SWIPE_THRESHOLD && !(velocity > 0.5 && absX > 30)) return;

      const pathname = window.location.pathname;

      if (dx > 0) {
        // SWIPE RIGHT → oldingi tab yoki parent
        const parent = getParentRoute(pathname);
        if (parent && !isMainPage(pathname)) { navigate({ to: parent }); return; }
        const routes = getVisibleRoutes();
        const idx = routes.indexOf(pathname);
        if (idx > 0) navigate({ to: routes[idx - 1] });
      } else {
        // SWIPE LEFT → keyingi tab
        if (!isMainPage(pathname)) return;
        const routes = getVisibleRoutes();
        const idx = routes.indexOf(pathname);
        if (idx >= 0 && idx < routes.length - 1) navigate({ to: routes[idx + 1] });
      }
    },
    [navigate, getVisibleRoutes],
  );

  return {
    containerRef,
    swipeHandlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
