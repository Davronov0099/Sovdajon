import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useMatchRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, ShoppingCart, Package, FolderTree,
  CreditCard, Users, Truck, Receipt, UserCog, Settings,
  SlidersHorizontal, GripVertical, Eye, EyeOff, RotateCcw, X,
  ScanBarcode, Map, Warehouse, ShoppingBag, AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useNavSettingsStore } from '@/stores/navSettings';
import { cn } from '@/lib/cn';

/* ─── Nav item ma'lumotlari ─── */
const NAV_META: Record<string, { to: string; icon: typeof LayoutDashboard; roles: string[] }> = {
  dashboard: { to: '/', icon: LayoutDashboard, roles: ['ADMIN'] },
  pos: { to: '/pos', icon: ShoppingCart, roles: ['ADMIN', 'CASHIER'] },
  products: { to: '/products', icon: Package, roles: ['ADMIN', 'CASHIER', 'HELPER'] },
  categories: { to: '/categories', icon: FolderTree, roles: ['ADMIN'] },
  debts: { to: '/debts', icon: CreditCard, roles: ['ADMIN', 'CASHIER'] },
  customers: { to: '/customers', icon: Users, roles: ['ADMIN', 'CASHIER'] },
  prospecting: { to: '/prospecting', icon: Map, roles: ['ADMIN', 'CASHIER'] },
  suppliers: { to: '/suppliers', icon: Truck, roles: ['ADMIN'] },
  expenses: { to: '/expenses', icon: Receipt, roles: ['ADMIN'] },
  hr: { to: '/hr', icon: UserCog, roles: ['ADMIN'] },
  settings: { to: '/settings', icon: Settings, roles: ['ADMIN'] },
  helper: { to: '/helper', icon: ScanBarcode, roles: ['ADMIN', 'HELPER'] },
  warehouses: { to: '/warehouses', icon: Warehouse, roles: ['ADMIN'] },
  orders: { to: '/orders', icon: ShoppingBag, roles: ['ADMIN', 'CASHIER', 'HELPER'] },
  receipts: { to: '/receipts', icon: Receipt, roles: ['ADMIN', 'CASHIER'] },
  'stock-alerts': { to: '/stock-alerts', icon: AlertTriangle, roles: ['ADMIN', 'CASHIER', 'HELPER'] },
};

export { NAV_META };

