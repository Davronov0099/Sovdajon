import { Suspense } from 'react';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { CommandPalette } from '@/components/common/CommandPalette';
import { FloatingCalculator } from '@/components/calculator/FloatingCalculator';
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

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Desktop sidebar */}
      <div className="hidden sm:block">
        <Sidebar />
      </div>

      {/* Main content — shifts based on sidebar width */}
      <main
        className={cn(
          'min-h-screen transition-all duration-200',
          'pb-[var(--bottom-nav-height)] sm:pb-0',
          sidebarOpen ? 'sm:ml-64' : 'sm:ml-[72px]',
        )}
      >
        <Header />
        <Suspense fallback={
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-200 border-t-primary-600" />
          </div>
        }>
          <Outlet />
        </Suspense>
      </main>

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* Global overlays */}
      <CommandPalette />
      <FloatingCalculator />
    </div>
  );
}
