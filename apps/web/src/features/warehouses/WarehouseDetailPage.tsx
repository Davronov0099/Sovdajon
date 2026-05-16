import { useState, useMemo, useCallback } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import {
  ArrowLeft, Warehouse, MapPin, Package, ArrowUpFromLine, ArrowLeftRight,
  Search, History, Archive, ArrowDownToLine, Store, ArrowRight,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@sardorbek/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchInput } from '@/components/common/SearchInput';
import {
  useWarehouseDetail,
  useWarehouseProducts,
  useWarehouseMovements,
} from '@/hooks/useWarehouses';
import { IssueModal } from './IssueModal';
import { TransferModal } from './TransferModal';
import { cn } from '@/lib/cn';
import type { WarehouseStockItem, StockMovementItem } from '@/types/api';

type Tab = 'products' | 'movements';

export function WarehouseDetailPage() {
  const { warehouseId } = useParams({ from: '/_auth/warehouses_/$warehouseId' });
  const [tab, setTab] = useState<Tab>('products');
  const [search, setSearch] = useState('');
  const [issueOpen, setIssueOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const { data: warehouseData, isLoading: detailLoading } = useWarehouseDetail(warehouseId);
  const { data: productsData, isLoading: productsLoading } = useWarehouseProducts(warehouseId, {
    search,
    limit: 200,
  });
  const { data: movementsData, isLoading: movementsLoading } = useWarehouseMovements(warehouseId, {
    limit: 50,
  });

  const warehouse = warehouseData?.data;
  const products: WarehouseStockItem[] = useMemo(() => productsData?.data ?? [], [productsData]);
  const movements: StockMovementItem[] = useMemo(() => movementsData?.data ?? [], [movementsData]);

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      {/* Back link */}
      <Link
        to="/warehouses"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors mb-3"
      >
        <ArrowLeft className="h-4 w-4" />
        Omborlar
      </Link>

      {/* Header */}
      {detailLoading ? (
        <Skeleton className="h-20 w-full mb-5" />
      ) : warehouse ? (
        <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
              <Warehouse className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-text-primary truncate">{warehouse.name}</h1>
              {warehouse.address && (
                <p className="flex items-center gap-1 text-xs sm:text-sm text-text-muted mt-0.5">
                  <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                  {warehouse.address}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => setTransferOpen(true)}
              disabled={!warehouse._count?.products}
              className="btn btn-secondary btn-sm disabled:opacity-40"
              title="Boshqa omborga ko'chirish"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ko'chirish</span>
            </button>
            <button
              onClick={() => setIssueOpen(true)}
              disabled={!warehouse._count?.products}
              className="btn btn-primary btn-sm disabled:opacity-40"
              title="Mahsulotlar bo'limiga (do'konga) chiqim"
            >
              <ArrowUpFromLine className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Do'konga chiqim</span>
            </button>
          </div>
        </div>
      ) : (
        <p className="text-text-muted">Ombor topilmadi</p>
      )}

      {/* Stats */}
      {!detailLoading && warehouse && (
        <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="stat-card">
            <p className="stat-label text-[10px] sm:text-xs">Mahsulot turlari</p>
            <p className="stat-value text-sm sm:text-lg tabular-nums">{warehouse._count?.products ?? 0}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label text-[10px] sm:text-xs">Jami zaxira</p>
            <p className="stat-value text-sm sm:text-lg tabular-nums">{warehouse.totalQuantity ?? 0} ta</p>
          </div>
          <div className="stat-card">
            <p className="stat-label text-[10px] sm:text-xs">Jami qiymat</p>
            <p className="stat-value text-sm sm:text-lg tabular-nums">{formatCurrency(warehouse.totalValue ?? 0)}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-1 p-1 bg-surface-secondary rounded-lg w-fit">
        <button
          onClick={() => setTab('products')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            tab === 'products' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary',
          )}
        >
          <Package className="h-3.5 w-3.5" />
          Mahsulotlar
        </button>
        <button
          onClick={() => setTab('movements')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            tab === 'movements' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary',
          )}
        >
          <History className="h-3.5 w-3.5" />
          Harakatlar tarixi
        </button>
      </div>

      {/* Tab content */}
      {tab === 'products' ? (
        <>
          {/* Search */}
          <div className="mb-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Mahsulot qidirish..." className="w-full" />
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton h-[200px] rounded-xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-text-muted">
              <Archive className="mb-4 h-14 w-14 opacity-15" />
              <p className="text-base font-medium">Bu omborda mahsulot yo'q</p>
              <p className="text-xs mt-1">Yetkazib beruvchidan kirim qilib boshlang</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {products.map((s) => (
                <ProductCard key={s.id} stock={s} />
              ))}
            </div>
          )}
        </>
      ) : (
        <MovementsTable movements={movements} loading={movementsLoading} />
      )}

      {/* Modals */}
      {warehouse && (
        <>
          <IssueModal
            open={issueOpen}
            onClose={() => setIssueOpen(false)}
            warehouseId={warehouseId}
            warehouseName={warehouse.name}
          />
          <TransferModal
            open={transferOpen}
            onClose={() => setTransferOpen(false)}
            warehouseId={warehouseId}
            warehouseName={warehouse.name}
          />
        </>
      )}
    </div>
  );
}

