import { Link, useMatchRoute } from '@tanstack/react-router';
import { LayoutDashboard, ShoppingCart, Package, CreditCard, Truck, Receipt } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/cn';

const MOBILE_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Bosh', roles: ['ADMIN'] },
  { to: '/pos', icon: ShoppingCart, label: 'Savdo', roles: ['ADMIN', 'CASHIER'] },
  { to: '/products', icon: Package, label: 'Mahsulot', roles: ['ADMIN', 'CASHIER', 'HELPER'] },
  { to: '/debts', icon: CreditCard, label: 'Qarz', roles: ['ADMIN', 'CASHIER'] },
  { to: '/suppliers', icon: Truck, label: "Ta'minot", roles: ['ADMIN'] },
  { to: '/expenses', icon: Receipt, label: 'Xarajat', roles: ['ADMIN'] },
] as const;

export function MobileBottomNav() {
  const user = useAuthStore((s) => s.user);
  const matchRoute = useMatchRoute();

  const items = MOBILE_NAV.filter(
    (item) => user && (item.roles as readonly string[]).includes(user.role),
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 bg-surface sm:hidden"
      style={{
        borderTop: '1px solid var(--color-border-subtle)',
        height: 'var(--bottom-nav-height)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex h-full items-center justify-around">
        {items.map((item) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const isActive = matchRoute({ to: item.to as any, fuzzy: item.to !== '/' });
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              to={item.to as any}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                isActive ? 'text-primary-600' : 'text-text-muted',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={cn('h-5 w-5', isActive && 'text-primary-500')} />
              <span>{item.label}</span>
              {isActive && <span className="h-0.5 w-4 rounded-full bg-primary-500 mt-0.5" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
