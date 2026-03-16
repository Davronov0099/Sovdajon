import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Plus, Clock, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '@sardorbek/shared';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/common/SearchInput';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebts, useDebtStats, useDebtPayment, useDebtExtend, useCreateDebt } from '@/hooks/useDebts';
import { useCustomers } from '@/hooks/useCustomers';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import type { DebtItem, DebtStats } from '@/types/api';

type DebtStatusType = 'ACTIVE' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CONFLICT';

const STATUS_CONFIG: Record<DebtStatusType, { label: string; color: string; icon: typeof Clock }> = {
  ACTIVE: { label: 'Faol', color: 'bg-info-50 text-info-700', icon: Clock },
  PARTIAL: { label: 'Qisman', color: 'bg-warning-50 text-warning-700', icon: DollarSign },
  PAID: { label: "To'langan", color: 'bg-success-50 text-success-700', icon: CheckCircle },
  OVERDUE: { label: "Muddati o'tgan", color: 'bg-danger-50 text-danger-700', icon: AlertTriangle },
  CONFLICT: { label: 'Konflikt', color: 'bg-orange-50 text-orange-700', icon: AlertTriangle },
};

export function DebtsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [paymentModal, setPaymentModal] = useState<{ debtId: string; remaining: number } | null>(null);
  const [extendModal, setExtendModal] = useState<{ debtId: string; currentDate: string } | null>(null);
  const [createModal, setCreateModal] = useState(false);

  // Payment form
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payNote, setPayNote] = useState('');

  // Extend form
  const [extendDate, setExtendDate] = useState('');
  const [extendReason, setExtendReason] = useState('');

  // Create form
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newNote, setNewNote] = useState('');

  const { data, isLoading } = useDebts({ search, status: statusFilter || undefined, page });
  const { data: statsData } = useDebtStats();
  const { data: customersData } = useCustomers({ limit: 100 });
  const paymentMut = useDebtPayment();
  const extendMut = useDebtExtend();
  const createMut = useCreateDebt();

  // Type-safe data extraction
  const debts: DebtItem[] = data?.data ?? [];
  const pagination = data?.pagination;
  const stats: DebtStats | undefined = statsData?.data;
  const customers = customersData?.data ?? [];

  const handlePayment = useCallback(async () => {
    if (!paymentModal) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      toast("To'lov summasi 0 dan katta bo'lishi kerak", 'error');
      return;
    }
    if (amount > paymentModal.remaining) {
      toast("To'lov qoldiqdan oshib ketdi", 'error');
      return;
    }
    try {
      await paymentMut.mutateAsync({
        debtId: paymentModal.debtId,
        amount,
        method: payMethod as 'CASH' | 'CARD' | 'CLICK' | 'TRANSFER',
        note: payNote || undefined,
      });
      toast("To'lov muvaffaqiyatli qabul qilindi", 'success');
      setPaymentModal(null);
      setPayAmount('');
      setPayNote('');
    } catch {
      toast("To'lov xatosi yuz berdi", 'error');
    }
  }, [paymentModal, payAmount, payMethod, payNote, paymentMut, toast]);

  const handleExtend = useCallback(async () => {
    if (!extendModal) return;
    if (!extendDate) {
      toast('Yangi muddatni kiriting', 'error');
      return;
    }
    if (!extendReason.trim()) {
      toast('Sababni kiriting', 'error');
      return;
    }
    try {
      await extendMut.mutateAsync({
        debtId: extendModal.debtId,
        newDate: new Date(extendDate).toISOString(),
        reason: extendReason,
      });
      toast('Muddat uzaytirildi', 'success');
      setExtendModal(null);
      setExtendDate('');
      setExtendReason('');
    } catch {
      toast('Uzaytirish xatosi', 'error');
    }
  }, [extendModal, extendDate, extendReason, extendMut, toast]);

  const handleCreate = useCallback(async () => {
    if (!newCustomerId) {
      toast('Mijozni tanlang', 'error');
      return;
    }
    const amount = Number(newAmount);
    if (!amount || amount <= 0) {
      toast("Summa 0 dan katta bo'lishi kerak", 'error');
      return;
    }
    if (!newDueDate) {
      toast('Muddatni kiriting', 'error');
      return;
    }
    try {
      await createMut.mutateAsync({
        customerId: newCustomerId,
        amount,
        dueDate: new Date(newDueDate).toISOString(),
        note: newNote || undefined,
      });
      toast('Qarz yaratildi', 'success');
      setCreateModal(false);
      setNewCustomerId('');
      setNewAmount('');
      setNewDueDate('');
      setNewNote('');
    } catch {
      toast('Qarz yaratish xatosi — limit oshgan bo\'lishi mumkin', 'error');
    }
  }, [newCustomerId, newAmount, newDueDate, newNote, createMut, toast]);

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{t('nav.debts')}</h1>
          <p className="text-sm text-text-muted mt-0.5">Qarz boshqaruvi</p>
        </div>
        {isAdmin && (
          <button onClick={() => setCreateModal(true)} className="btn btn-primary btn-md">
            <Plus className="h-4 w-4" />
            Yangi qarz
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <div className="stat-card">
            <p className="stat-label">Jami qarz</p>
            <p className="stat-value">{formatCurrency(stats.totalAmount)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Qoldiq</p>
            <p className="stat-value text-danger-600">{formatCurrency(stats.totalRemaining)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Qarzlar soni</p>
            <p className="stat-value">{stats.totalCount}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Muddati o'tgan</p>
            <p className="stat-value text-warning-600">{stats.overdueCount}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Mijoz nomi yoki telefon..." className="w-full sm:w-72" />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input w-auto"
          aria-label="Status filter"
          style={{ minWidth: '160px' }}
        >
          <option value="">Barcha status</option>
          <option value="ACTIVE">Faol</option>
          <option value="PARTIAL">Qisman to'langan</option>
          <option value="OVERDUE">Muddati o'tgan</option>
          <option value="PAID">To'langan</option>
        </select>
      </div>

      {/* Debts List */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : debts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <CreditCard className="mb-4 h-16 w-16" />
          <p className="text-lg font-medium">{t('common.noData')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {debts.map((debt) => {
            const status = debt.status as DebtStatusType;
            const config = STATUS_CONFIG[status];
            const StatusIcon = config.icon;

            return (
              <div key={debt.id} className="card p-4 stagger-item">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="truncate font-medium text-text-primary">{debt.customer.name}</h3>
                      <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', config.color)}>
                        <StatusIcon className="h-3 w-3" aria-hidden="true" />
                        {config.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-text-muted">{debt.customer.phone}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      Muddat: {formatDate(debt.dueDate)} | Yaratildi: {formatDate(debt.createdAt)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-text-primary">{formatCurrency(Number(debt.amount))}</p>
                    {Number(debt.remainingAmount) !== Number(debt.amount) && (
                      <p className="text-sm text-danger-600">Qoldiq: {formatCurrency(Number(debt.remainingAmount))}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {isAdmin && status !== 'PAID' && (
                  <div className="mt-3 flex gap-2 border-t border-border pt-3">
                    <Button
                      size="sm"
                      onClick={() => setPaymentModal({ debtId: debt.id, remaining: Number(debt.remainingAmount) })}
                    >
                      <DollarSign className="h-3.5 w-3.5" aria-hidden="true" />
                      To'lov
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExtendModal({ debtId: debt.id, currentDate: debt.dueDate })}
                    >
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      Uzaytirish
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Oldingi</Button>
          <span className="text-sm text-text-muted">{page} / {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Keyingi</Button>
        </div>
      )}

      {/* Payment Modal */}
      <Modal open={!!paymentModal} onClose={() => setPaymentModal(null)} title="To'lov kiritish" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">Qoldiq: <strong className="text-text-primary">{paymentModal && formatCurrency(paymentModal.remaining)}</strong></p>
          <Input id="pay-amount" label="To'lov summasi" type="number" min={1} max={paymentModal?.remaining} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} autoFocus required />
          <div>
            <label htmlFor="pay-method" className="mb-1.5 block text-sm font-medium text-text-primary">To'lov usuli</label>
            <select id="pay-method" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="min-h-[44px] w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:outline-2 focus:outline-offset-2 focus:outline-primary-500">
              <option value="CASH">Naqd</option>
              <option value="CARD">Karta</option>
              <option value="CLICK">Click</option>
              <option value="TRANSFER">O'tkazma</option>
            </select>
          </div>
          <Input id="pay-note" label="Izoh (ixtiyoriy)" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPaymentModal(null)} disabled={paymentMut.isPending}>{t('common.cancel')}</Button>
            <Button onClick={handlePayment} loading={paymentMut.isPending} disabled={!payAmount}>Tasdiqlash</Button>
          </div>
        </div>
      </Modal>

      {/* Extend Modal */}
      <Modal open={!!extendModal} onClose={() => setExtendModal(null)} title="Muddatni uzaytirish" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">Joriy muddat: <strong className="text-text-primary">{extendModal && formatDate(extendModal.currentDate)}</strong></p>
          <Input id="extend-date" label="Yangi muddat" type="date" value={extendDate} onChange={(e) => setExtendDate(e.target.value)} required />
          <Input id="extend-reason" label="Sabab" value={extendReason} onChange={(e) => setExtendReason(e.target.value)} required />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setExtendModal(null)} disabled={extendMut.isPending}>{t('common.cancel')}</Button>
            <Button onClick={handleExtend} loading={extendMut.isPending} disabled={!extendDate || !extendReason}>Uzaytirish</Button>
          </div>
        </div>
      </Modal>

      {/* Create Debt Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Yangi qarz" size="sm">
        <div className="space-y-4">
          <div>
            <label htmlFor="new-customer" className="mb-1.5 block text-sm font-medium text-text-primary">Mijoz <span className="text-danger-500">*</span></label>
            <select id="new-customer" value={newCustomerId} onChange={(e) => setNewCustomerId(e.target.value)} className="min-h-[44px] w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:outline-2 focus:outline-offset-2 focus:outline-primary-500" required>
              <option value="">Tanlang...</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
            </select>
          </div>
          <Input id="new-amount" label="Summa" type="number" min={1} value={newAmount} onChange={(e) => setNewAmount(e.target.value)} required />
          <Input id="new-date" label="Muddat" type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} required />
          <Input id="new-note" label="Izoh (ixtiyoriy)" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCreateModal(false)} disabled={createMut.isPending}>{t('common.cancel')}</Button>
            <Button onClick={handleCreate} loading={createMut.isPending} disabled={!newCustomerId || !newAmount || !newDueDate}>{t('common.create')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