/* ─── Product card ─── */
function ProductCard({ stock }: { stock: WarehouseStockItem }) {
  const p = stock.product;
  const hasImage = p.images && p.images.length > 0 && p.images[0];
  const priceNum = Number(p.price);

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-xl bg-surface transition-all duration-150 hover:shadow-card-hover hover:-translate-y-0.5"
      style={{ border: '1px solid var(--color-border-subtle)' }}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-tertiary/50">
        {hasImage ? (
          <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-10 w-10 text-text-muted/15" />
          </div>
        )}
        {p.code != null && (
          <span className="absolute top-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-bold text-white tabular-nums shadow-sm">
            #{p.code}
          </span>
        )}
        <span className="absolute bottom-2 left-2 rounded-md bg-primary-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
          Omborda: {stock.quantity}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-2 sm:px-3 pt-2 pb-2">
        <h3 className="text-[12px] sm:text-[13px] font-semibold text-text-primary leading-snug line-clamp-2">
          {p.name}
        </h3>
        <p className="mt-0.5 text-[10px] sm:text-[11px] text-text-muted truncate">
          {p.category.name}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-sm font-bold text-primary-600 tabular-nums">
            {priceNum > 0 ? formatCurrency(priceNum) : '—'}
          </p>
          <span className="inline-flex items-center gap-0.5 rounded-md bg-surface-secondary px-1.5 py-0.5 text-[10px] text-text-muted">
            <Store className="h-2.5 w-2.5" />
            {p.stock}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Movements table ─── */
function MovementsTable({ movements, loading }: { movements: StockMovementItem[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }
  if (movements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted">
        <History className="mb-4 h-14 w-14 opacity-15" />
        <p className="text-base font-medium">Hali harakat yo'q</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {movements.map((m) => <MovementRow key={m.id} movement={m} />)}
    </div>
  );
}

function MovementRow({ movement: m }: { movement: StockMovementItem }) {
  const cfg = movementConfig(m);
  return (
    <div className="card flex items-center gap-3 p-3">
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', cfg.iconBg)}>
        {cfg.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-text-primary truncate">{m.product.name}</p>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', cfg.badgeCls)}>{cfg.label}</span>
        </div>
        <p className="text-[11px] text-text-muted mt-0.5 truncate">
          {cfg.flowText}
          {m.note && <span className="ml-2 italic">"{m.note}"</span>}
        </p>
        <p className="text-[10px] text-text-muted mt-0.5">{formatDateTime(m.createdAt)}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={cn('text-sm font-bold tabular-nums', cfg.qtyCls)}>{cfg.sign}{m.quantity}</p>
      </div>
    </div>
  );
}

function movementConfig(m: StockMovementItem) {
  const fromName = m.fromWarehouse?.name ?? "Yetkazib beruvchi";
  const toName = m.toWarehouse?.name ?? "Do'kon";

  switch (m.type) {
    case 'IMPORT':
      return {
        icon: <ArrowDownToLine className="h-4 w-4 text-info-600" />,
        iconBg: 'bg-info-50',
        label: 'Kirim',
        badgeCls: 'bg-info-50 text-info-700',
        qtyCls: 'text-success-600',
        sign: '+',
        flowText: `${fromName} → ${toName}`,
      };
    case 'ISSUE_TO_SHOP':
      return {
        icon: <ArrowUpFromLine className="h-4 w-4 text-warning-600" />,
        iconBg: 'bg-warning-50',
        label: "Do'konga chiqim",
        badgeCls: 'bg-warning-50 text-warning-700',
        qtyCls: 'text-warning-600',
        sign: '−',
        flowText: `${fromName} → Do'kon`,
      };
    case 'TRANSFER':
      return {
        icon: <ArrowLeftRight className="h-4 w-4 text-primary-600" />,
        iconBg: 'bg-primary-50',
        label: "Ko'chirildi",
        badgeCls: 'bg-primary-50 text-primary-700',
        qtyCls: 'text-text-primary',
        sign: '',
        flowText: <span className="inline-flex items-center gap-1">{fromName}<ArrowRight className="h-3 w-3 inline" />{toName}</span>,
      };
    case 'SHOP_RETURN':
      return {
        icon: <ArrowDownToLine className="h-4 w-4 text-success-600" />,
        iconBg: 'bg-success-50',
        label: 'Qaytarildi',
        badgeCls: 'bg-success-50 text-success-700',
        qtyCls: 'text-success-600',
        sign: '+',
        flowText: `Do'kon → ${toName}`,
      };
    default:
      return {
        icon: <Package className="h-4 w-4 text-text-muted" />,
        iconBg: 'bg-surface-secondary',
        label: 'Tuzatish',
        badgeCls: 'bg-surface-secondary text-text-muted',
        qtyCls: 'text-text-primary',
        sign: '±',
        flowText: '—',
      };
  }
}
