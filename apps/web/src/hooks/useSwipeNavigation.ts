import { useRef, useCallback } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
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
const SWIPE_THRESHOLD = 70; // px

/* ─── Yordamchi funksiyalar ─── */

/** Detail page uchun parent route'ni aniqlash */
function getParentRoute(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  // /products/123 → /products
  // /suppliers/123/import → /suppliers/123
  if (segments.length >= 2) {
    return '/' + segments.slice(0, -1).join('/');
  }
  return null;
}

/** Bu asosiy (top-level) sahifami? */
function isMainPage(pathname: string): boolean {
  return MAIN_ROUTES.has(pathname);
}

/** Touch event'ni e'tiborsiz qoldirishimiz kerakmi? */
function shouldIgnoreTarget(target: HTMLElement): boolean {
  let el: HTMLElement | null = target;
  while (el && el !== document.body) {
    // data-no-swipe atributi
    if (el.dataset?.noSwipe !== undefined) return true;
    // Form elementlari
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'CANVAS' || tag === 'SELECT') return true;
    if (el.getAttribute('role') === 'slider') return true;
    if (el.getAttribute('contenteditable') === 'true') return true;
    // Modal / overlay — o'z swipe handler'i bor
    if (el.dataset?.swipeOverlay !== undefined) return true;
    // Horizontal scroll elementlari (masalan, nav tabs)
    if (el.scrollWidth > el.clientWidth + 5 && el.clientWidth > 0) {
      const style = window.getComputedStyle(el);
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') return true;
    }
    el = el.parentElement;
  }
  return false;
}

/* ─── Hook ─── */
export function useSwipeNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  const touchState = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    direction: 'horizontal' | 'vertical' | null;
    swiping: boolean;
  } | null>(null);

  /** Ko'rinadigan nav route'larni olish */
  const getVisibleRoutes = useCallback(() => {
    const items = useNavSettingsStore.getState().items;
    const user = useAuthStore.getState().user;
    if (!user) return [];
    return items
      .filter((item) => {
        const route = NAV_ROUTES[item.key];
        if (!route || !item.visible) return false;
        // role tekshirish — NAV_META'dagi roles bilan sync bo'lishi kerak
        // lekin bu yerda sodda qilamiz, faqat visible elementlarni olamiz
        return true;
      })
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

    const currentX = e.touches[0]!.clientX;
    const currentY = e.touches[0]!.clientY;
    const deltaX = currentX - state.startX;
    const deltaY = currentY - state.startY;

    // Birinchi muhim harakatda yo'nalishni aniqlash
    if (!state.direction) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        state.direction = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
        if (state.direction === 'vertical') {
          touchState.current = null; // Normal scroll
          return;
        }
      } else {
        return;
      }
    }

    if (state.direction !== 'horizontal') return;
    state.swiping = true;

    // Vizual feedback — kontent barmaq bilan birga harakatlanadi
    if (containerRef.current) {
      const damped = deltaX * 0.3;
      containerRef.current.style.transform = `translateX(${damped}px)`;
      containerRef.current.style.transition = 'none';
      containerRef.current.style.opacity = `${1 - Math.abs(damped) / 500}`;
    }
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const state = touchState.current;
      if (!state || !state.swiping) {
        touchState.current = null;
        return;
      }
      touchState.current = null;

      const endX = e.changedTouches[0]!.clientX;
      const deltaX = endX - state.startX;
      const absX = Math.abs(deltaX);
      const elapsed = Date.now() - state.startTime;
      const velocity = absX / elapsed;

      // Reset vizual
      if (containerRef.current) {
        containerRef.current.style.transform = '';
        containerRef.current.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
        containerRef.current.style.opacity = '';
      }

      // Swipe yetarlimi?
      const isValidSwipe = absX >= SWIPE_THRESHOLD || (velocity > 0.5 && absX > 30);
      if (!isValidSwipe) return;

      const pathname = location.pathname;

      if (deltaX > 0) {
        // SWIPE RIGHT → oldingi tab yoki parent page'ga
        const parent = getParentRoute(pathname);
        if (parent && !isMainPage(pathname)) {
          navigate({ to: parent });
          return;
        }
        const routes = getVisibleRoutes();
        const idx = routes.indexOf(pathname);
        if (idx > 0) {
          navigate({ to: routes[idx - 1] });
        }
      } else {
        // SWIPE LEFT → keyingi tab
        if (!isMainPage(pathname)) return; // Detail page'larda faqat orqaga
        const routes = getVisibleRoutes();
        const idx = routes.indexOf(pathname);
        if (idx >= 0 && idx < routes.length - 1) {
          navigate({ to: routes[idx + 1] });
        }
      }
    },
    [location.pathname, navigate, getVisibleRoutes],
  );

  return {
    containerRef,
    swipeHandlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
