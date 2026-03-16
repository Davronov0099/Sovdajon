import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Handshake, Plus, DollarSign, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/common/SearchInput';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { usePartners, useCreatePartner, usePartnerPayment } from '@/hooks/usePartners';
import { useToast } from '@/components/ui/toast';
import type { PartnerItem } from '@/types/api';

export function PartnersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [payModal, setPayModal] = useState<{ id: string; name: string; balance: number } | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payType, setPayType] = useState<'IN' | 'OUT'>('IN');
  const [payNote, setPayNote] = useState('');

  const { data, isLoading } = usePartners({ search, page });
  const createMut = useCreatePartner();
  const payMut = usePartnerPayment();

  const partners: PartnerItem[] = data?.data ?? [];
  const pagination = data?.pagination;

  const handleCreate = useCallback(async () => {
    if (!name.trim()) { toast('Nomini kiriting', 'error'); return; }
    try {
      await createMut.mutateAsync({ name: name.trim(), phone: phone || undefined, company: company || undefined });
      toast('Hamkor yaratildi', 'success');
      setCreateOpen(false); setName(''); setPhone(''); setCompany('');
    } catch { toast('Yaratish xatosi', 'error'); }
  }, [name, phone, company, createMut, toast]);

  const handlePayment = useCallback(async () => {
    if (!payModal) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) { toast("Summa 0 dan katta bo'lishi kerak", 'error'); return; }
    try {
      await payMut.mutateAsync({ partnerId: payModal.id, amount, type: payType, note: payNote || undefined });
      toast("To'lov muvaffaqiyatli", 'success');
      setPayModal(null); setPayAmount(''); setPayNote('');
    } catch { toast("To'lov xatosi", 'error'); }
  }, [payModal, payAmount, payType, payNote, payMut, toast]);

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{t('nav.partners')}</h1>
          <p className="text-sm text-text-muted mt-0.5">Hamkorlar boshqaruvi</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn btn-primary btn-md">
          <Plus className="h-4 w-4" aria-hidden="true" /> Yangi hamkor
        </button>
      </div>

      <div className="mb-6">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Hamkor nomi..." className="w-full sm:w-72" />
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : partners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Handshake className="mb-4 h-16 w-16" /><p className="text-lg font-medium">{t('common.noData')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {partners.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-surface p-4 transition-shadow hover:shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium text-text-primary">{p.name}</h3>
                  {p.company && <p className="text-sm text-text-muted">{p.company}</p>}
                  {p.phone && <p className="text-sm text-text-muted">{p.phone}</p>}
                  <p className="mt-1 text-xs text-text-muted">{p._count.payments} ta to'lov</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text-muted">Balans</p>
                  <p className={`text-lg font-bold ${Number(p.balance) >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                    {formatCurrency(Number(p.balance))}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2 border-t border-border pt-3">
                <Button size="sm" onClick={() => setPayModal({ id: p.id, name: p.name, balance: Number(p.balance) })}>
                  <DollarSign className="h-3.5 w-3.5" aria-hidden="true" /> To'lov
                </Button>
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

      {/* Create */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Yangi hamkor" size="sm">
        <div className="space-y-4">
          <Input id="p-name" label="Nomi" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
          <Input id="p-phone" label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input id="p-company" label="Kompaniya" value={company} onChange={(e) => setCompany(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleCreate} loading={createMut.isPending} disabled={!name.trim()}>{t('common.create')}</Button>
          </div>
        </div>
      </Modal>

      {/* Payment */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`To'lov: ${payModal?.name}`} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">Balans: <strong className="text-text-primary">{payModal && formatCurrency(payModal.balance)}</strong></p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPayType('IN')} className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${payType === 'IN' ? 'border-success-500 bg-success-50 text-success-700' : 'border-border text-text-muted'}`}>
              <ArrowDownLeft className="h-4 w-4" /> Kirim (IN)
            </button>
            <button type="button" onClick={() => setPayType('OUT')} className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${payType === 'OUT' ? 'border-danger-500 bg-danger-50 text-danger-700' : 'border-border text-text-muted'}`}>
              <ArrowUpRight className="h-4 w-4" /> Chiqim (OUT)
            </button>
          </div>
          <Input id="p-pay" label="Summa" type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
          <Input id="p-pay-note" label="Izoh (ixtiyoriy)" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPayModal(null)} disabled={payMut.isPending}>{t('common.cancel')}</Button>
            <Button onClick={handlePayment} loading={payMut.isPending} disabled={!payAmount}>Tasdiqlash</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
