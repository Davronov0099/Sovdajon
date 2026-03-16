import { useMemo } from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import { useProfitTrend, useTopProducts } from '@/hooks/useDashboard';

const PERIOD_LABELS: Record<string, string> = {
  today: 'Bugun',
  week: 'Hafta',
  month: 'Oy',
  year: 'Yil',
};

export function ProfitReportPage() {
  const searchParams = useSearch({ strict: false }) as Record<string, string>;
  const period = searchParams.period ?? 'today';
  const start = searchParams.start;
  const end = searchParams.end;

  const { data: profitData, isLoading: profitLoading } = useProfitTrend(start, end);
  const { data: productsData, isLoading: productsLoading } = useTopProducts(start, end);

  const profitTrend = profitData?.data ?? [];
  const topProducts = productsData?.data ?? [];

  const totals = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    let profit = 0;
    for (const p of profitTrend) {
      revenue += p.revenue;
      cost += p.cost;
      profit += p.profit;
    }
    return { revenue, cost, profit, margin: revenue > 0 ? Math.round((profit / revenue) * 100) : 0 };
  }, [profitTrend]);

  const isLoading = profitLoading || productsLoading;

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link to="/" className="inline-flex items-center justify-center rounded-lg p-2 text-text-muted hover:bg-surface-tertiary hover:text-text-primary transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Foyda hisoboti</h1>
          <p className="text-sm text-text-muted mt-0.5">{PERIOD_LABELS[period] ?? period}</p>
        </div>
      </div>

      {/* Summary */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[100px] rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
          <div className="stat-card">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 mb-2">
              <DollarSign className="h-4 w-4 text-primary-600" />
            </div>
            <p className="stat-value">{formatCurrency(totals.revenue)}</p>
            <p className="stat-label mt-1">Tushum</p>
          </div>
          <div className="stat-card">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning-50 mb-2">
              <TrendingDown className="h-4 w-4 text-warning-600" />
            </div>
            <p className="stat-value">{formatCurrency(totals.cost)}</p>
            <p className="stat-label mt-1">Tan narx</p>
          </div>
          <div className="stat-card">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-50 mb-2">
              <TrendingUp className="h-4 w-4 text-success-600" />
            </div>
            <p className={`stat-value ${totals.profit >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
              {formatCurrency(totals.profit)}
            </p>
            <p className="stat-label mt-1">Sof foyda</p>
          </div>
          <div className="stat-card">
            <p className={`stat-value text-2xl ${totals.margin >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
              {totals.margin}%
            </p>
            <p className="stat-label mt-1">Foyda margini</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profit Trend */}
        <div className="card-flat p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Kunlik foyda trendi</h3>
          {profitTrend.length > 0 ? (
            <div className="space-y-2">
              {profitTrend.map((p, i) => {
                const maxVal = Math.max(...profitTrend.map((t) => Math.max(t.revenue, Math.abs(t.profit))), 1);
                const revenueWidth = Math.max((p.revenue / maxVal) * 100, 4);
                const profitWidth = Math.max((Math.abs(p.profit) / maxVal) * 100, 4);
                const dateStr = p.date.includes('T') ? p.date.split('T')[0]! : p.date;

                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-xs text-text-muted tabular-nums">{dateStr.slice(5)}</span>
                    <div className="flex-1 space-y-0.5">
                      <div className="h-2.5 rounded-full bg-surface-tertiary overflow-hidden">
                        <div className="h-full rounded-full bg-primary-400" style={{ width: `${revenueWidth}%` }} />
                      </div>
                      <div className="h-2.5 rounded-full bg-surface-tertiary overflow-hidden">
                        <div className={`h-full rounded-full ${p.profit >= 0 ? 'bg-success-500' : 'bg-danger-500'}`} style={{ width: `${profitWidth}%` }} />
                      </div>
                    </div>
                    <div className="w-24 shrink-0 text-right">
                      <p className="text-xs font-medium text-text-primary tabular-nums">{formatCurrency(p.revenue)}</p>
                      <p className={`text-[10px] font-medium tabular-nums ${p.profit >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                        {formatCurrency(p.profit)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-text-muted">Ma'lumot yo'q</div>
          )}
          <div className="flex items-center gap-4 mt-4 text-[10px] text-text-muted">
            <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full bg-primary-400" /> Tushum</span>
            <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full bg-success-500" /> Foyda</span>
          </div>
        </div>

        {/* Top Products by Revenue */}
        <div className="card-flat p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Top mahsulotlar (daromad bo'yicha)</h3>
            <Package className="h-4 w-4 text-text-muted" />
          </div>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.slice(0, 10).map((p, i) => (
                <div key={p.productId} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-tertiary text-xs font-bold text-text-muted">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">{p.productName}</p>
                    <p className="text-xs text-text-muted">{p.totalQty} dona</p>
                  </div>
                  <span className="text-sm font-semibold text-text-primary tabular-nums">{formatCurrency(p.totalRevenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-text-muted">Ma'lumot yo'q</div>
          )}
        </div>
      </div>
    </div>
  );
}
