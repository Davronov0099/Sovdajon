import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Warehouse, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useWarehouses, useCreateWarehouse, useUpdateWarehouse, useDeleteWarehouse } from '@/hooks/useWarehouses';
import { useToast } from '@/components/ui/toast';
import type { WarehouseItem } from '@/types/api';

export function WarehousePage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useWarehouses();
  const createMut = useCreateWarehouse();
  const updateMut = useUpdateWarehouse();
  const deleteMut = useDeleteWarehouse();

  const warehouses: WarehouseItem[] = data?.data ?? [];

  function openEdit(w: WarehouseItem) {
    setEditId(w.id);
    setName(w.name);
    setAddress(w.address ?? '');
    setModalOpen(true);
  }

  const handleSave = useCallback(async () => {
    if (!name.trim()) { toast('Nomini kiriting', 'error'); return; }
    try {
      if (editId) {
        await updateMut.mutateAsync({ id: editId, name: name.trim(), address: address || undefined });
        toast('Ombor yangilandi', 'success');
      } else {
        await createMut.mutateAsync({ name: name.trim(), address: address || undefined });
        toast('Ombor yaratildi', 'success');
      }
      setModalOpen(false); setEditId(null); setName(''); setAddress('');
    } catch { toast('Xatolik yuz berdi', 'error'); }
  }, [editId, name, address, createMut, updateMut, toast]);

  async function handleDelete() {
    if (!deleteTarget) return;
    try { await deleteMut.mutateAsync(deleteTarget.id); toast("O'chirildi", 'success'); }
    catch { toast("O'chirish xatosi", 'error'); }
    setDeleteTarget(null);
  }

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{t('nav.warehouse')}</h1>
          <p className="text-sm text-text-muted mt-0.5">Omborxona boshqaruvi</p>
        </div>
        <button onClick={() => { setEditId(null); setName(''); setAddress(''); setModalOpen(true); }} className="btn btn-primary btn-md">
          <Plus className="h-4 w-4" aria-hidden="true" /> Yangi ombor
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : warehouses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Warehouse className="mb-4 h-16 w-16" /><p className="text-lg font-medium">{t('common.noData')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {warehouses.map((w) => (
            <div key={w.id} className="card p-5 stagger-item">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50"><Warehouse className="h-5 w-5 text-primary-600" /></div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium text-text-primary">{w.name}</h3>
                  {w.address && <p className="truncate text-xs text-text-muted">{w.address}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(w)}><Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Tahrirlash</Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteTarget({ id: w.id, name: w.name })}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Ombor tahrirlash' : 'Yangi ombor'} size="sm">
        <div className="space-y-4">
          <Input id="wh-name" label="Nomi" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
          <Input id="wh-address" label="Manzil (ixtiyoriy)" value={address} onChange={(e) => setAddress(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} loading={createMut.isPending || updateMut.isPending} disabled={!name.trim()}>{t('common.save')}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Ombor o'chirish" description={`"${deleteTarget?.name}" ni o'chirmoqchimisiz?`} confirmText="O'chirish" variant="danger" loading={deleteMut.isPending} />
    </div>
  );
}