/* ─── Sozlash paneli ─── */
function NavSettingsPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { items, toggleVisible, moveItem, resetToDefault } = useNavSettingsStore();
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Faqat user roli bo'yicha ko'rsatiladigan elementlar
  const filteredItems = items.filter((item) => {
    const meta = NAV_META[item.key];
    return meta && user && meta.roles.includes(user.role);
  });

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      // items ichidagi haqiqiy index'larni topish
      const fromKey = filteredItems[dragItem.current]?.key;
      const toKey = filteredItems[dragOverItem.current]?.key;
      if (fromKey && toKey) {
        const fromIdx = items.findIndex((i) => i.key === fromKey);
        const toIdx = items.findIndex((i) => i.key === toKey);
        if (fromIdx !== -1 && toIdx !== -1) moveItem(fromIdx, toIdx);
      }
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // Touch drag support
  const touchStartY = useRef(0);
  const touchStartIdx = useRef<number | null>(null);

  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    touchStartIdx.current = index;
    touchStartY.current = e.touches[0]!.clientY;
  };

  const handleTouchEnd = (_index: number, e: React.TouchEvent) => {
    if (touchStartIdx.current === null) return;
    const deltaY = e.changedTouches[0]!.clientY - touchStartY.current;
    const itemHeight = 52; // approx height of each item
    const steps = Math.round(deltaY / itemHeight);
    if (steps !== 0) {
      const fromKey = filteredItems[touchStartIdx.current]?.key;
      const targetIdx = Math.max(0, Math.min(filteredItems.length - 1, touchStartIdx.current + steps));
      const toKey = filteredItems[targetIdx]?.key;
      if (fromKey && toKey && fromKey !== toKey) {
        const fromI = items.findIndex((i) => i.key === fromKey);
        const toI = items.findIndex((i) => i.key === toKey);
        if (fromI !== -1 && toI !== -1) moveItem(fromI, toI);
      }
    }
    touchStartIdx.current = null;
  };

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 animate-fade-in" data-no-swipe style={{ WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)' }}>
      <div
        ref={panelRef}
        className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-hidden rounded-t-2xl bg-surface shadow-dropdown animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div>
            <h3 className="text-base font-bold text-text-primary">Navigatsiya sozlamalari</h3>
            <p className="text-xs text-text-muted mt-0.5">Tartibni o'zgartiring va ko'rinishni tanlang</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { resetToDefault(); }}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-secondary transition-colors"
              style={{ minHeight: 'auto', minWidth: 'auto' }}
            >
              <RotateCcw className="h-3 w-3" />
              Boshlang'ich
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-lg p-2 text-text-muted hover:bg-surface-secondary transition-colors"
              style={{ minHeight: 'auto', minWidth: 'auto' }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="overflow-y-auto px-4 py-3 space-y-1" style={{ maxHeight: 'calc(80vh - 72px)' }}>
          {filteredItems.map((item, idx) => {
            const meta = NAV_META[item.key];
            if (!meta) return null;
            const Icon = meta.icon;

            return (
              <div
                key={item.key}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                onTouchStart={(e) => handleTouchStart(idx, e)}
                onTouchEnd={(e) => handleTouchEnd(idx, e)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-3 transition-all select-none',
                  item.visible ? 'bg-surface' : 'bg-surface-secondary opacity-50',
                )}
                style={{ border: '1px solid var(--color-border-subtle)', touchAction: 'pan-x' }}
              >
                {/* Drag handle */}
                <div className="cursor-grab text-text-muted/40 active:cursor-grabbing">
                  <GripVertical className="h-4 w-4" />
                </div>

                {/* Icon + label */}
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg shrink-0',
                  item.visible ? 'bg-primary-50 text-primary-600' : 'bg-surface-tertiary text-text-muted',
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className={cn(
                  'flex-1 text-sm font-medium',
                  item.visible ? 'text-text-primary' : 'text-text-muted',
                )}>
                  {t(`nav.${item.key}`)}
                </span>

                {/* Toggle */}
                <button
                  onClick={() => toggleVisible(item.key)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                    item.visible
                      ? 'bg-success-50 text-success-600 hover:bg-success-100'
                      : 'bg-surface-tertiary text-text-muted hover:bg-surface-secondary',
                  )}
                  style={{ minHeight: 'auto', minWidth: 'auto' }}
                >
                  {item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Asosiy MobileTopNav ─── */
export function MobileTopNav() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const matchRoute = useMatchRoute();
  const navItems = useNavSettingsStore((s) => s.items);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Role + visible filter
  const visibleItems = navItems.filter((item) => {
    const meta = NAV_META[item.key];
    return meta && item.visible && user && meta.roles.includes(user.role);
  });

  const handleCloseSettings = useCallback(() => setSettingsOpen(false), []);

  return (
    <>
      <nav
        className="sm:hidden bg-surface overflow-hidden sticky top-0 z-30"
        style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
      >
        <div className="flex items-center overflow-x-auto no-scrollbar px-2 py-1.5 gap-0.5">
          {visibleItems.map((item) => {
            const meta = NAV_META[item.key]!;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isActive = matchRoute({ to: meta.to as any, fuzzy: meta.to !== '/' });
            const Icon = meta.icon;

            return (
              <Link
                key={item.key}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                to={meta.to as any}
                className={cn(
                  'flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors min-w-[52px]',
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-text-muted active:bg-surface-secondary',
                )}
                style={{ minHeight: 'auto', minWidth: 'auto' }}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-white')} />
                <span className="whitespace-nowrap leading-tight">{t(`nav.${item.key}`)}</span>
              </Link>
            );
          })}

          {/* Sozlash tugmasi — har doim oxirda */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium text-text-muted active:bg-surface-secondary min-w-[52px] ml-auto"
            style={{ minHeight: 'auto', minWidth: 'auto' }}
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap leading-tight">Sozlash</span>
          </button>
        </div>
      </nav>

      {settingsOpen && <NavSettingsPanel onClose={handleCloseSettings} />}
    </>
  );
}
