import { useState, useCallback } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { ArrowLeft, CreditCard, Clock, AlertTriangle, CheckCircle, DollarSign, Phone, User } from 'lucide-react';
import { formatCurrency, formatDate } from '@sardorbek/shared';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebts, useDebtPayment, useDebtExtend } from '@/hooks/useDebts';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import type { DebtItem } from '@/types/api';

type DebtStatusType = 'ACTIVE' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CONFLICT';

const STATUS_CONFIG: Record<DebtStatusType, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  ACTIVE: { label: 'Faol', color: 'text-info-700', bg: 'bg-info-50 text-info-700', icon: Clock },
  PARTIAL: { label: 'Qisman', color: 'text-warning-700', bg: 'bg-warning-50 text-warning-700', icon: DollarSign },
  PAID: { label: "To'langan", color: 'text-success-700', bg: 'bg-success-50 text-success-700', icon: CheckCircle },
  OVERDUE: { label: "Muddati o'tgan", color: 'text-danger-700', bg: 'bg-danger-50 text-danger-700', icon: AlertTriangle },
  CONFLICT: { label: 'Konflikt', color: 'text-orange-700', bg: 'bg-orange-50 text-orange-700', icon: AlertTriangle },
};

export function CustomerDebtsPage() {
  const { customerId } = useParams({ from: '/_auth/debts_/$customerId' });
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  // Modals
  const [paymentModal, setPaymentModal] = useState<{ debtId: string; remaining: number } | null>(null);
  const [extendModal, setExtendModal] = useState<{ debtId: string; currentDate: string } | null>(null);

  // Payment form
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payNote, setPayNote] = useState('');

  // Extend form
  const [extendDate, setExtendDate] = useState('');
  const [extendReason, setExtendReason] = useState('');

  const { data, isLoading } = useDebts({ customerId, limit: 100 });
  const paymentMut = useDebtPayment();
  const extendMut = useDebtExtend();

  const debts: DebtItem[] = data?.data ?? [];
  const customer = debts[0]?.customer;

  // Summary
  const totalAmount = debts.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const totalRemaining = debts.reduce((s, d) => s + (Number(d.remainingAmount) || 0), 0);
  const activeDebts = debts.filter((d) => d.status !== 'PAID');
  const paidDebts = debts.filter((d) => d.status === 'PAID');

  const handlePayment = useCallback(async () => {
    if (!paymentModal) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) { toast("To'lov summasi 0 dan katta bo'lishi kerak", 'error'); return; }
    if (amount > paymentModal.remaining) { toast("To'lov qoldiqdan oshib ketdi", 'error'); return; }
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
    if (!extendDate) { toast('Yangi muddatni kiriting', 'error'); return; }
    if (!extendReason.trim()) { toast('Sababni kiriting', 'error'); return; }
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

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      {/* Back + Header */}
      <div className="mb-5">
        <Link to="/debts" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" />
          Qarzlar ro'yxati
        </Link>

        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : customer ? (
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-base sm:text-lg font-bold">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-text-primary truncate">{customer.name}</h1>
              <div className="flex items-center gap-2 sm:gap-3 mt-0.5 text-xs sm:text-sm text-text-muted">
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {customer.phone}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CreditCard className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {debts.length} ta qarz
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <User className="h-8 w-8 text-text-muted" />
            <h1 className="text-xl font-bold text-text-primary">Mijoz topilmadi</h1>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {!isLoading && debts.length > 0 && (
        <div className="mb-4 sm:mb-5 grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
          <div className="stat-card">
            <p className="stat-label text-[10px] sm:text-xs">Jami qarz</p>
            <p className="stat-value text-sm sm:text-lg">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label text-[10px] sm:text-xs">Qoldiq</p>
            <p className="stat-value text-sm sm:text-lg text-danger-600">{formatCurrency(totalRemaining)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label text-[10px] sm:text-xs">Faol qarzlar</p>
            <p className="stat-value text-sm sm:text-lg">{activeDebts.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label text-[10px] sm:text-xs">To'langan</p>
            <p className="stat-value text-sm sm:text-lg text-success-600">{paidDebts.length}</p>
          </div>
        </div>
      )}

      {/* Debts List */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : debts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <CreditCard className="mb-4 h-16 w-16 opacity-20" />
          <p className="text-lg font-medium">Qarz topilmadi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Active debts first */}
          {activeDebts.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Faol qarzlar</h2>
              {activeDebts.map((debt) => (
                <DebtCard key={debt.id} debt={debt} isAdmin={isAdmin} onPayment={setPaymentModal} onExtend={setExtendModal} />
              ))}
            </>
          )}

          {/* Paid debts */}
          {paidDebts.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mt-6">To'langan qarzlar</h2>
              {paidDebts.map((debt) => (
                <DebtCard key={debt.id} debt={debt} isAdmin={isAdmin} onPayment={setPaymentModal} onExtend={setExtendModal} />
              ))}
            </>
          )}
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
            <Button variant="outline" onClick={() => setPaymentModal(null)} disabled={paymentMut.isPending}>Bekor qilish</Button>
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
            <Button variant="outline" onClick={() => setExtendModal(null)} disabled={extendMut.isPending}>Bekor qilish</Button>
            <Button onClick={handleExtend} loading={extendMut.isPending} disabled={!extendDate || !extendReason}>Uzaytirish</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Debt Card Component ─── */
interface DebtCardProps {
  debt: DebtItem;
  isAdmin: boolean;
  onPayment: (v: { debtId: string; remaining: number }) => void;
  onExtend: (v: { debtId: string; currentDate: string }) => void;
}

function DebtCard({ debt, isAdmin, onPayment, onExtend }: DebtCardProps) {
  const status = debt.status as DebtStatusType;
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;
  const amount = Number(debt.amount) || 0;
  const remaining = Number(debt.remainingAmount) || 0;
  const paid = amount - remaining;
  const progressPct = amount > 0 ? Math.round((paid / amount) * 100) : 0;

  return (
    <div className={cn(
      'card p-3 sm:p-4 stagger-item',
      status === 'OVERDUE' && 'border-l-[3px] border-l-danger-500',
    )}>
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className={cn('inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium', config.bg)}>
              <StatusIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {config.label}
            </span>
            {debt._count.payments > 0 && (
              <span className="text-[11px] sm:text-xs text-text-muted">{debt._count.payments} ta to'lov</span>
            )}
          </div>
          <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-text-muted">
            Muddat: <span className={cn('font-medium', status === 'OVERDUE' ? 'text-danger-600' : 'text-text-secondary')}>{formatDate(debt.dueDate)}</span>
            <span className="mx-1 sm:mx-2">|</span>
            {formatDate(debt.createdAt)}
          </p>
          {debt.note && (
            <p className="mt-1 text-[11px] text-text-muted italic truncate">"{debt.note}"</p>
          )}
        </div>

        <div className="text-right shrink-0">
          <p className="text-sm sm:text-lg font-bold text-text-primary tabular-nums">{formatCurrency(remaining)}</p>
          {remaining !== amount && (
            <p className="text-[10px] sm:text-xs text-text-muted tabular-nums">Jami: {formatCurrency(amount)}</p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {status !== 'PAID' && paid > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-[11px] text-text-muted mb-1">
            <span>To'langan: {formatCurrency(paid)}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-tertiary overflow-hidden">
            <div className="h-full rounded-full bg-success-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Recent payments */}
      {debt.payments && debt.payments.length > 0 && (
        <div className="mt-2.5 sm:mt-3 pt-2.5 sm:pt-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          <p className="text-[10px] sm:text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Oxirgi to'lovlar</p>
          <div className="space-y-1">
            {debt.payments.slice(0, 3).map((p) => (
              <div key={p.id} className="flex justify-between text-[11px] sm:text-xs">
                <span className="text-text-muted truncate mr-2">{formatDate(p.createdAt)} — {p.method === 'CASH' ? 'Naqd' : p.method === 'CARD' ? 'Karta' : p.method}</span>
                <span className="font-medium text-success-600 tabular-nums shrink-0">+{formatCurrency(Number(p.amount) || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {isAdmin && status !== 'PAID' && (
        <div className="mt-3 flex gap-2 pt-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          <Button
            size="sm"
            onClick={() => onPayment({ debtId: debt.id, remaining })}
          >
            <DollarSign className="h-3.5 w-3.5" />
            To'lov
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onExtend({ debtId: debt.id, currentDate: debt.dueDate })}
          >
            <Clock className="h-3.5 w-3.5" />
            Uzaytirish
          </Button>
        </div>
      )}
    </div>
  );
}
