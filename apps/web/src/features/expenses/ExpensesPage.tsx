import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Trash2, Pencil, Receipt, ChevronLeft, ChevronRight,
  Home, Briefcase, Zap, Car, Megaphone, Wrench, Landmark, MoreHorizontal,
  TrendingUp, Hash, Calendar, Filter, X,
} from 'lucide-react';
import { formatCurrency, formatDate, EXPENSE_COLORS } from '@sardorbek/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useExpenses, useExpenseStats, useCreateExpense, useUpdateExpense, useDeleteExpense } from '@/hooks/useExpenses';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import type { ExpenseItem, ExpenseStats } from '@/types/api';

/* ─── Kategoriya ma'lumotlari ─── */
const CATEGORIES = [
  { key: 'RENT', label: 'Ijara', icon: Home },
  { key: 'SALARY', label: 'Maosh', icon: Briefcase },
  { key: 'UTILITIES', label: 'Komunal', icon: Zap },
  { key: 'TRANSPORT', label: 'Transport', icon: Car },
  { key: 'MARKETING', label: 'Reklama', icon: Megaphone },
  { key: 'REPAIR', label: "Ta'mir", icon: Wrench },
  { key: 'TAX', label: 'Soliq', icon: Landmark },
  { key: 'OTHER', label: 'Boshqa', icon: MoreHorizontal },
] as const;

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

function getCategoryIcon(key: string) {
  return CATEGORY_MAP[key]?.icon ?? MoreHorizontal;
}
function getCategoryLabel(key: string) {
  return CATEGORY_MAP[key]?.label ?? key;
}
function getCategoryColor(key: string) {
  return EXPENSE_COLORS[key as keyof typeof EXPENSE_COLORS] ?? '#6B7280';
}

