import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { CreditCard, Plus, Clock, AlertTriangle, CheckCircle, DollarSign, ChevronRight, Users, Phone } from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/common/SearchInput';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebts, useDebtStats, useCreateDebt } from '@/hooks/useDebts';
import { useCustomers } from '@/hooks/useCustomers';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import type { DebtItem, DebtStats } from '@/types/api';

type DebtStatusType = 'ACTIVE' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CONFLICT';

const STATUS_PRIORITY: Record<DebtStatusType, number> = {
  OVERDUE: 0,
  ACTIVE: 1,
  PARTIAL: 2,
  CONFLICT: 3,
  PAID: 4,
};

const STATUS_CONFIG: Record<DebtStatusType, { label: string; color: string; icon: typeof Clock }> = {
  ACTIVE: { label: 'Faol', color: 'bg-info-50 text-info-700', icon: Clock },
  PARTIAL: { label: 'Qisman', color: 'bg-warning-50 text-warning-700', icon: DollarSign },
  PAID: { label: "To'langan", color: 'bg-success-50 text-success-700', icon: CheckCircle },
  OVERDUE: { label: "Muddati o'tgan", color: 'bg-danger-50 text-danger-700', icon: AlertTriangle },
  CONFLICT: { label: 'Konflikt', color: 'bg-orange-50 text-orange-700', icon: AlertTriangle },
};

interface GroupedCustomer {
  customerId: string;
  customerName: string;
  customerPhone: string;
  debtCount: number;
  totalAmount: number;
  totalRemaining: number;
  worstStatus: DebtStatusType;
  statuses: DebtStatusType[];
}

export function DebtsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create modal
  const [createModal, setCreateModal] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newNote, setNewNote] = useState('');

  const { data, isLoading } = useDebts({ search, status: statusFilter || undefined, limit: 100 });
  const { data: statsData } = useDebtStats();
  const { data: customersData } = useCustomers({ limit: 100 });
  const createMut = useCreateDebt();

  const debts: DebtItem[] = data?.data ?? [];
  const stats: DebtStats | undefined = statsData?.data;
  const customers = customersData?.data ?? [];

  // Group debts by customer
  const grouped = useMemo<GroupedCustomer[]>(() => {
    const map = new Map<string, GroupedCustomer>();

    for (const debt of debts) {
      const cid = debt.customer.id;
      const status = debt.status as DebtStatusType;
      const existing = map.get(cid);

      if (existing) {
        existing.debtCount += 1;
        existing.totalAmount += Number(debt.amount) || 0;
        existing.totalRemaining += Number(debt.remainingAmount) || 0;
        existing.statuses.push(status);
        if (STATUS_PRIORITY[status] < STATUS_PRIORITY[existing.worstStatus]) {
          existing.worstStatus = status;
        }
      } else {
        map.set(cid, {
          customerId: cid,
          customerName: debt.customer.name,
          customerPhone: debt.customer.phone,
          debtCount: 1,
          totalAmount: Number(debt.amount) || 0,
          totalRemaining: Number(debt.remainingAmount) || 0,
          worstStatus: status,
          statuses: [status],
        });
      }
    }

    // Sort: overdue first, then by remaining desc
    return Array.from(map.values()).sort((a, b) => {
      const sp = STATUS_PRIORITY[a.worstStatus] - STATUS_PRIORITY[b.worstStatus];
      if (sp !== 0) return sp;
      return b.totalRemaining - a.totalRemaining;
    });
  }, [debts]);

  const handleCreate = useCallback(async () => {
    if (!newCustomerId) { toast('Mijozni tanlang', 'error'); return; }
    const amount = Number(newAmount);
    if (!amount || amount <= 0) { toast("Summa 0 dan katta bo'lishi kerak", 'error'); return; }
    if (!newDueDate) { toast('Muddatni kiriting', 'error'); return; }
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
      toast("Qarz yaratish xatosi — limit oshgan bo'lishi mumkin", 'error');
    }
  }, [newCustomerId, newAmount, newDueDate, newNote, createMut, toast]);

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-4 sm:mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-text-primary">{t('nav.debts')}</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">Qarzdor mijozlar ro'yxati</p>
        </div>
        {isAdmin && (
          <button onClick={() => setCreateModal(true)} className="btn btn-primary btn-sm sm:btn-md shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Yangi qarz</span>
            <span className="sm:hidden">Qarz</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <div className="stat-card">
            <p className="stat-label text-[10px] sm:text-xs">Jami qarz</p>
            <p className="stat-value text-sm sm:text-lg">{formatCurrency(stats.totalAmount)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label text-[10px] sm:text-xs">Qoldiq</p>
            <p className="stat-value text-sm sm:text-lg text-danger-600">{formatCurrency(stats.totalRemaining)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label text-[10px] sm:text-xs">Qarzlar soni</p>
            <p className="stat-value text-sm sm:text-lg">{stats.totalCount}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label text-[10px] sm:text-xs">Muddati o'tgan</p>
            <p className="stat-value text-sm sm:text-lg text-warning-600">{stats.overdueCount}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-5 flex items-center gap-2 sm:gap-3">
        <SearchInput value={search} onChange={(v) => setSearch(v)} placeholder="Qidirish..." className="flex-1 min-w-0" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input shrink-0"
          aria-label="Status filter"
          style={{ minWidth: '120px', maxWidth: '160px' }}
        >
          <option value="">Barchasi</option>
          <option value="ACTIVE">Faol</option>
          <option value="PARTIAL">Qisman</option>
          <option value="OVERDUE">Muddati o'tgan</option>
          <option value="PAID">To'langan</option>
        </select>
      </div>

      {/* Grouped Customer List */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <CreditCard className="mb-4 h-16 w-16 opacity-20" />
          <p className="text-lg font-medium">{t('common.noData')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map((g) => {
            const config = STATUS_CONFIG[g.worstStatus];
            const StatusIcon = config.icon;
            const activeCount = g.statuses.filter((s) => s !== 'PAID').length;

            return (
              <Link
                key={g.customerId}
                to="/debts/$customerId"
                params={{ customerId: g.customerId }}
                className="card flex items-center gap-3 sm:gap-4 p-3 sm:p-4 transition-all hover:shadow-card-hover active:scale-[0.99] cursor-pointer stagger-item"
              >
                {/* Avatar */}
                <div className={cn(
                  'flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                  g.worstStatus === 'OVERDUE' ? 'bg-danger-100 text-danger-700' :
                  g.worstStatus === 'PAID' ? 'bg-success-100 text-success-700' :
                  'bg-primary-100 text-primary-700',
                )}>
                  {g.customerName.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h3 className="truncate font-semibold text-text-primary text-[13px] sm:text-[15px]">{g.customerName}</h3>
                    <span className={cn('inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-medium', config.color)}>
                      <StatusIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      {config.label}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-text-muted">
                    <span className="inline-flex items-center gap-0.5 truncate">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span className="truncate">{g.customerPhone}</span>
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-0.5 shrink-0">
                      <CreditCard className="h-3 w-3" />
                      {activeCount > 0 ? `${activeCount} ta faol` : "To'langan"}
                    </span>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <p className="text-sm sm:text-base font-bold text-text-primary tabular-nums">
                    {formatCurrency(g.totalRemaining)}
                  </p>
                  {g.totalRemaining !== g.totalAmount && (
                    <p className="text-[10px] sm:text-[11px] text-text-muted tabular-nums">
                      / {formatCurrency(g.totalAmount)}
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-text-muted" />
              </Link>
            );
          })}
        </div>
      )}

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
