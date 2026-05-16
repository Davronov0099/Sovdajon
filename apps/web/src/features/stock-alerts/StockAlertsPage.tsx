import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { AlertTriangle, Package, ChevronRight, TrendingDown, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { useLowStockProducts, type LowStockProduct } from '@/hooks/useProducts';
import { cn } from '@/lib/cn';

export function StockAlertsPage() {
  const { data, isLoading } = useLowStockProducts(500);
  const products: LowStockProduct[] = useMemo(() => data?.data ?? [], [data]);

  const outOfStock = products.filter((p) => p.stock === 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStock);

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Stock ogohlantirishlar</h1>
        <p className="text-sm text-text-muted mt-0.5">Do'kondagi (savdo zali) zaxira holatini kuzatish</p>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3">
        <div className="stat-card">
          <p className="stat-label text-[10px] sm:text-xs">Jami ogohlantirish</p>
          <p className="stat-value text-sm sm:text-lg tabular-nums">{products.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label text-[10px] sm:text-xs">Tugagan</p>
          <p className="stat-value text-sm sm:text-lg text-danger-600 tabular-nums">{outOfStock.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label text-[10px] sm:text-xs">Kam qolgan</p>
          <p className="stat-value text-sm sm:text-lg text-warning-600 tabular-nums">{lowStock.length}</p>
        </div>
      </div>

      {/* Loading / Empty / List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <CheckCircle2 className="mb-4 h-14 w-14 text-success-500 opacity-50" />
          <p className="text-base font-medium text-text-primary">Hammasi joyida!</p>
          <p className="text-xs mt-1">Hech qaysi mahsulot kam emas</p>
        </div>
      ) : (
        <>
          {outOfStock.length > 0 && (
            <Section
              title="Tugagan mahsulotlar"
              count={outOfStock.length}
              tone="danger"
              icon={<TrendingDown className="h-4 w-4" />}
              items={outOfStock}
            />
          )}
          {lowStock.length > 0 && (
            <Section
              title="Kam qolgan mahsulotlar"
              count={lowStock.length}
              tone="warning"
              icon={<AlertTriangle className="h-4 w-4" />}
              items={lowStock}
            />
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title, count, tone, icon, items,
}: {
  title: string;
  count: number;
  tone: 'danger' | 'warning';
  icon: React.ReactNode;
  items: LowStockProduct[];
}) {
  const tones = {
    danger:  { iconBg: 'bg-danger-100',  iconText: 'text-danger-600',  badge: 'bg-danger-50 text-danger-700' },
    warning: { iconBg: 'bg-warning-100', iconText: 'text-warning-600', badge: 'bg-warning-50 text-warning-700' },
  }[tone];

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', tones.iconBg, tones.iconText)}>
          {icon}
        </div>
        <h2 className="text-sm font-bold text-text-primary">{title}</h2>
        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', tones.badge)}>{count}</span>
      </div>
      <div className="space-y-1.5">
        {items.map((p) => <ProductRow key={p.id} product={p} tone={tone} />)}
      </div>
    </div>
  );
}

function ProductRow({ product: p, tone }: { product: LowStockProduct; tone: 'danger' | 'warning' }) {
  const hasImage = p.images && p.images.length > 0 && p.images[0];
  const stockColor = p.stock === 0 ? 'text-danger-600' : 'text-warning-600';
  const ratio = p.minStock > 0 ? Math.min(100, (p.stock / p.minStock) * 100) : 0;
  const barColor = p.stock === 0 ? 'bg-danger-500' : 'bg-warning-500';

  return (
    <Link
      to="/products/$productId"
      params={{ productId: p.id }}
      className="card group flex items-center gap-3 p-3 hover:shadow-card-hover transition-all"
    >
      <div className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-lg bg-surface-tertiary/50 overflow-hidden">
        {hasImage ? (
          <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-5 w-5 text-text-muted/30" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {p.code != null && (
            <span className="text-[10px] font-bold text-text-muted tabular-nums">#{p.code}</span>
          )}
          <p className="text-sm font-semibold text-text-primary truncate group-hover:text-primary-600 transition-colors">{p.name}</p>
        </div>
        <p className="text-[11px] text-text-muted mt-0.5 truncate">{p.category.name}</p>
        {/* Progress bar */}
        <div className="mt-1.5 h-1 w-full rounded-full bg-surface-tertiary overflow-hidden max-w-[200px]">
          <div className={cn('h-full transition-all', barColor)} style={{ width: `${ratio}%` }} />
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className={cn('text-sm font-bold tabular-nums', stockColor)}>
          {p.stock} / {p.minStock}
        </p>
        <p className="text-[10px] text-text-muted">{p.unit}</p>
      </div>

      <ChevronRight className="h-4 w-4 text-text-muted/40 shrink-0 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
