import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@tanstack/react-router';
import { Truck, Plus, Phone, Building2, Loader2, ArrowDownToLine, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/common/SearchInput';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useInfiniteSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, useSupplierPayment } from '@/hooks/useSuppliers';
import { useToast } from '@/components/ui/toast';
import { ContactsPanel } from '@/components/common/ContactsPanel';

export function SuppliersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editModal, setEditModal] = useState<{ id: string; name: string; phone: string; company: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [payModal, setPayModal] = useState<{ id: string; name: string; balance: number } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Create/Edit form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteSuppliers({ search, limit: 50 });
  const createMut = useCreateSupplier();
  const updateMut = useUpdateSupplier();
  const deleteMut = useDeleteSupplier();
  const payMut = useSupplierPayment();

  const suppliers = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
  const totalCount = data?.pages[0]?.pagination.total ?? 0;

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) { toast("Nomini kiriting", 'error'); return; }
    try {
      await createMut.mutateAsync({ name: name.trim(), phone: phone || undefined, company: company || undefined });
      toast("Ta'minotchi yaratildi", 'success');
      setCreateOpen(false); setName(''); setPhone(''); setCompany('');
    } catch { toast("Yaratish xatosi", 'error'); }
  }, [name, phone, company, createMut, toast]);

  const handleUpdate = useCallback(async () => {
    if (!editModal || !name.trim()) return;
    try {
      await updateMut.mutateAsync({ id: editModal.id, name: name.trim(), phone: phone || undefined, company: company || undefined });
      toast("Yangilandi", 'success');
      setEditModal(null);
    } catch { toast("Yangilash xatosi", 'error'); }
  }, [editModal, name, phone, company, updateMut, toast]);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMut.mutateAsync(deleteConfirm.id);
      toast("O'chirildi", 'success');
      setDeleteConfirm(null);
    } catch { toast("O'chirish xatosi", 'error'); }
  }, [deleteConfirm, deleteMut, toast]);

  const handlePayment = useCallback(async () => {
    if (!payModal) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) { toast("Summa 0 dan katta bo'lishi kerak", 'error'); return; }
    try {
      await payMut.mutateAsync({ supplierId: payModal.id, amount, note: payNote || undefined });
      toast("To'lov muvaffaqiyatli", 'success');
      setPayModal(null); setPayAmount(''); setPayNote('');
    } catch { toast("To'lov xatosi", 'error'); }
  }, [payModal, payAmount, payNote, payMut, toast]);

  function openEdit(sup: { id: string; name: string; phone: string | null; company: string | null }) {
    setName(sup.name);
    setPhone(sup.phone || '');
    setCompany(sup.company || '');
    setEditModal({ id: sup.id, name: sup.name, phone: sup.phone || '', company: sup.company || '' });
  }

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-text-primary">{t('nav.suppliers')}</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">{totalCount > 0 ? `${totalCount} ta ta'minotchi` : "Ta'minotchilar boshqaruvi"}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ContactsPanel mode="supplier" onAccept={async (c) => { await createMut.mutateAsync({ name: c.name, phone: c.phone }); }} />
          <button onClick={() => { setName(''); setPhone(''); setCompany(''); setCreateOpen(true); }} className="btn btn-primary btn-sm sm:btn-md">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Yangi ta'minotchi</span>
            <span className="sm:hidden">Qo'shish</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 flex items-center gap-3">
        <SearchInput value={search} onChange={(v) => setSearch(v)} placeholder="Qidirish..." className="flex-1 min-w-0" />
        {suppliers.length > 0 && <span className="text-xs text-text-muted shrink-0 tabular-nums">{suppliers.length} ta</span>}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-[180px] rounded-xl" />)}
        </div>
      ) : suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Truck className="mb-4 h-14 w-14 opacity-20" />
          <p className="text-sm font-medium">Ta'minotchi topilmadi</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {suppliers.map((sup) => {
              const bal = Number(sup.balance) || 0;
              const hasDebt = bal > 0;
              return (
                <div key={sup.id} onClick={() => navigate({ to: '/suppliers/$supplierId', params: { supplierId: sup.id } })} className="card p-2 sm:p-3 flex flex-col transition-all hover:shadow-card-hover active:scale-[0.98] cursor-pointer">
                  {/* Name */}
                  <div className="min-w-0 mb-1">
                    <h3 className="text-[13px] sm:text-sm font-bold text-text-primary leading-snug line-clamp-2">{sup.name}</h3>
                  </div>

                  {/* Phone + company */}
                  {sup.phone && (
                    <p className="flex items-center gap-1 text-[10px] text-text-muted mb-0.5">
                      <Phone className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{sup.phone}</span>
                    </p>
                  )}
                  {sup.company && (
                    <p className="flex items-center gap-1 text-[10px] text-text-muted mb-0.5">
                      <Building2 className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{sup.company}</span>
                    </p>
                  )}

                  {/* Debt badge + kirimlar */}
                  <div className="flex items-center gap-1.5 mt-1 mb-1">
                    <span className="text-[9px] sm:text-[10px] text-text-muted">{sup._count.transactions} kirim</span>
                    {hasDebt ? (
                      <span className="ml-auto rounded bg-danger-50 px-1 py-px text-[9px] sm:text-[10px] font-bold text-danger-600 tabular-nums">
                        {formatCurrency(bal)}
                      </span>
                    ) : (
                      <span className="ml-auto rounded bg-success-50 px-1 py-px text-[9px] sm:text-[10px] font-medium text-success-600">Qarzsiz</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex items-center gap-1 pt-1" style={{ borderTop: '1px solid var(--color-border-subtle)' }} onClick={(e) => e.stopPropagation()}>
                    <Link to="/suppliers/$supplierId/import" params={{ supplierId: sup.id }} className="flex h-6 w-6 items-center justify-center rounded-md bg-info-50 text-info-600 hover:bg-info-100 transition-colors" style={{ minHeight: 'auto', minWidth: 'auto' }} title="Kirim">
                      <ArrowDownToLine className="h-3 w-3" />
                    </Link>
                    <button onClick={() => openEdit(sup)} className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted hover:bg-surface-secondary transition-colors" style={{ minHeight: 'auto', minWidth: 'auto' }} title="Tahrirlash">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button onClick={() => setDeleteConfirm({ id: sup.id, name: sup.name })} className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted hover:bg-danger-50 hover:text-danger-600 transition-colors" style={{ minHeight: 'auto', minWidth: 'auto' }} title="O'chirish">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div ref={loadMoreRef} className="flex items-center justify-center py-6">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-sm text-text-muted"><Loader2 className="h-4 w-4 animate-spin" />Yuklanmoqda...</div>
            ) : hasNextPage ? <div className="h-4" /> : suppliers.length > 0 ? (
              <p className="text-xs text-text-muted">Barcha {suppliers.length} ta ta'minotchi</p>
            ) : null}
          </div>
        </>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Yangi ta'minotchi" size="sm">
        <div className="space-y-4">
          <Input id="sup-name" label="Nomi *" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
          <Input id="sup-phone" label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998..." />
          <Input id="sup-company" label="Kompaniya" value={company} onChange={(e) => setCompany(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createMut.isPending}>{t('common.cancel')}</Button>
            <Button onClick={handleCreate} loading={createMut.isPending} disabled={!name.trim()}>{t('common.create')}</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Tahrirlash" size="sm">
        <div className="space-y-4">
          <Input id="edit-name" label="Nomi *" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
          <Input id="edit-phone" label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input id="edit-company" label="Kompaniya" value={company} onChange={(e) => setCompany(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditModal(null)} disabled={updateMut.isPending}>{t('common.cancel')}</Button>
            <Button onClick={handleUpdate} loading={updateMut.isPending} disabled={!name.trim()}>Saqlash</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="O'chirishni tasdiqlang" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            <strong className="text-text-primary">{deleteConfirm?.name}</strong> ta'minotchisini o'chirishga ishonchingiz kommi?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={deleteMut.isPending}>{t('common.cancel')}</Button>
            <button onClick={handleDelete} disabled={deleteMut.isPending} className="btn btn-md bg-danger-600 text-white hover:bg-danger-700">
              {deleteMut.isPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              O'chirish
            </button>
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`To'lov: ${payModal?.name}`} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">Qarz: <strong className="text-danger-600">{payModal && formatCurrency(payModal.balance)}</strong></p>
          <Input id="sup-pay" label="To'lov summasi" type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} autoFocus required />
          <Input id="sup-pay-note" label="Izoh (ixtiyoriy)" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPayModal(null)} disabled={payMut.isPending}>{t('common.cancel')}</Button>
            <Button onClick={handlePayment} loading={payMut.isPending} disabled={!payAmount}>To'lash</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
