import { useEffect } from 'react';
import { Link, useMatchRoute, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { useNavSettingsStore } from '@/stores/navSettings';
import { NAV_META } from './MobileTopNav';

export function MobileSidebar() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { mobileSidebarOpen, setMobileSidebarOpen } = useUiStore();
  const matchRoute = useMatchRoute();
  const location = useLocation();
  const navItems = useNavSettingsStore((s) => s.items);

  // Route o'zgarganda yopish
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname, setMobileSidebarOpen]);

  // Body scroll lock
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [mobileSidebarOpen]);

  const visibleItems = navItems.filter((item) => {
    const meta = NAV_META[item.key];
    return meta && user && meta.roles.includes(user.role);
  });

  if (!mobileSidebarOpen) return null;

  return (
    <div className="sm:hidden fixed inset-0 z-40">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        style={{ WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)' }}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Drawer */}
      <aside
        className="absolute inset-y-0 left-0 w-72 bg-sidebar flex flex-col shadow-xl"
        style={{ animation: 'slideInLeft 0.25s ease-out' }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-5 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-white text-sm font-bold shadow-sm">
            SF
          </div>
          <div>
            <p className="text-[15px] font-bold text-white tracking-tight leading-none">Sardorbek</p>
            <p className="text-[11px] text-sidebar-text mt-1">Furnitura</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {visibleItems.map((item) => {
            const meta = NAV_META[item.key];
            if (!meta) return null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isActive = matchRoute({ to: meta.to as any, fuzzy: meta.to !== '/' });
            const Icon = meta.icon;

            return (
              <Link
                key={item.key}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                to={meta.to as any}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary-500/20 text-white'
                    : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white',
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-primary-400' : '')} />
                <span>{t(`nav.${item.key}`)}</span>
                {isActive && (
                  <div className="ml-auto h-2 w-2 rounded-full bg-primary-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="shrink-0 border-t border-sidebar-border p-4 space-y-3">
          {user && (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/20 text-sm font-bold text-primary-300">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                <p className="text-[11px] text-sidebar-text">{user.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => { setMobileSidebarOpen(false); logout(); window.location.href = '/login'; }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-[14px] font-medium text-danger-400 hover:bg-danger-500/10 transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>{t('auth.logout')}</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
