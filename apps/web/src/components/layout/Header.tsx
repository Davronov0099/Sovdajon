import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, ChevronsRight, User, LogOut, Maximize, Minimize, DollarSign, Search, AlertTriangle, Package, TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { useUsdRateStore } from '@/stores/usdRate';
import { useProductStats } from '@/hooks/useProducts';
import { useUpdateCurrencyRate } from '@/hooks/useSettings';
import { useLocation } from '@tanstack/react-router';
import { cn } from '@/lib/cn';

/* ─── Animated Burger Icon ─── */
function BurgerIcon({ open }: { open: boolean }) {
  return (
    <div className="relative h-4 w-5 flex flex-col justify-center gap-[4.5px]">
      <span className={cn(
        'block h-[2px] w-5 rounded-full bg-current transition-all duration-300 origin-center',
        open && 'translate-y-[6.5px] rotate-45',
      )} />
      <span className={cn(
        'block h-[2px] w-5 rounded-full bg-current transition-all duration-300',
        open && 'opacity-0 scale-x-0',
      )} />
      <span className={cn(
        'block h-[2px] w-5 rounded-full bg-current transition-all duration-300 origin-center',
        open && '-translate-y-[6.5px] -rotate-45',
      )} />
    </div>
  );
}

/* ─── Bildirishnomalar paneli ─── */
function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { data: statsData } = useProductStats();
  const stats = statsData?.data;
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const notifications: { icon: typeof AlertTriangle; color: string; bg: string; title: string; desc: string }[] = [];

  if (stats) {
    if (stats.outOfStock > 0) {
      notifications.push({
        icon: Package,
        color: 'text-danger-600',
        bg: 'bg-danger-50',
        title: `${stats.outOfStock} ta mahsulot tugagan`,
        desc: 'Omborda qolmagan mahsulotlar bor',
      });
    }
    if (stats.lowStock > 0) {
      notifications.push({
        icon: TrendingDown,
        color: 'text-warning-600',
        bg: 'bg-warning-50',
        title: `${stats.lowStock} ta mahsulot kam qolgan`,
        desc: 'Minimum miqdordan past',
      });
    }
  }

  if (notifications.length === 0) {
    notifications.push({
      icon: Bell,
      color: 'text-success-600',
      bg: 'bg-success-50',
      title: 'Hammasi joyida',
      desc: 'Hozircha yangi bildirishnoma yo\'q',
    });
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-surface shadow-dropdown animate-scale-in overflow-hidden"
      style={{ border: '1px solid var(--color-border)' }}
    >
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
        <h3 className="text-sm font-bold text-text-primary">Bildirishnomalar</h3>
        <span className="text-[11px] text-text-muted">{notifications.length} ta</span>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {notifications.map((n, i) => {
          const Icon = n.icon;
          return (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-3 hover:bg-surface-secondary transition-colors"
              style={i < notifications.length - 1 ? { borderBottom: '1px solid var(--color-border-subtle)' } : undefined}
            >
              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', n.bg)}>
                <Icon className={cn('h-4 w-4', n.color)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">{n.title}</p>
                <p className="text-xs text-text-muted mt-0.5">{n.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Header ─── */
export function Header() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { sidebarOpen, toggleSidebar, toggleCommandPalette, mobileSidebarOpen, setMobileSidebarOpen } = useUiStore();
  const location = useLocation();
  const isPOS = location.pathname === '/pos';
  const usdRate = useUsdRateStore((s) => s.rate);
  const setUsdRate = useUsdRateStore((s) => s.setRate);
  const currencyMut = useUpdateCurrencyRate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rateEdit, setRateEdit] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: statsData } = useProductStats();
  const stats = statsData?.data;
  const notifCount = (stats?.outOfStock ?? 0) + (stats?.lowStock ?? 0);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    function onFsChange() { setIsFullscreen(!!document.fullscreenElement); }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [dropdownOpen]);

  const handleCloseNotif = useCallback(() => setNotifOpen(false), []);

  return (
    <header
      className="sticky top-0 sm:top-0 z-20 flex h-14 sm:h-16 items-center justify-between bg-surface px-3 sm:px-6"
      style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
    >
      {/* Left side */}
      <div className="flex items-center gap-2">
        {/* Mobile burger */}
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="sm:hidden flex items-center justify-center rounded-lg p-2 text-text-primary hover:bg-surface-tertiary transition-colors"
          aria-label={mobileSidebarOpen ? 'Menyu yopish' : 'Menyu ochish'}
          style={{ minHeight: 'auto', minWidth: 'auto' }}
        >
          <BurgerIcon open={mobileSidebarOpen} />
        </button>

        {/* Desktop sidebar toggle */}
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="hidden sm:flex rounded-lg p-2 text-text-muted hover:bg-surface-tertiary hover:text-text-primary transition-colors"
            aria-label="Open sidebar"
            style={{ minHeight: 'auto', minWidth: 'auto' }}
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        )}

        {/* Desktop search */}
        {!isPOS && (
          <button
            onClick={toggleCommandPalette}
            className="hidden sm:flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-text-muted hover:border-border-strong hover:bg-surface-secondary transition-all"
            aria-label={t('common.search')}
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-text-muted">{t('common.search')}...</span>
            <kbd className="inline-flex items-center gap-0.5 rounded border border-border bg-surface-tertiary px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
              <span className="text-[9px]">Ctrl</span>K
            </kbd>
          </button>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Fullscreen — desktop only */}
        <button
          onClick={toggleFullscreen}
          className="hidden sm:inline-flex items-center justify-center rounded-lg p-2.5 text-text-muted hover:bg-surface-tertiary hover:text-text-primary transition-colors"
          aria-label={isFullscreen ? "To'liq ekrandan chiqish" : "To'liq ekran"}
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>

        {/* USD Rate */}
        <div className="flex items-center gap-1 rounded-lg border border-border px-2 py-1.5">
          <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
          {rateEdit ? (
            <input
              type="number"
              defaultValue={usdRate}
              onBlur={(e) => { const v = Number(e.target.value) || usdRate; setUsdRate(v); currencyMut.mutate(v); setRateEdit(false); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { const v = Number((e.target as HTMLInputElement).value) || usdRate; setUsdRate(v); currencyMut.mutate(v); setRateEdit(false); }
                if (e.key === 'Escape') setRateEdit(false);
              }}
              className="w-16 sm:w-20 bg-transparent text-[13px] font-bold text-text-primary outline-none tabular-nums"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setRateEdit(true)}
              className="text-[13px] font-bold text-text-primary tabular-nums hover:text-primary-600 transition-colors"
              style={{ minHeight: 'auto', minWidth: 'auto' }}
              title="Dollar kursini o'zgartirish"
            >
              {usdRate.toLocaleString()}
            </button>
          )}
          <span className="text-[10px] text-text-muted hidden sm:inline">so'm</span>
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen(!notifOpen); setDropdownOpen(false); }}
            className="relative inline-flex items-center justify-center rounded-lg p-2 sm:p-2.5 text-text-muted hover:bg-surface-tertiary hover:text-text-primary transition-colors"
            aria-label="Bildirishnomalar"
            style={{ minHeight: 'auto', minWidth: 'auto' }}
          >
            <Bell className="h-4 w-4" />
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-600 px-1 text-[9px] font-bold text-white ring-2 ring-surface">
                {notifCount}
              </span>
            )}
          </button>
          {notifOpen && <NotificationsPanel onClose={handleCloseNotif} />}
        </div>

        {/* User avatar */}
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => { setDropdownOpen(!dropdownOpen); setNotifOpen(false); }}
              className="flex items-center gap-2 rounded-lg px-1.5 py-1 sm:px-2 sm:py-1.5 hover:bg-surface-tertiary transition-colors"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-text-primary leading-none">{user.name}</p>
                <p className="text-[10px] text-text-muted mt-0.5">{user.role}</p>
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-surface shadow-dropdown animate-scale-in"
                style={{ border: '1px solid var(--color-border)' }}
                role="menu"
              >
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{user.name}</p>
                      <p className="text-xs text-text-muted">{user.role}</p>
                    </div>
                  </div>
                </div>
                <div className="py-1.5">
                  <button
                    onClick={() => setDropdownOpen(false)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-secondary transition-colors"
                    role="menuitem"
                  >
                    <User className="h-4 w-4 text-text-muted" />
                    Profilni tahrirlash
                  </button>
                  <button
                    onClick={() => { logout(); window.location.href = '/login'; }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4" />
                    Chiqish
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
