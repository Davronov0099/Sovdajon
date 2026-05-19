import { useState, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  DollarSign, ShoppingCart, CreditCard, TrendingUp,
  Banknote, ArrowUpRight, ArrowDownRight, BarChart3, Users, Package,
  Smartphone, CreditCard as CardIcon, Receipt,
  ArrowDownToLine, Wallet, Layers, UserCheck, LayoutDashboard,
  AlertCircle, ChevronRight,
} from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import {
  useDashboardSummary, useSalesTrend, useTopProducts, useTopCustomers,
  useDebtAging,
} from '@/hooks/useDashboard';
import { useCustomers } from '@/hooks/useCustomers';
import { useImportStats } from '@/hooks/useSuppliers';
import { cn } from '@/lib/cn';

export const Route = createFileRoute('/_auth/')({
  component: DashboardPage,
});

function toLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDateRange(period: string) {
  const now = new Date();
  const end = `${toLocalDate(now)}T23:59:59`;
  const d = new Date(now);
  switch (period) {
    case 'today': break;
    case 'week': d.setDate(d.getDate() - 7); break;
    case 'month': d.setMonth(d.getMonth() - 1); break;
    case 'year': d.setFullYear(d.getFullYear() - 1); break;
    default: d.setMonth(d.getMonth() - 1);
  }
  return { start: `${toLocalDate(d)}T00:00:00`, end };
}

const PERIODS = [
  { key: 'today', label: 'Bugun' },
  { key: 'week', label: 'Hafta' },
  { key: 'month', label: 'Oy' },
  { key: 'year', label: 'Yil' },
] as const;

type TabKey = 'home' | 'sales' | 'imports';
const TABS: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'home', label: 'Bosh sahifa', icon: LayoutDashboard },
  { key: 'sales', label: 'Savdo', icon: ShoppingCart },
  { key: 'imports', label: 'Kirim', icon: ArrowDownToLine },
];

function compactMoney(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

function DashboardPage() {
  const [tab, setTab] = useState<TabKey>('home');
  const [period, setPeriod] = useState('today');
  const { start, end } = useMemo(() => getDateRange(period), [period]);

  const { data: summaryData, isLoading } = useDashboardSummary(start, end);
  const { data: trendData } = useSalesTrend(start, end);
  const { data: topProductsData } = useTopProducts(start, end);
  const { data: topCustomersData } = useTopCustomers(start, end);
  const { data: debtAgingData } = useDebtAging();
  const { data: customersData } = useCustomers({ page: 1, limit: 1 });
  const { data: importStatsResp } = useImportStats();

  const summary = summaryData?.data;
  const trend = trendData?.data ?? [];
  const topProducts = topProductsData?.data ?? [];
  const topCustomers = topCustomersData?.data ?? [];
  const debtAging = debtAgingData?.data ?? [];
  const totalCustomers = customersData?.pagination?.total ?? 0;
  const importStats = importStatsResp?.data;

  const showPeriod = tab === 'sales' || tab === 'home';

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 animate-fade-in">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-text-primary">Boshqaruv paneli</h1>
          <p className="text-[11px] sm:text-sm text-text-muted mt-0.5 hidden sm:block">SovdaJON — umumiy ko'rinish</p>
        </div>
        {showPeriod && (
          <div className="flex rounded-lg p-0.5 sm:p-1 gap-0.5 shrink-0" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  'px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-medium transition-all',
                  period === p.key ? 'bg-primary-600 text-white shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface-tertiary',
                )}
                style={{ minHeight: 'auto', minWidth: 'auto' }}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Tabs ═══ */}
      <div className="flex gap-1 sm:gap-2 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
        {TABS.map((tb) => {
          const Icon = tb.icon;
          const active = tab === tb.key;
          return (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 sm:px-4 py-2 text-[12px] sm:text-sm font-semibold whitespace-nowrap transition-all shrink-0',
                active ? 'bg-primary-600 text-white shadow-sm' : 'bg-surface text-text-muted hover:text-text-primary hover:bg-surface-secondary',
              )}
              style={{ minHeight: 'auto', minWidth: 'auto', border: active ? 'none' : '1px solid var(--color-border-subtle)' }}
            >
              <Icon className="h-4 w-4" />
              {tb.label}
            </button>
          );
        })}
      </div>

      {isLoading && !summary ? (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[80px] sm:h-[100px] rounded-xl bg-surface-secondary animate-pulse" />
          ))}
        </div>
      ) : tab === 'home' ? (
        <HomeTab
          summary={summary}
          totalCustomers={totalCustomers}
          importStats={importStats}
          trend={trend}
          period={period} start={start} end={end}
          onTab={setTab}
        />
      ) : tab === 'sales' ? (
        <SalesTab
          summary={summary}
          trend={trend}
          topProducts={topProducts}
          topCustomers={topCustomers}
          debtAging={debtAging}
          period={period} start={start} end={end}
        />
      ) : (
        <ImportsTab importStats={importStats} />
      )}
    </div>
  );
}

