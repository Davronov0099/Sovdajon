import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Plus, Truck, CheckCircle, Package, XCircle, Clock } from 'lucide-react';
import { formatCurrency, formatDate } from '@sardorbek/shared';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/common/SearchInput';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrders, useCreateOrder, useUpdateOrderStatus, useDeleteOrder } from '@/hooks/useOrders';
import { useProducts } from '@/hooks/useProducts';
import { useToast } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/cn';
import type { OrderItem, OrderStatusType } from '@/types/api';

const STATUS_CONFIG: Record<OrderStatusType, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: 'Kutilmoqda', color: 'bg-warning-50 text-warning-700', icon: Clock },
  CONFIRMED: { label: 'Tasdiqlangan', color: 'bg-info-50 text-info-700', icon: CheckCircle },
  SHIPPED: { label: "Jo'natilgan", color: 'bg-primary-50 text-primary-700', icon: Truck },
  DELIVERED: { label: 'Yetkazilgan', color: 'bg-success-50 text-success-700', icon: Package },
  CANCELLED: { label: 'Bekor', color: 'bg-danger-50 text-danger-700', icon: XCircle },
};

const NEXT_STATUS: Partial<Record<OrderStatusType, OrderStatusType>> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'SHIPPED',
  SHIPPED: 'DELIVERED',
};

export function OrdersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; number: number } | null>(null);

  // Create form
  const [items, setItems] = useState<{ productId: string; productName: string; quantity: number; unitPrice: number }[]>([]);
  const [note, setNote] = useState('');
  const [productSearch, setProductSearch] = useState('');

  const { data, isLoading } = useOrders({ search, status: statusFilter || undefined, page });
  const { data: productsData } = useProducts({ search: productSearch, limit: 20 });
  const createMut = useCreateOrder();
  const updateStatusMut = useUpdateOrderStatus();
  const deleteMut = useDeleteOrder();

  const orders: OrderItem[] = data?.data ?? [];
  const pagination = data?.pagination;
  const products = productsData?.data ?? [];

  function addItem(product: { id: string; name: string; price: string | number }) {
    if (items.some((i) => i.productId === product.id)) return;
    setItems([...items, { productId: product.id, productName: product.name, quantity: 1, unitPrice: Number(product.price) }]);
    setProductSearch('');
  }

  const handleCreate = useCallback(async () => {
    if (items.length === 0) {
      toast('Kamida 1 ta mahsulot qo\'shing', 'error');
      return;
    }
    try {
      await createMut.mutateAsync({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
        note: note || undefined,
      });
      toast('Buyurtma yaratildi', 'success');
      setCreateOpen(false);
      setItems([]);
      setNote('');
    } catch {
      toast('Buyurtma yaratish xatosi', 'error');
    }
  }, [items, note, createMut, toast]);

  async function handleStatusChange(id: string, status: OrderStatusType) {
    try {
      await updateStatusMut.mutateAsync({ id, status });
      toast(`Status: ${STATUS_CONFIG[status].label}`, 'success');
    } catch {
      toast('Status o\'zgartirish xatosi', 'error');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast('Buyurtma o\'chirildi', 'success');
    } catch {
      toast('O\'chirish xatosi', 'error');
    }
    setDeleteTarget(null);
  }

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{t('nav.orders')}</h1>
          <p className="text-sm text-text-muted mt-0.5">Buyurtmalar boshqaruvi</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn btn-primary btn-md">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Yangi buyurtma
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Buyurtma raqami..." className="w-full sm:w-72" />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input w-auto" aria-label="Status filter" style={{ minWidth: '160px' }}>
          <option value="">Barcha status</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <ClipboardList className="mb-4 h-16 w-16" />
          <p className="text-lg font-medium">{t('common.noData')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const config = STATUS_CONFIG[order.status];
            const StatusIcon = config.icon;
            const nextStatus = NEXT_STATUS[order.status];

            return (
              <div key={order.id} className="rounded-xl border border-border bg-surface p-4 transition-shadow hover:shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-text-primary">#{order.number}</h3>
                      <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', config.color)}>
                        <StatusIcon className="h-3 w-3" aria-hidden="true" />
                        {config.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-text-muted">{order.items.length} ta mahsulot | {formatDate(order.createdAt)}</p>
                    {order.note && <p className="mt-1 text-xs text-text-muted">{order.note}</p>}
                  </div>
                  <p className="text-lg font-bold text-text-primary">{formatCurrency(Number(order.total))}</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                  {nextStatus && (
                    <Button size="sm" onClick={() => handleStatusChange(order.id, nextStatus)} loading={updateStatusMut.isPending}>
                      {STATUS_CONFIG[nextStatus].label}
                    </Button>
                  )}
                  {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(order.id, 'CANCELLED')}>
                      Bekor qilish
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setDeleteTarget({ id: order.id, number: order.number })}>
                    O'chirish
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Oldingi</Button>
          <span className="text-sm text-text-muted">{page} / {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Keyingi</Button>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Yangi buyurtma" size="md">
        <div className="space-y-4">
          <div>
            <SearchInput value={productSearch} onChange={setProductSearch} placeholder="Mahsulot qidirish..." className="w-full" />
            {productSearch && products.length > 0 && (
              <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-border">
                {products.map((p) => (
                  <button key={p.id} type="button" onClick={() => addItem(p)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-secondary">
                    <span>{p.name}</span>
                    <span className="text-text-muted">{formatCurrency(Number(p.price))}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[400px] text-sm">
                <thead><tr className="border-b border-border bg-surface-secondary"><th className="px-3 py-2 text-left">Mahsulot</th><th className="px-3 py-2 w-20">Soni</th><th className="px-3 py-2 text-right">Narx</th></tr></thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.productId} className="border-b border-border/50">
                      <td className="px-3 py-2">{item.productName}</td>
                      <td className="px-3 py-2"><input type="number" min={1} value={item.quantity} onChange={(e) => { const newItems = [...items]; newItems[i] = { ...item, quantity: Math.max(1, Number(e.target.value)) }; setItems(newItems); }} className="w-full rounded border border-border px-2 py-1 text-sm" /></td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.quantity * item.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="bg-surface-secondary"><td colSpan={2} className="px-3 py-2 font-medium">Jami</td><td className="px-3 py-2 text-right font-bold">{formatCurrency(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0))}</td></tr></tfoot>
              </table>
            </div>
          )}

          <Input id="order-note" label="Izoh (ixtiyoriy)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createMut.isPending}>{t('common.cancel')}</Button>
            <Button onClick={handleCreate} loading={createMut.isPending} disabled={items.length === 0}>{t('common.create')}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Buyurtma o'chirish" description={`#${deleteTarget?.number} buyurtmani o'chirmoqchimisiz?`} confirmText="O'chirish" variant="danger" loading={deleteMut.isPending} />
    </div>
  );
}
