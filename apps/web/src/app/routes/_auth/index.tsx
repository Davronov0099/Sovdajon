import { useState, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  DollarSign, ShoppingCart, CreditCard, TrendingUp,
  Banknote, ArrowUpRight, BarChart3, Users, Package,
  Smartphone, CreditCard as CardIcon, Receipt,
  ArrowDownToLine, Wallet, Layers, UserCheck, LayoutDashboard,
  AlertCircle, ChevronRight, Home, Zap, Truck, Megaphone, Wrench,
  FileText, MoreHorizontal,
} from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import {
  useDashboardSummary, useSalesTrend, useTopProducts, useTopCustomers,
  useDebtAging,
} from '@/hooks/useDashboard';
import { useCustomers } from '@/hooks/useCustomers';
import { useImportStats, useImports } from '@/hooks/useSuppliers';
import { useExpenseStats, useExpenses } from '@/hooks/useExpenses';
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

type TabKey = 'home' | 'sales' | 'imports' | 'expenses';
const TABS: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'home', label: 'Bosh sahifa', icon: LayoutDashboard },
  { key: 'sales', label: 'Savdo', icon: ShoppingCart },
  { key: 'imports', label: 'Kirim', icon: ArrowDownToLine },
  { key: 'expenses', label: 'Xarajatlar', icon: Receipt },
];

