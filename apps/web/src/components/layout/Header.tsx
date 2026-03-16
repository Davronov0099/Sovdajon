import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Bell, ChevronsRight, User, LogOut, Maximize, Minimize } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

export function Header() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { sidebarOpen, toggleSidebar, toggleCommandPalette } = useUiStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // Sync state when user presses Esc to exit fullscreen
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [dropdownOpen]);

  return (
    <header
      className="sticky top-0 z-20 flex h-16 items-center justify-between bg-surface px-4 sm:px-6"
      style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
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

        {/* Search */}
        <button
          onClick={toggleCommandPalette}
          className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-text-muted hover:border-border-strong hover:bg-surface-secondary transition-all"
          aria-label={t('common.search')}
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline text-text-muted">{t('common.search')}...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-surface-tertiary px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
            <span className="text-[9px]">Ctrl</span>K
          </kbd>
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          className="hidden sm:inline-flex items-center justify-center rounded-lg p-2.5 text-text-muted hover:bg-surface-tertiary hover:text-text-primary transition-colors"
          aria-label={isFullscreen ? "To'liq ekrandan chiqish" : "To'liq ekran"}
          title={isFullscreen ? "To'liq ekrandan chiqish (Esc)" : "To'liq ekran"}
        >
          {isFullscreen ? <Minimize className="h-4 w-4" aria-hidden="true" /> : <Maximize className="h-4 w-4" aria-hidden="true" />}
        </button>

        {/* Notifications */}
        <button
          className="inline-flex items-center justify-center rounded-lg p-2.5 text-text-muted hover:bg-surface-tertiary hover:text-text-primary transition-colors"
          aria-label="Bildirishnomalar"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* User dropdown */}
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface-tertiary transition-colors"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-text-primary leading-none">{user.name}</p>
                <p className="text-[10px] text-text-muted mt-0.5">{user.role}</p>
              </div>
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-surface shadow-dropdown animate-scale-in"
                style={{ border: '1px solid var(--color-border)' }}
                role="menu"
              >
                {/* User info */}
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

                {/* Menu items */}
                <div className="py-1.5">
                  <button
                    onClick={() => { setDropdownOpen(false); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-secondary transition-colors"
                    role="menuitem"
                  >
                    <User className="h-4 w-4 text-text-muted" aria-hidden="true" />
                    Profilni tahrirlash
                  </button>
                  <button
                    onClick={() => { logout(); window.location.href = '/login'; }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
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
