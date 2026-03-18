import { Link, useMatchRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { LogOut, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { useNavSettingsStore } from '@/stores/navSettings';
import { NAV_META } from './MobileTopNav';

export function Sidebar() {
  const { t } = useTranslation();
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const matchRoute = useMatchRoute();
  const navItems = useNavSettingsStore((s) => s.items);

  const visibleItems = useMemo(() => {
    if (!user) return [];
    return navItems.filter((item) => {
      const meta = NAV_META[item.key];
      return meta && item.visible && meta.roles.includes(user.role);
    });
  }, [user, navItems]);

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col bg-sidebar transition-all duration-200',
        sidebarOpen ? 'w-64' : 'w-[72px]',
      )}
    >
      {/* Header — Logo + Collapse */}
      <div className={cn(
        'flex h-16 items-center shrink-0',
        sidebarOpen ? 'justify-between px-5' : 'justify-center px-2',
      )}>
        {sidebarOpen ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500 text-white text-sm font-bold shadow-sm">
              SF
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-tight leading-none">Sardorbek</p>
              <p className="text-[10px] text-sidebar-text mt-0.5">Furnitura</p>
            </div>
          </div>
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500 text-white text-sm font-bold">
            SF
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            'rounded-md p-1.5 text-sidebar-text hover:text-white hover:bg-sidebar-hover transition-colors',
            !sidebarOpen && 'hidden',
          )}
          aria-label="Toggle sidebar"
          style={{ minHeight: 'auto', minWidth: 'auto' }}
        >
          {sidebarOpen ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation — foydalanuvchi sozlagan tartibda */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
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
                'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
                sidebarOpen ? '' : 'justify-center',
                isActive
                  ? 'bg-sidebar-active text-white shadow-sm border-l-2 border-primary-400 ml-0 pl-[10px]'
                  : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white border-l-2 border-transparent ml-0 pl-[10px]',
              )}
              aria-current={isActive ? 'page' : undefined}
              title={!sidebarOpen ? t(`nav.${item.key}`) : undefined}
            >
              <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-primary-400')} />
              {sidebarOpen && <span>{t(`nav.${item.key}`)}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Info + Logout */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        {sidebarOpen && user ? (
          <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/20 text-xs font-bold text-primary-300">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="text-[10px] text-sidebar-text">{user.role}</p>
            </div>
          </div>
        ) : null}
        <button
          onClick={() => { logout(); window.location.href = '/login'; }}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-danger-500 hover:bg-danger-500/10 transition-colors',
            !sidebarOpen && 'justify-center',
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {sidebarOpen && <span>{t('auth.logout')}</span>}
        </button>
      </div>
    </aside>
  );
}