/* ════════════════════ HOME TAB ════════════════════ */
interface SummaryShape {
  totalSales: number; totalCount: number; profit: number; totalExpenses: number;
  activeDebts: number; debtCount: number; cash: number; card: number; click: number; debt: number;
}
type TrendPoint = { date: string; total: number };

function HomeTab({ summary, totalCustomers, importStats, trend, period, start, end, onTab }: {
  summary?: SummaryShape;
  totalCustomers: number;
  importStats?: import('@/hooks/useSuppliers').ImportStats;
  trend: TrendPoint[];
  period: string; start: string; end: string;
  onTab: (t: TabKey) => void;
}) {
  return (
    <>
      {/* Hero KPI */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatCard label="Jami sotuv" value={formatCurrency(summary?.totalSales ?? 0)} subtext={`${summary?.totalCount ?? 0} ta chek`} icon={ShoppingCart} iconBg="bg-primary-50" iconColor="text-primary-600" href={`/reports/sales?period=${period}&start=${start}&end=${end}`} />
        <StatCard label="Sof foyda" value={formatCurrency(summary?.profit ?? 0)} icon={TrendingUp} iconBg="bg-success-50" iconColor="text-success-600" href={`/reports/profit?period=${period}&start=${start}&end=${end}`} />
        <StatCard label="Jami mijozlar" value={String(totalCustomers)} subtext="ro'yxatda" icon={UserCheck} iconBg="bg-emerald-50" iconColor="text-emerald-600" href="/customers" />
        <StatCard label="Faol qarzlar" value={formatCurrency(summary?.activeDebts ?? 0)} subtext={`${summary?.debtCount ?? 0} ta`} icon={CreditCard} iconBg="bg-danger-50" iconColor="text-danger-600" href="/debts?status=ACTIVE" />
      </div>

      {/* Quick navigation to sections */}
      <div>
        <p className="text-[10px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Bo'limlar</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <NavTile
            title="Savdo tahlili"
            desc="Sotuvlar, foyda, to'lov usullari, top mahsulot/mijoz"
            icon={ShoppingCart}
            bg="bg-primary-50" color="text-primary-600"
            onClick={() => onTab('sales')}
          />
          <NavTile
            title="Kirimlar"
            desc="Naqd / Qarz / Aralash kirimlar va ta'minotchi qarzlari"
            icon={ArrowDownToLine}
            bg="bg-blue-50" color="text-blue-600"
            onClick={() => onTab('imports')}
          />
          <NavTileLink
            title="Hisobotlar"
            desc="Sotuv va foyda bo'yicha to'liq hisobotlar"
            icon={BarChart3}
            bg="bg-violet-50" color="text-violet-600"
            to={`/reports/sales?period=${period}&start=${start}&end=${end}`}
          />
        </div>
      </div>

      {/* Mini overview: imports + sales trend */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="card-flat p-3.5 sm:p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] sm:text-sm font-semibold text-text-primary">Sotuv trendi</h3>
            <BarChart3 className="h-4 w-4 text-text-muted" />
          </div>
          <TrendChart trend={trend} />
        </div>
        <div className="card-flat p-3.5 sm:p-5">
          <h3 className="text-[13px] sm:text-sm font-semibold text-text-primary mb-3">Kirimlar qisqacha</h3>
          <div className="space-y-2.5">
            <MiniStat label="Barcha kirimlar" value={importStats?.total.count ?? 0} money={importStats?.total.sum ?? 0} color="text-blue-600" />
            <MiniStat label="Naqdga" value={importStats?.cash.count ?? 0} money={importStats?.cash.sum ?? 0} color="text-success-600" />
            <MiniStat label="Qarzga" value={importStats?.debt.count ?? 0} money={importStats?.debt.sum ?? 0} color="text-warning-600" />
            <div className="pt-2 mt-1" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
              <MiniStat label="Joriy qarz" value={null} money={importStats?.outstandingDebt ?? 0} color="text-danger-600" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ════════════════════ SALES TAB ════════════════════ */
function SalesTab({ summary, trend, topProducts, topCustomers, debtAging, period, start, end }: {
  summary?: SummaryShape;
  trend: TrendPoint[];
  topProducts: Array<{ productId: string; productName: string; totalQty: number; totalRevenue: number }>;
  topCustomers: Array<{ customerId: string; customerName: string; receiptCount: number; totalSpent: number }>;
  debtAging: Array<{ period: string; amount: number }>;
  period: string; start: string; end: string;
}) {
  return (
    <>
      {/* Main sales cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        <StatCard label="Barcha savdolar" value={formatCurrency(summary?.totalSales ?? 0)} subtext={`${summary?.totalCount ?? 0} ta chek`} icon={ShoppingCart} iconBg="bg-primary-50" iconColor="text-primary-600" href={`/reports/sales?period=${period}&start=${start}&end=${end}`} />
        <StatCard label="Sof foyda" value={formatCurrency(summary?.profit ?? 0)} icon={TrendingUp} iconBg="bg-success-50" iconColor="text-success-600" href={`/reports/profit?period=${period}&start=${start}&end=${end}`} />
        <StatCard label="Xarajatlar" value={formatCurrency(summary?.totalExpenses ?? 0)} icon={Receipt} iconBg="bg-orange-50" iconColor="text-orange-600" href="/expenses" />
        <StatCard label="Faol qarzlar" value={formatCurrency(summary?.activeDebts ?? 0)} subtext={`${summary?.debtCount ?? 0} ta`} icon={CreditCard} iconBg="bg-danger-50" iconColor="text-danger-600" href="/debts?status=ACTIVE" />
      </div>

      {/* Payment methods */}
      <div>
        <p className="text-[10px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">To'lov usullari</p>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
          {[
            { label: 'Naqd pul', value: summary?.cash ?? 0, icon: Banknote, bg: 'bg-emerald-50', color: 'text-emerald-600', m: 'CASH' },
            { label: 'Karta', value: summary?.card ?? 0, icon: CardIcon, bg: 'bg-blue-50', color: 'text-blue-600', m: 'CARD' },
            { label: 'Click', value: summary?.click ?? 0, icon: Smartphone, bg: 'bg-violet-50', color: 'text-violet-600', m: 'CLICK' },
            { label: 'Qarzga sotuv', value: summary?.debt ?? 0, icon: Receipt, bg: 'bg-orange-50', color: 'text-orange-600', m: 'DEBT' },
          ].map((c) => (
            <StatCard key={c.label} label={c.label} value={formatCurrency(c.value)} icon={c.icon} iconBg={c.bg} iconColor={c.color} href={`/reports/sales?period=${period}&start=${start}&end=${end}&method=${c.m}`} />
          ))}
        </div>
      </div>

      {/* Trend + Debt aging */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
        <div className="card-flat p-3.5 sm:p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-[13px] sm:text-sm font-semibold text-text-primary">Sotuv trendi</h3>
            <BarChart3 className="h-4 w-4 text-text-muted" />
          </div>
          <TrendChart trend={trend} tall />
        </div>
        <div className="card-flat p-3.5 sm:p-5">
          <h3 className="text-[13px] sm:text-sm font-semibold text-text-primary mb-3 sm:mb-4">Qarz muddatlari</h3>
          {debtAging.length > 0 ? (
            <div className="space-y-2.5 sm:space-y-3">
              {debtAging.map((row, i) => {
                const maxAmount = Math.max(...debtAging.map((r) => r.amount), 1);
                const width = Math.max((row.amount / maxAmount) * 100, 8);
                const colors = ['bg-success-500', 'bg-warning-500', 'bg-danger-400', 'bg-danger-600'];
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] sm:text-xs text-text-secondary">{row.period}</span>
                      <span className="text-[11px] sm:text-xs font-semibold text-text-primary tabular-nums">
                        <span className="sm:hidden">{compactMoney(row.amount)}</span>
                        <span className="hidden sm:inline">{formatCurrency(row.amount)}</span>
                      </span>
                    </div>
                    <div className="h-1.5 sm:h-2 rounded-full bg-surface-tertiary overflow-hidden">
                      <div className={`h-full rounded-full ${colors[i] ?? 'bg-primary-500'} transition-all duration-500`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-24 sm:h-32 items-center justify-center text-xs sm:text-sm text-text-muted">Qarz yo'q</div>
          )}
        </div>
      </div>

      {/* Top products + customers */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <div className="card-flat p-3.5 sm:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-[13px] sm:text-sm font-semibold text-text-primary">Top mahsulotlar</h3>
            <Package className="h-4 w-4 text-text-muted" />
          </div>
          {topProducts.length > 0 ? (
            <div className="space-y-2.5 sm:space-y-3">
              {topProducts.slice(0, 5).map((p, i) => (
                <div key={p.productId} className="flex items-center gap-2.5 sm:gap-3">
                  <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg bg-surface-tertiary text-[10px] sm:text-xs font-bold text-text-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] sm:text-sm font-medium text-text-primary">{p.productName}</p>
                    <p className="text-[10px] sm:text-xs text-text-muted">{p.totalQty} dona</p>
                  </div>
                  <span className="text-[13px] sm:text-sm font-semibold text-text-primary tabular-nums shrink-0">
                    <span className="sm:hidden">{compactMoney(p.totalRevenue)}</span>
                    <span className="hidden sm:inline">{formatCurrency(p.totalRevenue)}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-24 sm:h-32 items-center justify-center text-xs sm:text-sm text-text-muted">Ma'lumot yo'q</div>
          )}
        </div>
        <div className="card-flat p-3.5 sm:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-[13px] sm:text-sm font-semibold text-text-primary">Top mijozlar</h3>
            <Users className="h-4 w-4 text-text-muted" />
          </div>
          {topCustomers.length > 0 ? (
            <div className="space-y-2.5 sm:space-y-3">
              {topCustomers.slice(0, 5).map((c) => (
                <div key={c.customerId} className="flex items-center gap-2.5 sm:gap-3">
                  <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[10px] sm:text-xs font-bold text-primary-700">{c.customerName.charAt(0)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] sm:text-sm font-medium text-text-primary">{c.customerName}</p>
                    <p className="text-[10px] sm:text-xs text-text-muted">{c.receiptCount} xarid</p>
                  </div>
                  <span className="text-[13px] sm:text-sm font-semibold text-text-primary tabular-nums shrink-0">
                    <span className="sm:hidden">{compactMoney(c.totalSpent)}</span>
                    <span className="hidden sm:inline">{formatCurrency(c.totalSpent)}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-24 sm:h-32 items-center justify-center text-xs sm:text-sm text-text-muted">Ma'lumot yo'q</div>
          )}
        </div>
      </div>
    </>
  );
}

/* ════════════════════ IMPORTS TAB ════════════════════ */
function ImportsTab({ importStats }: { importStats?: import('@/hooks/useSuppliers').ImportStats }) {
  const navigate = useNavigate();
  const mixedCashPart = importStats ? importStats.paidSum - importStats.cash.sum : 0;
  const mixedDebtPart = importStats ? importStats.mixed.sum - mixedCashPart : 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <OpsCard label="Barcha kirimlar" count={importStats?.total.count ?? 0} sub={formatCurrency(importStats?.total.sum ?? 0)} icon={ArrowDownToLine} bg="bg-blue-50" color="text-blue-600" filter="all" />
        <OpsCard label="Naqdga kirimlar" count={importStats?.cash.count ?? 0} sub={formatCurrency(importStats?.cash.sum ?? 0)} icon={Wallet} bg="bg-success-50" color="text-success-600" filter="cash" />
        <OpsCard label="Qarzga kirimlar" count={importStats?.debt.count ?? 0} sub={formatCurrency(importStats?.debt.sum ?? 0)} icon={CreditCard} bg="bg-warning-50" color="text-warning-600" filter="debt" />
        <OpsCard label="Aralash kirimlar" count={importStats?.mixed.count ?? 0} sub={formatCurrency(importStats?.mixed.sum ?? 0)} icon={Layers} bg="bg-violet-50" color="text-violet-600" filter="mixed" />
      </div>

      {/* Financial breakdown */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="card-flat p-4 sm:p-5">
          <h3 className="text-[13px] sm:text-sm font-semibold text-text-primary mb-3">Moliyaviy taqsimot</h3>
          <div className="space-y-3">
            <BreakdownRow label="Jami to'langan (naqd)" value={importStats?.paidSum ?? 0} total={importStats?.total.sum ?? 0} color="bg-success-500" />
            <BreakdownRow label="Qarz qismi" value={importStats?.debtPortionSum ?? 0} total={importStats?.total.sum ?? 0} color="bg-warning-500" />
            <div className="pt-3 mt-1 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
              <span className="flex items-center gap-1.5 text-[12px] sm:text-sm font-semibold text-danger-700">
                <AlertCircle className="h-4 w-4" /> Ta'minotchilarga joriy qarz
              </span>
              <span className="text-sm sm:text-base font-bold text-danger-700 tabular-nums">{formatCurrency(importStats?.outstandingDebt ?? 0)}</span>
            </div>
          </div>
        </div>

        <div className="card-flat p-4 sm:p-5">
          <h3 className="text-[13px] sm:text-sm font-semibold text-text-primary mb-3">Aralash kirimlar tafsiloti</h3>
          {importStats && importStats.mixed.count > 0 ? (
            <div className="space-y-2.5">
              <MiniStat label="Aralash kirimlar soni" value={importStats.mixed.count} money={importStats.mixed.sum} color="text-violet-600" />
              <MiniStat label="Shundan naqd to'langan" value={null} money={mixedCashPart} color="text-success-600" />
              <MiniStat label="Shundan qarz" value={null} money={mixedDebtPart} color="text-warning-600" />
              <button
                onClick={() => navigate({ to: '/suppliers/imports', search: { filter: 'mixed' } })}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-50 px-3 py-2 text-[12px] font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
                style={{ minHeight: 'auto' }}
              >
                Aralash kirimlarni ko'rish <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center text-xs sm:text-sm text-text-muted">Aralash kirim yo'q</div>
          )}
        </div>
      </div>

      {/* Quick link to full list */}
      <button
        onClick={() => navigate({ to: '/suppliers/imports', search: { filter: 'all' } })}
        className="card-flat p-4 flex items-center gap-3 w-full hover:shadow-card-hover active:scale-[0.99] transition-all text-left"
        style={{ minHeight: 'auto' }}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          <ArrowDownToLine className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] sm:text-sm font-semibold text-text-primary">Barcha kirimlar ro'yxati</p>
          <p className="text-[11px] sm:text-xs text-text-muted">Ta'minotchi, sana, naqd/qarz bo'yicha to'liq tafsilot</p>
        </div>
        <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
      </button>
    </>
  );
}

/* ─── Shared sub-components ─── */
function TrendChart({ trend, tall }: { trend: TrendPoint[]; tall?: boolean }) {
  if (trend.length === 0) {
    return <div className={cn('flex items-center justify-center text-xs sm:text-sm text-text-muted', tall ? 'h-28 sm:h-40' : 'h-24 sm:h-32')}>Ma'lumot yo'q</div>;
  }
  const max = Math.max(...trend.map((t) => t.total), 1);
  return (
    <div className={cn('flex items-end gap-0.5 sm:gap-1', tall ? 'h-28 sm:h-40' : 'h-24 sm:h-32')}>
      {trend.map((point, i) => {
        const height = Math.max((point.total / max) * 100, 4);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 sm:gap-1">
            <div className="w-full rounded-t-sm bg-primary-500/80 hover:bg-primary-600 transition-colors" style={{ height: `${height}%` }} title={`${point.date}: ${formatCurrency(point.total)}`} />
            <span className="text-[7px] sm:text-[9px] text-text-muted truncate w-full text-center">
              {point.date.includes('T') ? point.date.split('T')[0]!.slice(5) : point.date.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MiniStat({ label, value, money, color }: { label: string; value: number | null; money: number; color: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] sm:text-xs text-text-secondary truncate">{label}</span>
      <div className="text-right shrink-0">
        <span className={cn('text-[13px] sm:text-sm font-bold tabular-nums', color)}>{formatCurrency(money)}</span>
        {value !== null && <span className="text-[10px] text-text-muted ml-1.5 tabular-nums">({value} ta)</span>}
      </div>
    </div>
  );
}

function BreakdownRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] sm:text-xs text-text-secondary">{label}</span>
        <span className="text-[11px] sm:text-xs font-semibold text-text-primary tabular-nums">{formatCurrency(value)} · {pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 rounded-full bg-surface-tertiary overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function NavTile({ title, desc, icon: Icon, bg, color, onClick }: {
  title: string; desc: string; icon: typeof DollarSign; bg: string; color: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="card p-3.5 sm:p-4 flex items-center gap-3 text-left hover:shadow-card-hover active:scale-[0.98] transition-all w-full" style={{ minHeight: 'auto' }}>
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', bg)}>
        <Icon className={cn('h-5 w-5', color)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] sm:text-sm font-bold text-text-primary">{title}</p>
        <p className="text-[10px] sm:text-[11px] text-text-muted line-clamp-2">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
    </button>
  );
}

function NavTileLink({ title, desc, icon: Icon, bg, color, to }: {
  title: string; desc: string; icon: typeof DollarSign; bg: string; color: string; to: string;
}) {
  const navigate = useNavigate();
  return <NavTile title={title} desc={desc} icon={Icon} bg={bg} color={color} onClick={() => navigate({ to })} />;
}

/* ─── Compact operations card — count-focused, clickable ─── */
interface OpsCardProps {
  label: string; count: number; sub?: string;
  icon: typeof DollarSign; bg: string; color: string;
  filter: 'all' | 'cash' | 'debt' | 'mixed';
}
function OpsCard({ label, count, sub, icon: Icon, bg, color, filter }: OpsCardProps) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate({ to: '/suppliers/imports', search: { filter } })}
      className="card p-2.5 sm:p-3 flex items-center gap-2.5 hover:shadow-card-hover active:scale-[0.98] transition-all text-left w-full"
      style={{ minHeight: 'auto', minWidth: 'auto' }}
    >
      <div className={cn('flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg', bg)}>
        <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', color)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] sm:text-[10px] text-text-muted font-semibold uppercase truncate">{label}</p>
        <p className="text-base sm:text-lg font-bold text-text-primary tabular-nums leading-tight">{count}</p>
        {sub && <p className="text-[9px] sm:text-[10px] text-text-muted tabular-nums truncate">{sub}</p>}
      </div>
      <ArrowUpRight className="h-3 w-3 text-text-muted/40 shrink-0" />
    </button>
  );
}

/* ─── Desktop Stat Card ─── */
interface StatCardProps {
  label: string; value: string; subtext?: string;
  icon: typeof DollarSign; iconBg: string; iconColor: string;
  trend?: number; href?: string;
}
function StatCard({ label, value, subtext, icon: Icon, iconBg, iconColor, trend, href }: StatCardProps) {
  const navigate = useNavigate();
  return (
    <div
      className={`stat-card group ${href ? 'cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 transition-all' : ''}`}
      onClick={href ? () => navigate({ to: href }) : undefined}
      role={href ? 'link' : undefined}
      tabIndex={href ? 0 : undefined}
      onKeyDown={href ? (e) => { if (e.key === 'Enter') navigate({ to: href }); } : undefined}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        {trend !== undefined && (
          <span className={`stat-trend flex items-center gap-0.5 ${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
        {href && <ArrowUpRight className="h-3.5 w-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      <p className="stat-value">{value}</p>
      <p className="stat-label mt-1">{label}</p>
      {subtext && <p className="text-[11px] text-text-muted mt-0.5">{subtext}</p>}
    </div>
  );
}
