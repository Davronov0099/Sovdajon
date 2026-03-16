import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Receipt, Plus, Trash2, Pencil } from 'lucide-react';
import { formatCurrency, formatDate, EXPENSE_COLORS } from '@sardorbek/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { useExpenses, useExpenseStats, useCreateExpense, useUpdateExpense, useDeleteExpense } from '@/hooks/useExpenses';
import { useToast } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { ExpenseItem, ExpenseStats } from '@/types/api';

const CATEGORY_LABELS: Record<string, string> = {
  RENT: 'Ijara',
  SALARY: 'Maosh',
  UTILITIES: 'Komunal',
  TRANSPORT: 'Transport',
  MARKETING: 'Reklama',
  REPAIR: "Ta'mir",
  TAX: 'Soliq',
  OTHER: 'Boshqa',
};

export function ExpensesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [category, setCategory] = useState('OTHER');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]!);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useExpenses({
    page,
    category: categoryFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  const { data: statsData } = useExpenseStats(startDate || undefined, endDate || undefined);
  const createMut = useCreateExpense();
  const updateMut = useUpdateExpense();
  const deleteMut = useDeleteExpense();

  // Type-safe
  const expenses: ExpenseItem[] = data?.data ?? [];
  const pagination = data?.pagination;
  const stats: ExpenseStats | undefined = statsData?.data;
  const byCategory = stats?.byCategory ?? [];

  function openCreate() {
    setEditId(null);
    setCategory('OTHER');
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]!);
    setModalOpen(true);
  }

  function openEdit(expense: ExpenseItem) {
    setEditId(expense.id);
    setCategory(expense.category);
    setAmount(String(Number(expense.amount)));
    setDescription(expense.description);
    setDate(expense.date.split('T')[0]!);
    setModalOpen(true);
  }

  const handleSave = useCallback(async () => {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      toast("Summa 0 dan katta bo'lishi kerak", 'error');
      return;
    }
    if (!description.trim()) {
      toast('Tavsifni kiriting', 'error');
      return;
    }
    const payload = {
      category: category as 'RENT' | 'SALARY' | 'UTILITIES' | 'TRANSPORT' | 'MARKETING' | 'REPAIR' | 'TAX' | 'OTHER',
      amount: amountNum,
      description: description.trim(),
      date: new Date(date).toISOString(),
    };
    try {
      if (editId) {
        await updateMut.mutateAsync({ id: editId, ...payload });
        toast('Xarajat yangilandi', 'success');
      } else {
        await createMut.mutateAsync(payload);
        toast("Xarajat qo'shildi", 'success');
      }
      setModalOpen(false);
    } catch {
      toast('Xatolik yuz berdi', 'error');
    }
  }, [amount, description, category, date, editId, createMut, updateMut, toast]);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast("Xarajat o'chirildi", 'success');
    } catch {
      toast("O'chirish xatosi", 'error');
    }
    setDeleteTarget(null);
  }

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{t('nav.expenses')}</h1>
          <p className="text-sm text-text-muted mt-0.5">Xarajat boshqaruvi</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Xarajat qo'shish
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-sm text-text-muted">Jami xarajat</p>
            <p className="text-xl font-bold text-text-primary">{formatCurrency(stats.totalAmount)}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-sm text-text-muted">Soni</p>
            <p className="text-xl font-bold text-text-primary">{stats.totalCount}</p>
          </div>
          {byCategory.slice(0, 2).map((cat) => (
            <div key={cat.category} className="rounded-xl border border-border bg-surface p-4">
              <p className="text-sm text-text-muted">{CATEGORY_LABELS[cat.category] ?? cat.category}</p>
              <p className="text-xl font-bold text-text-primary">{formatCurrency(cat.amount)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Category bar chart */}
      {byCategory.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-medium text-text-muted">Kategoriya bo'yicha</h3>
          <div className="space-y-2">
            {byCategory.map((cat) => {
              const maxAmount = byCategory[0]?.amount ?? 1;
              const percent = Math.round((cat.amount / maxAmount) * 100);
              const color = EXPENSE_COLORS[cat.category as keyof typeof EXPENSE_COLORS] ?? '#6B7280';
              return (
                <div key={cat.category} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs text-text-muted">{CATEGORY_LABELS[cat.category] ?? cat.category}</span>
                  <div className="flex-1">
                    <div className="h-6 overflow-hidden rounded-full bg-surface-secondary">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%`, backgroundColor: color }}
                        role="progressbar"
                        aria-valuenow={cat.amount}
                        aria-valuemax={maxAmount}
                        aria-label={`${CATEGORY_LABELS[cat.category] ?? cat.category}: ${formatCurrency(cat.amount)}`}
                      />
                    </div>
                  </div>
                  <span className="w-28 shrink-0 text-right text-sm font-medium text-text-primary">{formatCurrency(cat.amount)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="min-h-[44px] rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-primary-500"
          aria-label="Kategoriya"
        >
          <option value="">Barcha kategoriya</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="min-h-[44px] rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-primary-500" aria-label="Boshlanish sanasi" />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="min-h-[44px] rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-primary-500" aria-label="Tugash sanasi" />
      </div>

      {/* Expenses List */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Receipt className="mb-4 h-16 w-16" />
          <p className="text-lg font-medium">{t('common.noData')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map((expense) => {
            const color = EXPENSE_COLORS[expense.category as keyof typeof EXPENSE_COLORS] ?? '#6B7280';
            return (
              <div key={expense.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-shadow hover:shadow-card">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}20` }}>
                  <span className="text-lg font-bold" style={{ color }} aria-hidden="true">
                    {(CATEGORY_LABELS[expense.category] ?? expense.category).charAt(0)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text-primary">{expense.description}</p>
                  <p className="text-xs text-text-muted">{CATEGORY_LABELS[expense.category] ?? expense.category} | {formatDate(expense.date)}</p>
                </div>
                <p className="shrink-0 text-lg font-bold text-text-primary">{formatCurrency(Number(expense.amount))}</p>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => openEdit(expense)} className="min-h-[44px] min-w-[44px] rounded-lg p-2.5 text-text-muted hover:bg-surface-secondary hover:text-primary-600" aria-label={`${expense.description} ni tahrirlash`}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ id: expense.id, name: expense.description })}
                    className="min-h-[44px] min-w-[44px] rounded-lg p-2.5 text-text-muted hover:bg-danger-50 hover:text-danger-600"
                    aria-label={`${expense.description} ni o'chirish`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
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

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Xarajat tahrirlash' : 'Yangi xarajat'} size="sm">
        <div className="space-y-4">
          <div>
            <label htmlFor="exp-category" className="mb-1.5 block text-sm font-medium text-text-primary">Kategoriya</label>
            <select id="exp-category" value={category} onChange={(e) => setCategory(e.target.value)} className="min-h-[44px] w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:outline-2 focus:outline-offset-2 focus:outline-primary-500">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <Input id="exp-amount" label="Summa" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required />
          <Input id="exp-desc" label="Tavsif" value={description} onChange={(e) => setDescription(e.target.value)} required />
          <Input id="exp-date" label="Sana" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={createMut.isPending || updateMut.isPending}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} loading={createMut.isPending || updateMut.isPending} disabled={!amount || !description}>{t('common.save')}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xarajatni o'chirish"
        description={`"${deleteTarget?.name}" ni o'chirmoqchimisiz?`}
        confirmText="O'chirish"
        variant="danger"
        loading={deleteMut.isPending}
      />
    </div>
  );
}
