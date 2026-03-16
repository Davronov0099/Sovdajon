import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Truck, Plus, DollarSign, ArrowDownToLine } from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/common/SearchInput';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { useSuppliers, useCreateSupplier, useSupplierPayment } from '@/hooks/useSuppliers';
import { useToast } from '@/components/ui/toast';
import { SupplierImportModal } from './SupplierImportModal';
import type { SupplierItem } from '@/types/api';

export function SuppliersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [payModal, setPayModal] = useState<{ id: string; name: string; balance: number } | null>(null);
  const [importModal, setImportModal] = useState<{ id: string; name: string } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');

  // Create form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');

  const { data, isLoading } = useSuppliers({ search, page });
  const createMut = useCreateSupplier();
  const payMut = useSupplierPayment();

  // Type-safe
  const suppliers: SupplierItem[] = data?.data ?? [];
  const pagination = data?.pagination;

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      toast("Nomini kiriting", 'error');
      return;
    }
    try {
      await createMut.mutateAsync({ name: name.trim(), phone: phone || undefined, company: company || undefined });
      toast("Ta'minotchi yaratildi", 'success');
      setCreateOpen(false);
      setName(''); setPhone(''); setCompany('');
    } catch {
      toast("Yaratish xatosi", 'error');
    }
  }, [name, phone, company, createMut, toast]);

  const handlePayment = useCallback(async () => {
    if (!payModal) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      toast("To'lov summasi 0 dan katta bo'lishi kerak", 'error');
      return;
    }
    try {
      await payMut.mutateAsync({ supplierId: payModal.id, amount, note: payNote || undefined });
      toast("To'lov muvaffaqiyatli", 'success');
      setPayModal(null); setPayAmount(''); setPayNote('');
    } catch {
      toast("To'lov xatosi", 'error');
    }
  }, [payModal, payAmount, payNote, payMut, toast]);

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{t('nav.suppliers')}</h1>
          <p className="text-sm text-text-muted mt-0.5">Ta'minotchilar boshqaruvi</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('common.create')}
        </Button>
      </div>

      <div className="mb-6">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Ta'minotchi nomi..." className="w-full sm:w-72" />
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Truck className="mb-4 h-16 w-16" />
          <p className="text-lg font-medium">{t('common.noData')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suppliers.map((sup) => (
            <div key={sup.id} className="card p-4 stagger-item">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium text-text-primary">{sup.name}</h3>
                  {sup.company && <p className="text-sm text-text-muted">{sup.company}</p>}
                  {sup.phone && <p className="text-sm text-text-muted">{sup.phone}</p>}
                  <p className="mt-1 text-xs text-text-muted">{sup._count.transactions} ta tranzaksiya</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text-muted">Qarz</p>
                  <p className={`text-lg font-bold ${Number(sup.balance) > 0 ? 'text-danger-600' : 'text-success-600'}`}>
                    {formatCurrency(Number(sup.balance))}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex gap-2 border-t border-border pt-3">
                <Button size="sm" onClick={() => setImportModal({ id: sup.id, name: sup.name })}>
                  <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" />
                  Kirim
                </Button>
                {Number(sup.balance) > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setPayModal({ id: sup.id, name: sup.name, balance: Number(sup.balance) })}>
                    <DollarSign className="h-3.5 w-3.5" aria-hidden="true" />
                    To'lov
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Oldingi</Button>
          <span className="text-sm text-text-muted">{page} / {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Keyingi</Button>
        </div>
      )}

      {/* Create Supplier Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Yangi ta'minotchi" size="sm">
        <div className="space-y-4">
          <Input id="sup-name" label="Nomi" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
          <Input id="sup-phone" label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input id="sup-company" label="Kompaniya" value={company} onChange={(e) => setCompany(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createMut.isPending}>{t('common.cancel')}</Button>
            <Button onClick={handleCreate} loading={createMut.isPending} disabled={!name.trim()}>{t('common.create')}</Button>
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`To'lov: ${payModal?.name}`} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">Qarz: <strong className="text-text-primary">{payModal && formatCurrency(payModal.balance)}</strong></p>
          <Input id="sup-pay" label="To'lov summasi" type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} autoFocus required />
          <Input id="sup-pay-note" label="Izoh (ixtiyoriy)" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPayModal(null)} disabled={payMut.isPending}>{t('common.cancel')}</Button>
            <Button onClick={handlePayment} loading={payMut.isPending} disabled={!payAmount}>To'lash</Button>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      {importModal && (
        <SupplierImportModal
          supplierId={importModal.id}
          supplierName={importModal.name}
          onClose={() => setImportModal(null)}
        />
      )}
    </div>
  );
}
