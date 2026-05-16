import { useState, useCallback } from 'react';
import { Link } from '@tanstack/react-router';
import { Warehouse, Plus, Pencil, Trash2, MapPin, Package, ChevronRight } from 'lucide-react';
import { formatDate } from '@sardorbek/shared';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWarehouses, useCreateWarehouse, useUpdateWarehouse, useDeleteWarehouse } from '@/hooks/useWarehouses';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import type { WarehouseItem } from '@/types/api';

export function WarehousesPage() {
  const { toast } = useToast();
  const { data, isLoading } = useWarehouses();
  const createMut = useCreateWarehouse();
  const updateMut = useUpdateWarehouse();
  const deleteMut = useDeleteWarehouse();

  const warehouses: WarehouseItem[] = data?.data ?? [];

  // Modal holatlari
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseItem | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  function openCreate() {
    setEditing(null);
    setName('');
    setAddress('');
    setModalOpen(true);
  }

  function openEdit(w: WarehouseItem) {
    setEditing(w);
    setName(w.name);
    setAddress(w.address ?? '');
    setModalOpen(true);
  }

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, name: name.trim(), address: address.trim() || undefined });
        toast("Ombor yangilandi", 'success');
      } else {
        await createMut.mutateAsync({ name: name.trim(), address: address.trim() || undefined });
        toast("Ombor yaratildi", 'success');
      }
      setModalOpen(false);
    } catch {
      toast("Xatolik yuz berdi", 'error');
    }
  }, [editing, name, address, createMut, updateMut, toast]);

  const handleDelete = useCallback(async (w: WarehouseItem) => {
    const productCount = w._count?.products ?? 0;
    const confirmMsg = productCount > 0
      ? `"${w.name}" omborida ${productCount} ta mahsulot bor. O'chirilsa mahsulotlar ombordan chiqariladi. Davom etasizmi?`
      : `"${w.name}" omborini o'chirmoqchimisiz?`;
    if (!confirm(confirmMsg)) return;
    try {
      await deleteMut.mutateAsync(w.id);
      toast("Ombor o'chirildi", 'success');
    } catch {
      toast("O'chirishda xatolik", 'error');
    }
  }, [deleteMut, toast]);

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Omborlar</h1>
          <p className="text-sm text-text-muted mt-0.5">Ombor boshqaruvi</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary btn-md">
          <Plus className="h-4 w-4" />
          Yangi ombor
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : warehouses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-text-muted">
          <Warehouse className="h-14 w-14 opacity-15 mb-4" />
          <p className="text-base font-medium">Hali ombor yo'q</p>
          <p className="text-sm mt-1 mb-4">Yangi ombor qo'shib boshlang</p>
          <button onClick={openCreate} className="btn btn-primary btn-sm">
            <Plus className="h-4 w-4" />
            Ombor qo'shish
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {warehouses.map((w) => (
            <WarehouseCard
              key={w.id}
              warehouse={w}
              onEdit={openEdit}
              onDelete={handleDelete}
              deleting={deleteMut.isPending}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Ombor tahrirlash' : 'Yangi ombor'}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            id="wh-name"
            label="Ombor nomi *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masalan: Asosiy ombor"
            autoFocus
          />
          <Input
            id="wh-addr"
            label="Manzil (ixtiyoriy)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Masalan: Toshkent, Yunusobod"
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={isPending}>
              Bekor qilish
            </Button>
            <Button onClick={handleSave} loading={isPending} disabled={!name.trim()}>
              {editing ? 'Saqlash' : "Qo'shish"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Warehouse Card ─── */
function WarehouseCard({
  warehouse: w,
  onEdit,
  onDelete,
  deleting,
}: {
  warehouse: WarehouseItem;
  onEdit: (w: WarehouseItem) => void;
  onDelete: (w: WarehouseItem) => void;
  deleting: boolean;
}) {
  const productCount = w._count?.products ?? 0;

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl bg-surface transition-all',
        'hover:shadow-card-hover hover:-translate-y-0.5',
      )}
      style={{ border: '1px solid var(--color-border-subtle)' }}
    >
      <Link
        to="/warehouses/$warehouseId"
        params={{ warehouseId: w.id }}
        className="flex flex-1 flex-col p-4"
      >
        {/* Icon + Name */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <Warehouse className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-text-primary truncate group-hover:text-primary-600 transition-colors">{w.name}</h3>
            {w.address && (
              <p className="flex items-center gap-1 text-[11px] text-text-muted mt-0.5 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                {w.address}
              </p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-text-muted/40 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-surface-secondary px-2.5 py-1">
            <Package className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-xs font-semibold text-text-primary tabular-nums">{productCount}</span>
            <span className="text-[10px] text-text-muted">mahsulot</span>
          </div>
          <span className="text-[10px] text-text-muted">{formatDate(w.createdAt)}</span>
        </div>
      </Link>

      {/* Actions */}
      <div className="flex gap-1.5 px-2 pb-2 pt-2" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
        <button
          onClick={() => onEdit(w)}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-medium text-text-secondary hover:bg-primary-50 hover:text-primary-600 transition-colors"
          style={{ minHeight: 'auto' }}
        >
          <Pencil className="h-3.5 w-3.5" />
          Tahrirlash
        </button>
        <button
          onClick={() => onDelete(w)}
          disabled={deleting}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-medium text-text-muted hover:bg-danger-50 hover:text-danger-600 transition-colors disabled:opacity-40"
          style={{ minHeight: 'auto' }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          O'chirish
        </button>
      </div>
    </div>
  );
}
