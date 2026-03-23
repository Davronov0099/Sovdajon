import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Search, LayoutDashboard, ShoppingCart, Package, CreditCard, Users, Truck, DollarSign, UserCog, Settings } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { hasPermission } from '@sardorbek/shared';
import type { Role } from '@sardorbek/shared';
import { cn } from '@/lib/cn';

interface CommandItem {
  id: string;
  label: string;
  icon: typeof Search;
  to: string;
  permission?: string;
  keywords: string[];
}

const COMMANDS: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/', permission: 'dashboard:read', keywords: ['statistika', 'hisobot', 'grafik'] },
  { id: 'pos', label: 'Kassa / Sotuv', icon: ShoppingCart, to: '/pos', permission: 'receipt:create', keywords: ['savdo', 'chek', 'pos', 'sotuv'] },
  { id: 'products', label: 'Mahsulotlar', icon: Package, to: '/products', permission: 'product:read', keywords: ['tovar', 'mahsulot', 'stok'] },
  { id: 'debts', label: 'Qarzlar', icon: CreditCard, to: '/debts', permission: 'debt:read', keywords: ['qarz', 'nasiya', 'qarzdor'] },
  { id: 'customers', label: 'Mijozlar', icon: Users, to: '/customers', permission: 'customer:read', keywords: ['mijoz', 'client', 'xaridor'] },
  { id: 'suppliers', label: "Ta'minotchilar", icon: Truck, to: '/suppliers', permission: 'supplier:read', keywords: ['taminotchi', 'yetkazib'] },
  { id: 'expenses', label: 'Xarajatlar', icon: DollarSign, to: '/expenses', permission: 'expense:read', keywords: ['xarajat', 'chiqim'] },
  { id: 'hr', label: 'Xodimlar', icon: UserCog, to: '/hr', permission: 'user:read', keywords: ['xodim', 'oylik', 'davomat', 'ishchi'] },
  { id: 'settings', label: 'Sozlamalar', icon: Settings, to: '/settings', permission: 'settings:read', keywords: ['sozlama', 'settings', 'config'] },
];

export function CommandPalette() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isOpen = useUiStore((s) => s.commandPaletteOpen);
  const toggle = useUiStore((s) => s.toggleCommandPalette);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter commands by role
  const availableCommands = useMemo(() => {
    if (!user) return [];
    return COMMANDS.filter((cmd) => {
      if (!cmd.permission) return true;
      return hasPermission(user.role as Role, cmd.permission as Parameters<typeof hasPermission>[1]);
    });
  }, [user]);

  // Filter by search query
  const filtered = useMemo(() => {
    if (!query) return availableCommands;
    const q = query.toLowerCase();
    return availableCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.keywords.some((kw) => kw.includes(q)),
    );
  }, [query, availableCommands]);

  // Global Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  // Focus input on open + scroll lock
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 50);
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filtered[selectedIndex];
        if (selected) {
          navigate({ to: selected.to });
          toggle();
        }
      } else if (e.key === 'Escape') {
        toggle();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, filtered, selectedIndex, navigate, toggle]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" role="dialog" aria-modal="true" aria-label="Command palette" data-no-swipe>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={toggle} />

      {/* Palette */}
      <div className="relative w-full max-w-lg rounded-xl bg-surface shadow-modal">
        {/* Search */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-5 w-5 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder={`${t('common.search')}... (sahifa, funksiya)`}
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            aria-label="Qidiruv"
          />
          <kbd className="rounded border border-border bg-surface-secondary px-1.5 py-0.5 text-xs text-text-muted">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-auto py-2" role="listbox">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-muted">Natija topilmadi</p>
          ) : (
            filtered.map((cmd, i) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => { navigate({ to: cmd.to }); toggle(); }}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                    i === selectedIndex ? 'bg-primary-50 text-primary-700' : 'text-text-primary hover:bg-surface-secondary',
                  )}
                  role="option"
                  aria-selected={i === selectedIndex}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="font-medium">{cmd.label}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <div className="flex gap-2 text-xs text-text-muted">
            <kbd className="rounded border border-border px-1.5 py-0.5">↑↓</kbd>
            <span>navigatsiya</span>
            <kbd className="ml-2 rounded border border-border px-1.5 py-0.5">Enter</kbd>
            <span>tanlash</span>
          </div>
        </div>
      </div>
    </div>
  );
}
