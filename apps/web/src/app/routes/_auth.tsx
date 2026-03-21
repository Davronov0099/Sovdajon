import { Suspense, useEffect } from 'react';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { useUsdRateStore } from '@/stores/usdRate';
import { useCurrencyRate } from '@/hooks/useSettings';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileTopNav } from '@/components/layout/MobileTopNav';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { CommandPalette } from '@/components/common/CommandPalette';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';

import { cn } from '@/lib/cn';

export const Route = createFileRoute('/_auth')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const { containerRef, swipeHandlers } = useSwipeNavigation();

  // Sync currency rate from API to zustand store on app init
  const { data: currencyData } = useCurrencyRate();
  useEffect(() => {
    if (currencyData?.data?.rate) {
      useUsdRateStore.getState().setRate(currencyData.data.rate);
    }
  }, [currencyData]);

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Desktop sidebar */}
      <div className="hidden sm:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <main
        className={cn(
          'min-h-screen transition-all duration-200',
          sidebarOpen ? 'sm:ml-64' : 'sm:ml-[72px]',
        )}
      >
        {/* Mobile: Nav birinchi (top), keyin Header */}
        <MobileTopNav />
        <Header />

        {/* Swipe navigation wrapper — faqat mobilda ishlaydi */}
        <div
          ref={containerRef}
          {...swipeHandlers}
          className="sm:pointer-events-auto"
        >
          <Suspense fallback={
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-200 border-t-primary-600" />
            </div>
          }>
            <Outlet />
          </Suspense>
        </div>
      </main>

      {/* Mobile sidebar drawer */}
      <MobileSidebar />

      {/* Global overlays */}
      <CommandPalette />

    </div>
  );
}
