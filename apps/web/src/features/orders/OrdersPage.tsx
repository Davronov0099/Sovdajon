import { useState, useMemo } from 'react';
import {
  ShoppingBag, Plus, Search, Package, User, Phone, Calendar, ChevronDown,
  Check, X, Truck, PackageCheck, Clock, Ban, Trash2,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@sardorbek/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrders, useUpdateOrderStatus, useDeleteOrder } from '@/hooks/useOrders';
import { useToast } from '@/components/ui/toast';
import { OrderModal } from './OrderModal';
import { cn } from '@/lib/cn';
import type { OrderEntity, OrderStatusType } from '@/types/api';

type StatusFilter = '' | OrderStatusType;

const STATUS_CONFIG: Record<OrderStatusType, {
  label: string;
  cls: string;
  badgeCls: string;
  icon: typeof Clock;
}> = {
  PENDING:   { label: 'Kutilmoqda',  cls: 'text-warning-700',  badgeCls: 'bg-warning-50 text-warning-700 border-warning-200', icon: Clock },
  CONFIRMED: { label: 'Tasdiqlangan', cls: 'text-info-700',     badgeCls: 'bg-info-50 text-info-700 border-info-200',         icon: Check },
  SHIPPED:   { label: 'Yo\'lda',       cls: 'text-primary-700',  badgeCls: 'bg-primary-50 text-primary-700 border-primary-200', icon: Truck },
  DELIVERED: { label: 'Yetkazildi',   cls: 'text-success-700',  badgeCls: 'bg-success-50 text-success-700 border-success-200', icon: PackageCheck },
  CANCELLED: { label: 'Bekor qilindi',cls: 'text-danger-700',   badgeCls: 'bg-danger-50 text-danger-700 border-danger-200',   icon: Ban },
};

export function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useOrders({ status: statusFilter, search, limit: 100 });
  const orders: OrderEntity[] = useMemo(() => data?.data ?? [], [data]);
  const total = data?.pagination?.total ?? 0;

  // Hisob: har status uchun nechta buyurtma
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, PENDING: 0, CONFIRMED: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0 };
    for (const o of orders) {
      c.all++;
      c[o.status] = (c[o.status] ?? 0) + 1;
    }
    return c;
  }, [orders]);

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Buyurtmalar</h1>
          <p className="text-sm text-text-muted mt-0.5">Mijozlar buyurtmalari va statuslari</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary btn-md">
          <Plus className="h-4 w-4" />
          Yangi buyurtma
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <FilterTab
          label="Barchasi"
          count={total}
          active={statusFilter === ''}
          onClick={() => setStatusFilter('')}
        />
        {(Object.keys(STATUS_CONFIG) as OrderStatusType[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <FilterTab
              key={s}
              label={cfg.label}
              count={counts[s] ?? 0}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              icon={<cfg.icon className="h-3.5 w-3.5" />}
            />
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-3 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buyurtma raqami, mijoz nomi, telefon..."
          className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm placeholder:text-text-muted/50 focus:outline-2 focus:outline-primary-500"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <ShoppingBag className="mb-4 h-14 w-14 opacity-15" />
          <p className="text-base font-medium">Buyurtma topilmadi</p>
          <p className="text-xs mt-1">Yangi buyurtma qo'shing yoki filterni o'zgartiring</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <OrderRow
              key={o.id}
              order={o}
              expanded={expandedId === o.id}
              onToggle={() => setExpandedId((prev) => prev === o.id ? null : o.id)}
            />
          ))}
        </div>
      )}

      <OrderModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

/* ─── Filter tab ─── */
function FilterTab({
  label, count, active, onClick, icon,
}: {
  label: string; count: number; active: boolean; onClick: () => void; icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
        active ? 'bg-primary-600 text-white shadow-sm' : 'bg-surface text-text-secondary hover:bg-surface-secondary',
      )}
      style={!active ? { border: '1px solid var(--color-border)' } : undefined}
    >
      {icon}
      {label}
      <span className={cn('text-[11px] font-bold tabular-nums', active ? 'text-white/80' : 'text-text-muted')}>
        {count}
      </span>
    </button>
  );
}