function compactNum(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

/* ─── Main Page ─── */
export function ExpensesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const hasFilters = !!(categoryFilter || startDate || endDate);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [category, setCategory] = useState('OTHER');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]!);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useExpenses({
    page, limit: 20,
    category: categoryFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  const { data: statsData } = useExpenseStats(startDate || undefined, endDate || undefined);
  const createMut = useCreateExpense();
  const updateMut = useUpdateExpense();
  const deleteMut = useDeleteExpense();

  const expenses: ExpenseItem[] = data?.data ?? [];
  const pagination = data?.pagination;
  const stats: ExpenseStats | undefined = statsData?.data;
  const byCategory = stats?.byCategory ?? [];
  const totalCatAmount = useMemo(() => byCategory.reduce((s, c) => s + c.amount, 0), [byCategory]);

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

  function clearFilters() {
    setCategoryFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER
     Mobile:    1 col — stats → chart → filters → list
     Tablet:    1 col — stats row → chart → filters → list
     Notebook+: 2 col — [stats + chart] sidebar | [filters + list] main
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="p-3 sm:p-4 lg:p-6 animate-fade-in">
      {/* ═══ Header ═══ */}
      <div className="mb-4 lg:mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-text-primary">{t('nav.expenses')}</h1>
          <p className="text-[11px] sm:text-xs lg:text-sm text-text-muted mt-0.5">Xarajat boshqaruvi</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-primary-700 active:scale-[0.97] transition-all"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Xarajat qo'shish</span>
          <span className="sm:hidden">Qo'shish</span>
        </button>
      </div>

      {/* ═══ Notebook: 2-column layout ═══ */}
      <div className="lg:flex lg:gap-5">

        {/* ──── LEFT: Stats + Chart (notebook'da sidebar) ──── */}
        <div className="lg:w-80 xl:w-96 lg:shrink-0 space-y-3 sm:space-y-4 mb-4 lg:mb-0">

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="rounded-xl sm:rounded-2xl bg-surface p-3 sm:p-4" style={{ border: '1px solid var(--color-border-subtle)' }}>
                <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
                  <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-danger-50">
                    <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-danger-600" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-text-muted">Jami xarajat</span>
                </div>
                <p className="text-sm sm:text-lg lg:text-base xl:text-lg font-bold text-text-primary tabular-nums leading-tight">
                  {formatCurrency(stats.totalAmount)}
                </p>
              </div>

              <div className="rounded-xl sm:rounded-2xl bg-surface p-3 sm:p-4" style={{ border: '1px solid var(--color-border-subtle)' }}>
                <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
                  <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-primary-50">
                    <Hash className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary-600" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-text-muted">Soni</span>
                </div>
                <p className="text-sm sm:text-lg lg:text-base xl:text-lg font-bold text-text-primary tabular-nums leading-tight">
                  {stats.totalCount}
                </p>
              </div>

              {byCategory.slice(0, 2).map((cat) => {
                const color = getCategoryColor(cat.category);
                const Icon = getCategoryIcon(cat.category);
                return (
                  <div key={cat.category} className="rounded-xl sm:rounded-2xl bg-surface p-3 sm:p-4" style={{ border: '1px solid var(--color-border-subtle)' }}>
                    <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
                      <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}15` }}>
                        <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" style={{ color }} />
                      </div>
                      <span className="text-[10px] sm:text-[11px] text-text-muted truncate">{getCategoryLabel(cat.category)}</span>
                    </div>
                    <p className="text-sm sm:text-lg lg:text-base xl:text-lg font-bold text-text-primary tabular-nums leading-tight">
                      {formatCurrency(cat.amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Category Chart */}
          {byCategory.length > 0 && (
            <div className="rounded-xl sm:rounded-2xl bg-surface p-3 sm:p-4" style={{ border: '1px solid var(--color-border-subtle)' }}>
              <p className="text-[11px] sm:text-xs font-medium text-text-muted mb-2.5 sm:mb-3">Kategoriya bo'yicha</p>
              <div className="space-y-1.5 sm:space-y-2">
                {byCategory.map((cat) => {
                  const color = getCategoryColor(cat.category);
                  const Icon = getCategoryIcon(cat.category);
                  const pct = totalCatAmount > 0 ? Math.round((cat.amount / totalCatAmount) * 100) : 0;
                  return (
                    <div key={cat.category} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 w-20 sm:w-24 lg:w-20 xl:w-24 shrink-0">
                        <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-md" style={{ backgroundColor: `${color}18` }}>
                          <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3" style={{ color }} />
                        </div>
                        <span className="text-[10px] sm:text-xs lg:text-[10px] xl:text-xs text-text-secondary truncate">{getCategoryLabel(cat.category)}</span>
                      </div>

                      <div className="flex-1 h-4 sm:h-5 rounded-full bg-surface-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 flex items-center justify-end px-1"
                          style={{ width: `${Math.max(pct, 6)}%`, backgroundColor: color }}
                        >
                          {pct >= 18 && <span className="text-[8px] sm:text-[9px] font-bold text-white">{pct}%</span>}
                        </div>
                      </div>

                      <span className="text-[10px] sm:text-xs lg:text-[10px] xl:text-xs font-semibold text-text-primary tabular-nums w-16 sm:w-24 lg:w-16 xl:w-20 text-right shrink-0">
                        <span className="lg:hidden sm:hidden">{compactNum(cat.amount)}</span>
                        <span className="hidden sm:inline lg:hidden">{formatCurrency(cat.amount)}</span>
                        <span className="hidden lg:inline xl:hidden">{compactNum(cat.amount)}</span>
                        <span className="hidden xl:inline">{formatCurrency(cat.amount)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ──── RIGHT: Filters + List (notebook'da main area) ──── */}
        <div className="flex-1 min-w-0">

          {/* Filters */}
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            {/* Mobile filter toggle */}
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className={cn(
                'sm:hidden flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                hasFilters ? 'bg-primary-50 text-primary-700' : 'bg-surface text-text-muted',
              )}
              style={{ border: '1px solid var(--color-border)', minHeight: 'auto', minWidth: 'auto' }}
            >
              <Filter className="h-3.5 w-3.5" />
              Filtr
              {hasFilters && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 text-[9px] font-bold text-white px-1">
                  {[categoryFilter, startDate, endDate].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Desktop/Notebook category pills */}
            <div className="hidden sm:flex items-center gap-1 lg:gap-1.5 flex-wrap">
              <button
                onClick={() => { setCategoryFilter(''); setPage(1); }}
                className={cn(
                  'rounded-lg px-2 lg:px-3 py-1.5 text-[11px] lg:text-xs font-medium transition-colors',
                  !categoryFilter ? 'bg-primary-600 text-white' : 'bg-surface text-text-muted hover:bg-surface-secondary',
                )}
                style={categoryFilter ? { border: '1px solid var(--color-border-subtle)' } : undefined}
              >
                Barchasi
              </button>
              {CATEGORIES.map((cat) => {
                const active = categoryFilter === cat.key;
                const color = getCategoryColor(cat.key);
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.key}
                    onClick={() => { setCategoryFilter(active ? '' : cat.key); setPage(1); }}
                    className={cn(
                      'flex items-center gap-1 rounded-lg px-2 lg:px-2.5 py-1.5 text-[11px] lg:text-xs font-medium transition-colors',
                      active ? 'text-white shadow-sm' : 'bg-surface text-text-muted hover:bg-surface-secondary',
                    )}
                    style={active ? { backgroundColor: color } : { border: '1px solid var(--color-border-subtle)' }}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="hidden md:inline">{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Desktop date filters */}
            <div className="hidden sm:flex items-center gap-1.5 ml-auto">
              <Calendar className="h-3.5 w-3.5 text-text-muted hidden md:block" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-[11px] lg:text-xs text-text-primary focus:border-primary-500 focus:outline-none w-[120px] lg:w-[130px]"
              />
              <span className="text-[11px] text-text-muted">—</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-[11px] lg:text-xs text-text-primary focus:border-primary-500 focus:outline-none w-[120px] lg:w-[130px]"
              />
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-text-muted hover:bg-surface-secondary transition-colors"
                  style={{ minHeight: 'auto', minWidth: 'auto' }}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Count */}
            {pagination && (
              <span className="ml-auto sm:ml-0 text-[10px] sm:text-[11px] text-text-muted tabular-nums">
                {pagination.total} ta
              </span>
            )}
          </div>

          {/* Mobile filter panel */}
          {filterOpen && (
            <div className="sm:hidden mb-3 rounded-xl bg-surface p-3 space-y-3 animate-slide-down" style={{ border: '1px solid var(--color-border-subtle)' }}>
              <div>
                <p className="text-[10px] font-medium text-text-muted mb-2 uppercase tracking-wider">Kategoriya</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => { setCategoryFilter(''); setPage(1); }}
                    className={cn(
                      'rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors',
                      !categoryFilter ? 'bg-primary-600 text-white' : 'bg-surface-secondary text-text-muted',
                    )}
                  >
                    Barchasi
                  </button>
                  {CATEGORIES.map((cat) => {
                    const active = categoryFilter === cat.key;
                    const color = getCategoryColor(cat.key);
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.key}
                        onClick={() => { setCategoryFilter(active ? '' : cat.key); setPage(1); }}
                        className={cn(
                          'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors',
                          active ? 'text-white' : 'bg-surface-secondary text-text-muted',
                        )}
                        style={active ? { backgroundColor: color } : undefined}
                      >
                        <Icon className="h-3 w-3" />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-medium text-text-muted mb-2 uppercase tracking-wider">Sana oralig'i</p>
                <div className="flex items-center gap-2">
                  <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="flex-1 rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-text-primary focus:border-primary-500 focus:outline-none" />
                  <span className="text-xs text-text-muted">—</span>
                  <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="flex-1 rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-text-primary focus:border-primary-500 focus:outline-none" />
                </div>
              </div>
              {hasFilters && (
                <button onClick={clearFilters} className="w-full rounded-lg py-2 text-xs font-medium text-danger-600 hover:bg-danger-50 transition-colors">
                  Filtrlarni tozalash
                </button>
              )}
            </div>
          )}

          {/* ═══ Expenses List ═══ */}
          {isLoading ? (
            <div className="space-y-1.5 sm:space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-surface p-3 sm:p-3.5" style={{ border: '1px solid var(--color-border-subtle)' }}>
                  <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-surface-secondary animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-28 sm:w-36 rounded bg-surface-secondary animate-pulse" />
                    <div className="h-2.5 w-16 sm:w-20 rounded bg-surface-secondary animate-pulse" />
                  </div>
                  <div className="h-3.5 w-20 rounded bg-surface-secondary animate-pulse" />
                </div>
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 lg:py-16 text-center">
              <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-surface-secondary mb-3 sm:mb-4">
                <Receipt className="h-6 w-6 sm:h-7 sm:w-7 text-text-muted/40" />
              </div>
              <p className="text-sm font-medium text-text-primary mb-1">{t('common.noData')}</p>
              <p className="text-xs text-text-muted mb-3">
                {hasFilters ? "Filtrga mos xarajat topilmadi" : "Birinchi xarajatni qo'shing"}
              </p>
              {hasFilters ? (
                <button onClick={clearFilters} className="text-xs text-primary-600 font-medium hover:underline">Filtrlarni tozalash</button>
              ) : (
                <button onClick={openCreate} className="text-xs text-primary-600 font-medium hover:underline">+ Xarajat qo'shish</button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {expenses.map((expense) => {
                const color = getCategoryColor(expense.category);
                const Icon = getCategoryIcon(expense.category);
                return (
                  <div
                    key={expense.id}
                    className="group flex items-center gap-2.5 sm:gap-3 rounded-xl bg-surface p-2.5 sm:p-3.5 transition-all hover:shadow-card active:scale-[0.998]"
                    style={{ border: '1px solid var(--color-border-subtle)' }}
                  >
                    {/* Category icon */}
                    <div
                      className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${color}12` }}
                    >
                      <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" style={{ color }} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] sm:text-sm font-semibold text-text-primary truncate">{expense.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="inline-flex items-center rounded px-1.5 py-px text-[9px] sm:text-[10px] font-medium"
                          style={{ backgroundColor: `${color}12`, color }}
                        >
                          {getCategoryLabel(expense.category)}
                        </span>
                        <span className="text-[10px] text-text-muted">{formatDate(expense.date)}</span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="shrink-0 text-right">
                      <p className="text-[13px] sm:text-sm lg:text-sm font-bold text-danger-600 tabular-nums whitespace-nowrap">
                        <span className="sm:hidden">-{compactNum(Number(expense.amount))}</span>
                        <span className="hidden sm:inline">-{formatCurrency(Number(expense.amount))}</span>
                      </p>
                    </div>

                    {/* Actions — mobile: always visible, desktop: on hover */}
                    <div className="flex shrink-0 items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(expense)}
                        className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-text-muted hover:bg-primary-50 hover:text-primary-600 transition-colors"
                        style={{ minHeight: 'auto', minWidth: 'auto' }}
                        aria-label="Tahrirlash"
                      >
                        <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: expense.id, name: expense.description })}
                        className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-text-muted hover:bg-danger-50 hover:text-danger-600 transition-colors"
                        style={{ minHeight: 'auto', minWidth: 'auto' }}
                        aria-label="O'chirish"
                      >
                        <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:bg-surface-secondary disabled:opacity-40 transition-colors"
                style={{ minHeight: 'auto', minWidth: 'auto' }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[11px] sm:text-xs font-medium text-text-muted tabular-nums">
                {page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.totalPages}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:bg-surface-secondary disabled:opacity-40 transition-colors"
                style={{ minHeight: 'auto', minWidth: 'auto' }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Create/Edit Modal ═══ */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Xarajat tahrirlash' : 'Yangi xarajat'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-[12px] font-medium text-text-secondary">Kategoriya</label>
            <div className="grid grid-cols-4 gap-1.5">
              {CATEGORIES.map((cat) => {
                const active = category === cat.key;
                const color = getCategoryColor(cat.key);
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategory(cat.key)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl py-2.5 text-[10px] font-medium transition-all',
                      active ? 'text-white shadow-sm scale-[1.02]' : 'bg-surface-secondary text-text-muted hover:bg-surface-tertiary',
                    )}
                    style={active ? { backgroundColor: color } : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Input id="exp-amount" label="Summa" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required />
          <Input id="exp-desc" label="Tavsif" value={description} onChange={(e) => setDescription(e.target.value)} required />
          <Input id="exp-date" label="Sana" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

          <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={createMut.isPending || updateMut.isPending} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} loading={createMut.isPending || updateMut.isPending} disabled={!amount || !description} className="flex-1">
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══ Delete Confirmation ═══ */}
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
