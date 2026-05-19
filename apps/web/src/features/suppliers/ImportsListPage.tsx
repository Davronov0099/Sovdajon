import { useMemo } from 'react';
import { Link, useSearch, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Wallet, CreditCard, Layers, BarChart3, Phone, Package, Calendar } from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { useImports, useImportStats } from '@/hooks/useSuppliers';
import { useDashboardFilter, todayStr, dayStartISO, dayEndISO } from '@/stores/dashboardFilter';
import { cn } from '@/lib/cn';

type FilterKey = 'all' | 'cash' | 'debt' | 'mixed';

const FILTER_CONFIG: Record<FilterKey, { label: string; icon: typeof Wallet; color: string; bg: string; ring: string; }> = {
  all:   { label: 'Barcha kirimlar', icon: BarChart3,  color: 'text-primary-700', bg: 'bg-primary-50', ring: 'ring-primary-200' },
  cash:  { label: 'Naqdga kirimlar', icon: Wallet,     color: 'text-success-700', bg: 'bg-success-50', ring: 'ring-success-200' },
  debt:  { label: 'Qarzga kirimlar', icon: CreditCard, color: 'text-warning-700', bg: 'bg-warning-50', ring: 'ring-warning-200' },
  mixed: { label: 'Aralash kirimlar', icon: Layers,     color: 'text-primary-700', bg: 'bg-primary-50', ring: 'ring-primary-200' },
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function ImportsListPage() {
  const search = useSearch({ from: '/_auth/suppliers_/imports' }) as { filter?: FilterKey };
  const navigate = useNavigate();
  const filter: FilterKey = search.filter ?? 'all';

  // Dashboard sana filtri — doimiy saqlangan (localStorage), shu sahifada ham ishlaydi
  const { from, to, setFrom, setTo, setRange, resetToday } = useDashboardFilter();
  const start = dayStartISO(from);
  const end = dayEndISO(to);

  const { data: statsResp } = useImportStats(start, end);
  const { data: listResp, isLoading } = useImports(filter, 1, 200, start, end);
  const stats = statsResp?.data;

  const items = useMemo(() => listResp?.data ?? [], [listResp]);
  const total = listResp?.total ?? 0;

  const sumForFilter = filter === 'all' ? stats?.total.sum :
                       filter === 'cash' ? stats?.cash.sum :
                       filter === 'debt' ? stats?.debt.sum :
                       stats?.mixed.sum;
  const countForFilter = filter === 'all' ? stats?.total.count :
                         filter === 'cash' ? stats?.cash.count :
                         filter === 'debt' ? stats?.debt.count :
                         stats?.mixed.count;

  const cfg = FILTER_CONFIG[filter];

  function setFilter(f: FilterKey) {
    navigate({ to: '/suppliers/imports', search: { filter: f } });
  }

  return (
    <div className="p-3 sm:p-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link to="/suppliers" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-secondary transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-xl font-bold text-text-primary">{cfg.label}</h1>
            <p className="text-[11px] sm:text-xs text-text-muted truncate">Ta'minotchilardan qabul qilingan kirimlar ro'yxati</p>
          </div>
        </div>
        {/* Sana filtri — dashboard bilan bir xil, doimiy saqlanadi */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <span className="text-[10px] sm:text-[11px] font-medium text-text-muted shrink-0">Dan</span>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => { const v = e.target.value || todayStr(); if (v > to) setRange(v, v); else setFrom(v); }}
              className="bg-transparent text-[11px] sm:text-xs font-medium text-text-primary outline-none tabular-nums"
            />
          </div>
          <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <span className="text-[10px] sm:text-[11px] font-medium text-text-muted shrink-0">Gacha</span>
            <input
              type="date"
              value={to}
              min={from}
              max={todayStr()}
              onChange={(e) => setTo(e.target.value || todayStr())}
              className="bg-transparent text-[11px] sm:text-xs font-medium text-text-primary outline-none tabular-nums"
            />
          </div>
          <button
            onClick={() => resetToday()}
            className="px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold text-primary-600 hover:bg-primary-50 transition-colors shrink-0"
            style={{ minHeight: 'auto', minWidth: 'auto', border: '1px solid var(--color-border)' }}
            title="Bugunga qaytarish"
          >
            Bugun
          </button>
        </div>
      </div>

      {/* Hero summary card */}
      {stats && (
        <div className={cn('mb-4 rounded-xl p-4 sm:p-5 ring-2', cfg.bg, cfg.ring)}>
          <div className="flex items-center gap-4">
            <div className={cn('flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-surface shadow-sm', cfg.color)}>
              <cfg.icon className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn('text-[11px] sm:text-xs font-semibold uppercase', cfg.color)}>{cfg.label}</p>
              <p className={cn('text-2xl sm:text-3xl font-bold tabular-nums', cfg.color)}>{formatCurrency(sumForFilter ?? 0)}</p>
              <p className="text-[11px] text-text-muted mt-0.5 tabular-nums">{countForFilter ?? 0} ta tranzaksiya</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="mb-4 grid grid-cols-4 gap-1.5">
        {(['all', 'cash', 'debt', 'mixed'] as FilterKey[]).map((k) => {
          const f = FILTER_CONFIG[k];
          const active = filter === k;
          const Icon = f.icon;
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border px-2 py-2 transition-all text-center',
                active ? cn('border-2', f.bg, f.color) : 'border-border bg-surface text-text-muted hover:border-text-muted/30',
              )}
              style={{ minHeight: 'auto', minWidth: 'auto' }}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="text-[10px] sm:text-[11px] font-semibold">{f.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <Package className="h-12 w-12 opacity-20 mb-3" />
          <p className="text-sm font-medium">Bu kategoriyada kirim yo'q</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-text-muted font-medium">{total} ta natija</p>
          {items.map((it) => {
            const t = Number(it.total);
            const p = Number(it.paidAmount);
            const d = it.debtAmount;
            const itemFilter: FilterKey = p === 0 ? 'debt' : p >= t ? 'cash' : 'mixed';
            const itemCfg = FILTER_CONFIG[itemFilter];
            const ItemIcon = itemCfg.icon;

            return (
              <Link
                key={it.id}
                to="/suppliers/$supplierId"
                params={{ supplierId: it.supplierId }}
                className="block card p-3 sm:p-4 hover:shadow-card-hover active:scale-[0.99] transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className={cn('flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg', itemCfg.bg, itemCfg.color)}>
                    <ItemIcon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Top row: supplier name + total */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-[13px] sm:text-sm font-bold text-text-primary truncate flex-1">{it.supplierName}</p>
                      <span className="text-[13px] sm:text-sm font-bold text-text-primary tabular-nums shrink-0">{formatCurrency(t)}</span>
                    </div>

                    {/* Phone + date */}
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] sm:text-[11px] text-text-muted mb-1.5">
                      {it.supplierPhone && (
                        <span className="inline-flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{it.supplierPhone}</span>
                      )}
                      <span className="inline-flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />{fmtDate(it.createdAt)}</span>
                      <span className="inline-flex items-center gap-1"><Package className="h-2.5 w-2.5" />{it.itemCount} mahsulot</span>
                    </div>

                    {/* Breakdown chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {p > 0 && (
                        <span className="inline-flex items-center gap-1 rounded bg-success-50 px-1.5 py-0.5 text-[10px] font-semibold text-success-700 tabular-nums">
                          <Wallet className="h-2.5 w-2.5" />
                          Naqd: {formatCurrency(p)}
                        </span>
                      )}
                      {d > 0 && (
                        <span className="inline-flex items-center gap-1 rounded bg-warning-50 px-1.5 py-0.5 text-[10px] font-semibold text-warning-700 tabular-nums">
                          <CreditCard className="h-2.5 w-2.5" />
                          Qarz: {formatCurrency(d)}
                        </span>
                      )}
                    </div>

                    {/* Note */}
                    {it.note && (
                      <p className="mt-1.5 text-[10px] sm:text-[11px] text-text-muted line-clamp-2 italic">"{it.note}"</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
