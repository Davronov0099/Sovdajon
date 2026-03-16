import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Plus, Phone, MapPin, CreditCard } from 'lucide-react';
import { formatCurrency, formatPhone } from '@sardorbek/shared';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { SearchInput } from '@/components/common/SearchInput';
import { useCustomers, useCreateCustomer } from '@/hooks/useCustomers';
import { useToast } from '@/components/ui/toast';
import type { CustomerItem } from '@/types/api';

export function CustomersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  // Create form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+998');
  const [address, setAddress] = useState('');
  const [debtLimit, setDebtLimit] = useState('');
  const [note, setNote] = useState('');

  const { data, isLoading } = useCustomers({ search, page, limit: 20 });
  const createMut = useCreateCustomer();

  const customers: CustomerItem[] = data?.data ?? [];
  const pagination = data?.pagination;

  const handleCreate = useCallback(async () => {
    if (!name.trim()) { toast('Ismni kiriting', 'error'); return; }
    if (!phone || phone.length < 13) { toast('Telefon raqamni kiriting (+998XXXXXXXXX)', 'error'); return; }
    try {
      await createMut.mutateAsync({
        name: name.trim(),
        phone,
        address: address || undefined,
        debtLimit: debtLimit ? Number(debtLimit) : undefined,
        note: note || undefined,
      });
      toast('Mijoz yaratildi', 'success');
      setModalOpen(false);
      setName(''); setPhone('+998'); setAddress(''); setDebtLimit(''); setNote('');
    } catch {
      toast('Yaratish xatosi — telefon band bo\'lishi mumkin', 'error');
    }
  }, [name, phone, address, debtLimit, note, createMut, toast]);

  function resetAndOpen() {
    setName(''); setPhone('+998'); setAddress(''); setDebtLimit(''); setNote('');
    setModalOpen(true);
  }

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{t('nav.customers')}</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {pagination ? `${pagination.total} ta mijoz` : 'Mijozlar boshqaruvi'}
          </p>
        </div>
        <button onClick={resetAndOpen} className="btn btn-primary btn-md">
          <Plus className="h-4 w-4" />
          Yangi mijoz
        </button>
      </div>

      {/* Search */}
      <div className="mb-5">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Ism yoki telefon..."
          className="w-full sm:w-80"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-36 rounded-xl" />)}
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Users className="mb-4 h-16 w-16 opacity-30" />
          <p className="text-base font-medium">Mijozlar topilmadi</p>
          <p className="mt-1 text-sm">Yangi mijoz qo'shing</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((customer, i) => (
            <div
              key={customer.id}
              className="card card-interactive p-4 stagger-item"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {/* Avatar + Name */}
              <div className="flex items-start gap-3 mb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-700">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-text-primary">{customer.name}</h3>
                  <p className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
                    <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {formatPhone(customer.phone)}
                  </p>
                </div>
                {/* Loyalty points */}
                {customer.loyaltyPoints > 0 && (
                  <span className="badge badge-info text-[10px]">
                    <span className="badge-dot bg-info-500" />
                    {customer.loyaltyPoints} ball
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-xs">
                {customer.address && (
                  <p className="flex items-center gap-1.5 text-text-muted">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{customer.address}</span>
                  </p>
                )}
                {customer.debtLimit && (
                  <p className="flex items-center gap-1.5 text-text-muted">
                    <CreditCard className="h-3 w-3 shrink-0" aria-hidden="true" />
                    Qarz limiti: <span className="font-medium text-text-secondary tabular-nums">{formatCurrency(Number(customer.debtLimit))}</span>
                  </p>
                )}
              </div>

              {customer.note && (
                <p className="mt-2 text-xs text-text-muted truncate italic">{customer.note}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Oldingi</button>
          <span className="text-sm text-text-muted tabular-nums">{page} / {pagination.totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Keyingi</button>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Yangi mijoz" size="sm">
        <div className="space-y-4">
          <Input id="c-name" label="Ism *" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ism familiya" />
          <Input id="c-phone" label="Telefon *" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998901234567" />
          <Input id="c-address" label="Manzil" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Viloyat, tuman" />
          <Input id="c-limit" label="Qarz limiti (ixtiyoriy)" type="number" value={debtLimit} onChange={(e) => setDebtLimit(e.target.value)} placeholder="0 = limitsiz" />
          <Input id="c-note" label="Izoh" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn btn-secondary btn-md" disabled={createMut.isPending}>{t('common.cancel')}</button>
            <button onClick={handleCreate} className="btn btn-primary btn-md" disabled={!name.trim() || phone.length < 13 || createMut.isPending}>
              {createMut.isPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {t('common.create')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