const EXPENSE_META: Record<string, { label: string; icon: typeof DollarSign; bg: string; color: string; bar: string }> = {
  RENT: { label: 'Ijara', icon: Home, bg: 'bg-blue-50', color: 'text-blue-600', bar: 'bg-blue-500' },
  SALARY: { label: 'Oylik', icon: Users, bg: 'bg-primary-50', color: 'text-primary-600', bar: 'bg-primary-500' },
  UTILITIES: { label: 'Kommunal', icon: Zap, bg: 'bg-amber-50', color: 'text-amber-600', bar: 'bg-amber-500' },
  TRANSPORT: { label: 'Transport', icon: Truck, bg: 'bg-cyan-50', color: 'text-cyan-600', bar: 'bg-cyan-500' },
  MARKETING: { label: 'Marketing', icon: Megaphone, bg: 'bg-violet-50', color: 'text-violet-600', bar: 'bg-violet-500' },
  REPAIR: { label: "Ta'mirlash", icon: Wrench, bg: 'bg-orange-50', color: 'text-orange-600', bar: 'bg-orange-500' },
  TAX: { label: 'Soliq', icon: FileText, bg: 'bg-red-50', color: 'text-red-600', bar: 'bg-red-500' },
  OTHER: { label: 'Boshqa', icon: MoreHorizontal, bg: 'bg-gray-50', color: 'text-gray-600', bar: 'bg-gray-500' },
};

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
  const { data: expenseStatsResp } = useExpenseStats(start, end);
  const { data: recentExpensesResp } = useExpenses({ page: 1, limit: 8, startDate: start, endDate: end });

  const summary = summaryData?.data;
  const trend = trendData?.data ?? [];
  const topProducts = topProductsData?.data ?? [];
  const topCustomers = topCustomersData?.data ?? [];
  const debtAging = debtAgingData?.data ?? [];
  const totalCustomers = customersData?.pagination?.total ?? 0;
  const importStats = importStatsResp?.data;
  const expenseStats = expenseStatsResp?.data;
  const recentExpenses = recentExpensesResp?.data ?? [];

  const showPeriod = tab === 'sales' || tab === 'home' || tab === 'expenses';

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
      ) : tab === 'imports' ? (
        <ImportsTab importStats={importStats} />
      ) : (
        <ExpensesTab stats={expenseStats} recent={recentExpenses} />
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
  const { data: importsResp, isLoading: importsLoading } = useImports('all', 1, 15);
  const recentImports = importsResp?.data ?? [];

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

      {/* Quick link to full list — tugma qoladi */}
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

      {/* Inline imports list — tugmasiz pastda professional ko'rinadi */}
      <div className="card-flat p-3.5 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] sm:text-sm font-semibold text-text-primary">So'nggi kirimlar</h3>
          <span className="text-[11px] text-text-muted tabular-nums">{importsResp?.total ?? 0} ta jami</span>
        </div>
        {importsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-surface-secondary animate-pulse" />)}
          </div>
        ) : recentImports.length > 0 ? (
          <div className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
            {recentImports.map((it) => {
              const t = Number(it.total);
              const p = Number(it.paidAmount);
              const d = it.debtAmount;
              const kind = p === 0 ? 'debt' : p >= t ? 'cash' : 'mixed';
              const kindMeta = kind === 'cash'
                ? { label: 'Naqd', cls: 'bg-success-50 text-success-700', Icon: Wallet }
                : kind === 'debt'
                ? { label: 'Qarz', cls: 'bg-warning-50 text-warning-700', Icon: CreditCard }
                : { label: 'Aralash', cls: 'bg-violet-50 text-violet-700', Icon: Layers };
              const KIcon = kindMeta.Icon;
              return (
                <button
                  key={it.id}
                  onClick={() => navigate({ to: '/suppliers/$supplierId', params: { supplierId: it.supplierId } })}
                  className="flex w-full items-center gap-2.5 sm:gap-3 py-2.5 text-left hover:bg-surface-secondary/40 transition-colors"
                  style={{ minHeight: 'auto' }}
                >
                  <div className={cn('flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg', kindMeta.cls)}>
                    <KIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] sm:text-[13px] font-semibold text-text-primary truncate">{it.supplierName}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-text-muted">
                      <span className={cn('rounded px-1 py-px font-semibold', kindMeta.cls)}>{kindMeta.label}</span>
                      <span>{it.itemCount} mahsulot</span>
                      <span>{new Date(it.createdAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] sm:text-[13px] font-bold text-text-primary tabular-nums">{formatCurrency(t)}</p>
                    {d > 0 && <p className="text-[10px] text-warning-600 tabular-nums">Qarz: {formatCurrency(d)}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex h-28 items-center justify-center text-xs sm:text-sm text-text-muted">Kirim yo'q</div>
        )}
      </div>
    </>
  );
}

/* ════════════════════ EXPENSES TAB ════════════════════ */
interface ExpenseStatsShape {
  totalAmount: number;
  totalCount: number;
  byCategory: { category: string; amount: number; count: number }[];
}
interface ExpenseRow {
  id: string; category: string; amount: string; description: string; date: string;
}

function ExpensesTab({ stats, recent }: { stats?: ExpenseStatsShape; recent: ExpenseRow[] }) {
  const navigate = useNavigate();
  const total = stats?.totalAmount ?? 0;
  const count = stats?.totalCount ?? 0;
  const avg = count > 0 ? total / count : 0;
  const byCategory = [...(stats?.byCategory ?? [])].sort((a, b) => b.amount - a.amount);
  const topCat = byCategory[0];
  const topMeta = topCat ? (EXPENSE_META[topCat.category] ?? EXPENSE_META.OTHER!) : null;

  return (
    <>
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatCard label="Jami xarajat" value={formatCurrency(total)} subtext={`${count} ta yozuv`} icon={Receipt} iconBg="bg-orange-50" iconColor="text-orange-600" href="/expenses" />
        <StatCard label="Xarajatlar soni" value={String(count)} subtext="tanlangan davrda" icon={FileText} iconBg="bg-blue-50" iconColor="text-blue-600" href="/expenses" />
        <StatCard label="O'rtacha xarajat" value={formatCurrency(Math.round(avg))} subtext="har bir yozuv" icon={BarChart3} iconBg="bg-violet-50" iconColor="text-violet-600" />
        {topCat && topMeta ? (
          <StatCard label={`Eng ko'p: ${topMeta.label}`} value={formatCurrency(topCat.amount)} subtext={`${topCat.count} ta`} icon={topMeta.icon} iconBg={topMeta.bg} iconColor={topMeta.color} href="/expenses" />
        ) : (
          <StatCard label="Kategoriya" value="—" icon={MoreHorizontal} iconBg="bg-gray-50" iconColor="text-gray-600" />
        )}
      </div>

      {/* Category breakdown + recent */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* By category */}
        <div className="card-flat p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] sm:text-sm font-semibold text-text-primary">Kategoriya bo'yicha</h3>
            <BarChart3 className="h-4 w-4 text-text-muted" />
          </div>
          {byCategory.length > 0 ? (
            <div className="space-y-3">
              {byCategory.map((c) => {
                const meta = EXPENSE_META[c.category] ?? EXPENSE_META.OTHER!;
                const Icon = meta.icon;
                const pct = total > 0 ? (c.amount / total) * 100 : 0;
                return (
                  <div key={c.category}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', meta.bg)}>
                        <Icon className={cn('h-3.5 w-3.5', meta.color)} />
                      </div>
                      <span className="text-[12px] sm:text-[13px] font-medium text-text-primary flex-1 truncate">{meta.label}</span>
                      <span className="text-[11px] text-text-muted tabular-nums">{c.count} ta</span>
                      <span className="text-[12px] sm:text-[13px] font-bold text-text-primary tabular-nums shrink-0 w-24 text-right">{formatCurrency(c.amount)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-tertiary overflow-hidden ml-9">
                      <div className={cn('h-full rounded-full transition-all duration-500', meta.bar)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-xs sm:text-sm text-text-muted">Xarajat yo'q</div>
          )}
        </div>

        {/* Recent expenses */}
        <div className="card-flat p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] sm:text-sm font-semibold text-text-primary">So'nggi xarajatlar</h3>
            <Receipt className="h-4 w-4 text-text-muted" />
          </div>
          {recent.length > 0 ? (
            <div className="space-y-2">
              {recent.map((e) => {
                const meta = EXPENSE_META[e.category] ?? EXPENSE_META.OTHER!;
                const Icon = meta.icon;
                return (
                  <div key={e.id} className="flex items-center gap-2.5">
                    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', meta.bg)}>
                      <Icon className={cn('h-4 w-4', meta.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] sm:text-[13px] font-medium text-text-primary truncate">{e.description || meta.label}</p>
                      <p className="text-[10px] text-text-muted">{meta.label} · {new Date(e.date).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                    </div>
                    <span className="text-[12px] sm:text-[13px] font-bold text-danger-600 tabular-nums shrink-0">−{formatCurrency(Number(e.amount))}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-xs sm:text-sm text-text-muted">Xarajat yo'q</div>
          )}
          <button
            onClick={() => navigate({ to: '/expenses' })}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-orange-50 px-3 py-2 text-[12px] font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
            style={{ minHeight: 'auto' }}
          >
            Barcha xarajatlar <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
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
function StatCard({ label, value, subtext, icon: Icon, iconBg, iconColor, href }: StatCardProps) {
  const navigate = useNavigate();
  const clickable = !!href;
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={clickable ? () => navigate({ to: href }) : undefined}
      className={cn(
        'card p-2.5 sm:p-3 flex items-center gap-2.5 text-left w-full transition-all',
        clickable ? 'hover:shadow-card-hover active:scale-[0.98] cursor-pointer' : 'cursor-default',
      )}
      style={{ minHeight: 'auto', minWidth: 'auto' }}
    >
      <div className={cn('flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg', iconBg)}>
        <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', iconColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] sm:text-[10px] text-text-muted font-semibold uppercase truncate">{label}</p>
        <p className="text-sm sm:text-base font-bold text-text-primary tabular-nums leading-tight truncate">{value}</p>
        {subtext && <p className="text-[9px] sm:text-[10px] text-text-muted tabular-nums truncate">{subtext}</p>}
      </div>
      {clickable && <ArrowUpRight className="h-3 w-3 text-text-muted/40 shrink-0" />}
    </button>
  );
}