/* ─── Order row ─── */
function OrderRow({
  order: o,
  expanded,
  onToggle,
}: {
  order: OrderEntity;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { toast } = useToast();
  const updateMut = useUpdateOrderStatus();
  const deleteMut = useDeleteOrder();
  const cfg = STATUS_CONFIG[o.status];
  const totalQty = o.items.reduce((s, i) => s + i.quantity, 0);

  async function handleStatus(next: OrderStatusType) {
    try {
      await updateMut.mutateAsync({ id: o.id, status: next });
      toast(`Buyurtma "${STATUS_CONFIG[next].label}" qilindi`, 'success');
    } catch (err) {
      const msg = (err as { message?: string }).message ?? 'Status yangilash xatoligi';
      toast(msg, 'error');
    }
  }

  async function handleDelete() {
    if (!confirm(`#${o.number} buyurtmani o'chirishni tasdiqlaysizmi?`)) return;
    try {
      await deleteMut.mutateAsync(o.id);
      toast("Buyurtma o'chirildi", 'success');
    } catch (err) {
      const msg = (err as { message?: string }).message ?? "O'chirish xatoligi";
      toast(msg, 'error');
    }
  }

  // Status'ga qarab amallar
  const actions = nextActions(o.status);

  return (
    <div className="card">
      {/* Header — clickable */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-3 sm:p-4 text-left hover:bg-surface-secondary/30 transition-colors"
        style={{ minHeight: 'auto' }}
      >
        {/* Status icon */}
        <div className={cn('flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg', cfg.badgeCls.replace('text-', 'bg-').split(' ')[0])}>
          <cfg.icon className={cn('h-4 w-4 sm:h-5 sm:w-5', cfg.cls)} />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-text-primary">#{o.number}</span>
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded border', cfg.badgeCls)}>
              {cfg.label}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
            {o.customer ? (
              <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                <User className="h-3 w-3 shrink-0" />
                {o.customer.name}
              </span>
            ) : (
              <span className="italic text-text-muted/50">Mijoz tanlanmagan</span>
            )}
            {o.customer?.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3 shrink-0" />
                {o.customer.phone}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Package className="h-3 w-3 shrink-0" />
              {totalQty} ta · {o.items.length} tur
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3 shrink-0" />
              {formatDateTime(o.createdAt)}
            </span>
          </div>
        </div>

        {/* Total + Expand */}
        <div className="text-right shrink-0">
          <p className="text-sm sm:text-base font-bold text-primary-600 tabular-nums">
            {formatCurrency(Number(o.total))}
          </p>
          <ChevronDown className={cn('inline-block h-4 w-4 text-text-muted transition-transform mt-0.5', expanded && 'rotate-180')} />
        </div>
      </button>

      {/* Expanded — items + actions */}
      {expanded && (
        <div className="border-t border-border/30 p-3 sm:p-4 bg-surface-secondary/20">
          {/* Items table */}
          <div className="rounded-lg border border-border/30 overflow-hidden mb-3 bg-surface">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="bg-surface-secondary/60 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  <th className="px-3 py-1.5 text-left">Mahsulot</th>
                  <th className="px-3 py-1.5 text-right w-16">Miqdor</th>
                  <th className="px-3 py-1.5 text-right w-24">Narx</th>
                  <th className="px-3 py-1.5 text-right w-24">Jami</th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((it) => (
                  <tr key={it.id} className="border-t border-border/20">
                    <td className="px-3 py-1.5 text-text-primary truncate max-w-[180px]">{it.product.name}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{it.quantity}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(Number(it.unitPrice))}</td>
                    <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{formatCurrency(Number(it.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Note */}
          {o.note && (
            <p className="text-xs text-text-muted italic mb-3">"{o.note}"</p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {actions.map((a) => (
              <button
                key={a.status}
                onClick={() => handleStatus(a.status)}
                disabled={updateMut.isPending}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40',
                  a.style,
                )}
                style={{ minHeight: 'auto' }}
              >
                <a.icon className="h-3 w-3" />
                {a.label}
              </button>
            ))}
            {o.status === 'PENDING' && (
              <button
                onClick={handleDelete}
                disabled={deleteMut.isPending}
                className="inline-flex items-center gap-1 rounded-md bg-surface px-2.5 py-1 text-xs font-medium text-text-muted hover:bg-danger-50 hover:text-danger-600 transition-colors disabled:opacity-40 ml-auto"
                style={{ border: '1px solid var(--color-border)', minHeight: 'auto' }}
              >
                <Trash2 className="h-3 w-3" />
                O'chirish
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function nextActions(status: OrderStatusType): Array<{ status: OrderStatusType; label: string; icon: typeof Check; style: string }> {
  switch (status) {
    case 'PENDING':
      return [
        { status: 'CONFIRMED', label: 'Tasdiqlash', icon: Check, style: 'bg-info-600 text-white hover:bg-info-700' },
        { status: 'CANCELLED', label: 'Bekor qilish', icon: X, style: 'bg-surface text-danger-600 hover:bg-danger-50 border border-danger-200' },
      ];
    case 'CONFIRMED':
      return [
        { status: 'SHIPPED', label: "Yo'lga chiqarish", icon: Truck, style: 'bg-primary-600 text-white hover:bg-primary-700' },
        { status: 'CANCELLED', label: 'Bekor qilish', icon: X, style: 'bg-surface text-danger-600 hover:bg-danger-50 border border-danger-200' },
      ];
    case 'SHIPPED':
      return [
        { status: 'DELIVERED', label: 'Yetkazildi', icon: PackageCheck, style: 'bg-success-600 text-white hover:bg-success-700' },
      ];
    default:
      return [];
  }
}
