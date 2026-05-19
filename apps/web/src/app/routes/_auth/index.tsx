import { useState, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  DollarSign, ShoppingCart, CreditCard, TrendingUp,
  Banknote, ArrowUpRight, ArrowDownRight, BarChart3, Users, Package,
  Smartphone, CreditCard as CardIcon, Receipt,
  ArrowDownToLine, Wallet, Layers, UserCheck, Truck,
  Home, Briefcase, ChevronRight, Activity, AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import {
  useDashboardSummary, useSalesTrend, useTopProducts, useTopCustomers,
  useDebtAging,
} from '@/hooks/useDashboard';
import { useCustomers } from '@/hooks/useCustomers';
import { useImportStats, useImports } from '@/hooks/useSuppliers';
import { useInfiniteSuppliers } from '@/hooks/useSuppliers';
import { cn } from '@/lib/cn';

export const Route = createFileRoute('/_auth/')({
  component: DashboardPage,
});

type TabKey = 'home' | 'sales' | 'imports';

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

const TABS: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'Bosh sahifa', icon: Home },
  { key: 'sales', label: 'Savdo', icon: Briefcase },
  { key: 'imports', label: 'Kirim', icon: ArrowDownToLine },
];

function compactMoney(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function DashboardPage() {
  const [tab, setTab] = useState<TabKey>('home');
  const [period, setPeriod] = useState('today');
  const { start, end } = useMemo(() => getDateRange(period), [period]);

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-text-primary">
            {TABS.find((t) => t.key === tab)?.label}
          </h1>
          <p className="text-[11px] sm:text-sm text-text-muted mt-0.5 hidden sm:block">SovdaJON — umumiy ko'rinish</p>
        </div>
        {tab !== 'home' && tab !== 'imports' && (
          <div className="flex rounded-lg p-0.5 sm:p-1 gap-0.5 shrink-0" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  'px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-medium transition-all',
                  period === p.key
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-tertiary',
                )}
                style={{ minHeight: 'auto', minWidth: 'auto' }}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 rounded-xl bg-surface-secondary p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 sm:py-2.5 text-[12px] sm:text-[13px] font-semibold transition-all',
                active
                  ? 'bg-surface text-primary-600 shadow-sm'
                  : 'text-text-muted hover:text-text-primary',
              )}
              style={{ minHeight: 'auto', minWidth: 'auto' }}
            >
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Active tab ── */}
      {tab === 'home' && <HomeTab start={start} end={end} period={period} />}
      {tab === 'sales' && <SalesTab start={start} end={end} period={period} />}
      {tab === 'imports' && <ImportsTab />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BOSH SAHIFA TAB
   ═══════════════════════════════════════════════════════════════ */
function HomeTab({ start, end }: { start: string; end: string; period: string }) {
  const navigate = useNavigate();
  const { data: summaryData } = useDashboardSummary(start, end);
  const { data: customersData } = useCustomers({ page: 1, limit: 1 });
  const { data: importStatsResp } = useImportStats();

  const summary = summaryData?.data;
  const totalCustomers = customersData?.pagination?.total ?? 0;
  const importStats = importStatsResp?.data;

  return (
    <div className="space-y-5">
      {/* Quick KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <MiniKpi label="Bugungi sotuv" value={formatCurrency(summary?.totalSales ?? 0)} sub={`${summary?.totalCount ?? 0} chek`} icon={ShoppingCart} bg="bg-primary-50" color="text-primary-600" />
        <MiniKpi label="Sof foyda" value={formatCurrency(summary?.profit ?? 0)} icon={TrendingUp} bg="bg-success-50" color="text-success-600" />
        <MiniKpi label="Faol qarzlar" value={formatCurrency(summary?.activeDebts ?? 0)} sub={`${summary?.debtCount ?? 0} ta`} icon={CreditCard} bg="bg-danger-50" color="text-danger-600" />
        <MiniKpi label="Joriy qarz (ta'minotchi)" value={formatCurrency(importStats?.outstandingDebt ?? 0)} icon={AlertCircle} bg="bg-warning-50" color="text-warning-600" />
      </div>

      {/* Navigation big cards */}
      <div>
        <p className="text-[10px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Bo'limlar</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          <NavCard title="Savdo" desc="Sotuvlar, foyda, to'lov usullari" count={summary?.totalCount ?? 0} countLabel="ta chek" icon={Briefcase} bg="bg-primary-50" color="text-primary-600" onClick={() => navigate({ to: '/pos' })} />
          <NavCard title="Kirim" desc="Ta'minotchilardan kirimlar" count={importStats?.total.count ?? 0} countLabel="ta kirim" icon={ArrowDownToLine} bg="bg-blue-50" color="text-blue-600" onClick={() => navigate({ to: '/suppliers' })} />
          <NavCard title="Mijozlar" desc="Mijozlar ro'yxati" count={totalCustomers} countLabel="ta mijoz" icon={UserCheck} bg="bg-emerald-50" color="text-emerald-600" onClick={() => navigate({ to: '/customers' })} />
          <NavCard title="Mahsulotlar" desc="Mahsulot katalog" icon={Package} bg="bg-violet-50" color="text-violet-600" onClick={() => navigate({ to: '/products' })} />
          <NavCard title="Ta'minotchilar" desc="Yetkazib beruvchilar" icon={Truck} bg="bg-orange-50" color="text-orange-600" onClick={() => navigate({ to: '/suppliers' })} />
          <NavCard title="Qarzlar" desc="Mijozlar qarzlari" count={summary?.debtCount ?? 0} countLabel="ta faol" icon={CreditCard} bg="bg-danger-50" color="text-danger-600" onClick={() => navigate({ to: '/debts' })} />
        </div>
      </div>
    </div>
  );
}

function MiniKpi({ label, value, sub, icon: Icon, bg, color }: { label: string; value: string; sub?: string; icon: typeof DollarSign; bg: string; color: string }) {
  return (
    <div className="rounded-xl bg-surface p-2.5 sm:p-3" style={{ border: '1px solid var(--color-border-subtle)' }}>
      <div className={cn('flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg mb-2', bg)}>
        <Icon className={cn('h-4 w-4', color)} />
      </div>
      <p className="text-sm sm:text-base font-bold text-text-primary tabular-nums truncate">{value}</p>
      <p className="text-[10px] sm:text-[11px] text-text-muted uppercase tracking-wider truncate">{label}</p>
      {sub && <p className="text-[10px] text-text-muted">{sub}</p>}
    </div>
  );
}

function NavCard({ title, desc, count, countLabel, icon: Icon, bg, color, onClick }: { title: string; desc: string; count?: number; countLabel?: string; icon: typeof DollarSign; bg: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group card p-3 sm:p-4 flex items-start gap-3 hover:shadow-card-hover active:scale-[0.98] transition-all text-left"
      style={{ minHeight: 'auto', minWidth: 'auto' }}
    >
      <div className={cn('flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl', bg)}>
        <Icon className={cn('h-5 w-5 sm:h-6 sm:w-6', color)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] sm:text-sm font-bold text-text-primary">{title}</p>
        <p className="text-[10px] sm:text-[11px] text-text-muted mt-0.5">{desc}</p>
        {count !== undefined && (
          <p className="text-[11px] sm:text-xs font-semibold text-text-primary mt-1 tabular-nums">{count} <span className="text-text-muted font-normal">{countLabel}</span></p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-text-muted/40 shrink-0 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SAVDO TAB
   ═══════════════════════════════════════════════════════════════ */
function SalesTab({ start, end, period }: { start: string; end: string; period: string }) {
  const { data: summaryData, isLoading } = useDashboardSummary(start, end);
  const { data: trendData } = useSalesTrend(start, end);
  const { data: topProductsData } = useTopProducts(start, end);
  const { data: topCustomersData } = useTopCustomers(start, end);
  const { data: debtAgingData } = useDebtAging();

  const summary = summaryData?.data;
  const trend = trendData?.data ?? [];
  const topProducts = topProductsData?.data ?? [];
  const topCustomers = topCustomersData?.data ?? [];
  const debtAging = debtAgingData?.data ?? [];

  if (isLoading && !summary) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-[80px] sm:h-[100px] rounded-xl bg-surface-secondary animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Asosiy savdo cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        <StatCard label="Jami sotuv" value={formatCurrency(summary?.totalSales ?? 0)} subtext={`${summary?.totalCount ?? 0} ta chek`} icon={ShoppingCart} iconBg="bg-primary-50" iconColor="text-primary-600" href={`/reports/sales?period=${period}&start=${start}&end=${end}`} />
        <StatCard label="Sof foyda" value={formatCurrency(summary?.profit ?? 0)} icon={TrendingUp} iconBg="bg-success-50" iconColor="text-success-600" href={`/reports/profit?period=${period}&start=${start}&end=${end}`} />
        <StatCard label="Xarajatlar" value={formatCurrency(summary?.totalExpenses ?? 0)} icon={Receipt} iconBg="bg-orange-50" iconColor="text-orange-600" href="/expenses" />
        <StatCard label="Faol qarzlar" value={formatCurrency(summary?.activeDebts ?? 0)} subtext={`${summary?.debtCount ?? 0} ta`} icon={CreditCard} iconBg="bg-danger-50" iconColor="text-danger-600" href="/debts?status=ACTIVE" />
      </div>

      {/* To'lov usullari */}
      <div>
        <p className="text-[10px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">To'lov usullari</p>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
          <StatCard label="Naqd pul" value={formatCurrency(summary?.cash ?? 0)} icon={Banknote} iconBg="bg-emerald-50" iconColor="text-emerald-600" href={`/reports/sales?period=${period}&start=${start}&end=${end}&method=CASH`} />
          <StatCard label="Karta" value={formatCurrency(summary?.card ?? 0)} icon={CardIcon} iconBg="bg-blue-50" iconColor="text-blue-600" href={`/reports/sales?period=${period}&start=${start}&end=${end}&method=CARD`} />
          <StatCard label="Click" value={formatCurrency(summary?.click ?? 0)} icon={Smartphone} iconBg="bg-violet-50" iconColor="text-violet-600" href={`/reports/sales?period=${period}&start=${start}&end=${end}&method=CLICK`} />
          <StatCard label="Qarzga sotuv" value={formatCurrency(summary?.debt ?? 0)} icon={Receipt} iconBg="bg-orange-50" iconColor="text-orange-600" href={`/reports/sales?period=${period}&start=${start}&end=${end}&method=DEBT`} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
        <div className="card-flat p-3.5 sm:p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-[13px] sm:text-sm font-semibold text-text-primary">Sotuv trendi</h3>
            <BarChart3 className="h-4 w-4 text-text-muted" />
          </div>
          {trend.length > 0 ? (
            <div className="flex items-end gap-0.5 sm:gap-1 h-28 sm:h-40">
              {trend.map((point, i) => {
                const max = Math.max(...trend.map((t) => t.total), 1);
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
          ) : (
            <div className="flex h-28 sm:h-40 items-center justify-center text-xs sm:text-sm text-text-muted">Ma'lumot yo'q</div>
          )}
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

      {/* Top */}
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
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   KIRIM TAB
   ═══════════════════════════════════════════════════════════════ */
function ImportsTab() {
  const navigate = useNavigate();
  const { data: statsResp } = useImportStats();
  const { data: recentResp } = useImports('all', 1, 10);
  const { data: suppliersData } = useInfiniteSuppliers({ limit: 200 });
  const stats = statsResp?.data;
  const recent = recentResp?.data ?? [];
  const suppliers = useMemo(() => suppliersData?.pages.flatMap((p) => p.data) ?? [], [suppliersData]);

  const topDebtors = useMemo(() => {
    return [...suppliers].filter((s) => Number(s.balance) > 0).sort((a, b) => Number(b.balance) - Number(a.balance)).slice(0, 5);
  }, [suppliers]);

  const mixedCashPart = (stats?.paidSum ?? 0) - (stats?.cash.sum ?? 0);
  const mixedDebtPart = (stats?.mixed.sum ?? 0) - mixedCashPart;

  return (
    <div className="space-y-5">
      {/* Asosiy kirim cards — clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatCard label="Barcha kirimlar" value={formatCurrency(stats?.total.sum ?? 0)} subtext={`${stats?.total.count ?? 0} ta tranzaksiya`} icon={ArrowDownToLine} iconBg="bg-blue-50" iconColor="text-blue-600" href="/suppliers/imports?filter=all" />
        <StatCard label="Naqdga kirimlar" value={formatCurrency(stats?.cash.sum ?? 0)} subtext={`${stats?.cash.count ?? 0} ta`} icon={Wallet} iconBg="bg-success-50" iconColor="text-success-600" href="/suppliers/imports?filter=cash" />
        <StatCard label="Qarzga kirimlar" value={formatCurrency(stats?.debt.sum ?? 0)} subtext={`${stats?.debt.count ?? 0} ta`} icon={CreditCard} iconBg="bg-warning-50" iconColor="text-warning-600" href="/suppliers/imports?filter=debt" />
        <StatCard label="Aralash kirimlar" value={formatCurrency(stats?.mixed.sum ?? 0)} subtext={`${stats?.mixed.count ?? 0} ta`} icon={Layers} iconBg="bg-violet-50" iconColor="text-violet-600" href="/suppliers/imports?filter=mixed" />
      </div>

      {/* Money flow summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="card-flat p-4 sm:p-5">
          <p className="text-[11px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Kirim bo'yicha pul oqimi</p>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[12px] sm:text-[13px] text-text-secondary">
                <span className="h-2 w-2 rounded-full bg-success-500" /> Naqd berildi
              </span>
              <span className="text-[12px] sm:text-[13px] font-bold text-success-700 tabular-nums">{formatCurrency(stats?.paidSum ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[12px] sm:text-[13px] text-text-secondary">
                <span className="h-2 w-2 rounded-full bg-warning-500" /> Qarzga olindi
              </span>
              <span className="text-[12px] sm:text-[13px] font-bold text-warning-700 tabular-nums">{formatCurrency(stats?.debtPortionSum ?? 0)}</span>
            </div>
            <div className="h-px bg-border-subtle my-1" />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] sm:text-[13px] font-semibold text-text-primary">Jami tovar olindi</span>
              <span className="text-[13px] sm:text-sm font-bold text-text-primary tabular-nums">{formatCurrency(stats?.total.sum ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-danger-600">Hozir to'lanmagan jami qarz</span>
              <span className="text-[12px] font-bold text-danger-700 tabular-nums">{formatCurrency(stats?.outstandingDebt ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Mixed breakdown */}
        {stats && stats.mixed.count > 0 && (
          <div className="card-flat p-4 sm:p-5">
            <p className="text-[11px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Aralash kirim taqsimoti</p>
            <div className="space-y-2.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-success-700">Naqd qism</span>
                  <span className="text-[11px] font-bold tabular-nums text-success-700">{formatCurrency(mixedCashPart)}</span>
                </div>
                <div className="h-2 rounded-full bg-success-50 overflow-hidden">
                  <div className="h-full bg-success-500 transition-all" style={{ width: stats.mixed.sum > 0 ? `${(mixedCashPart / stats.mixed.sum) * 100}%` : '0%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-warning-700">Qarz qism</span>
                  <span className="text-[11px] font-bold tabular-nums text-warning-700">{formatCurrency(mixedDebtPart)}</span>
                </div>
                <div className="h-2 rounded-full bg-warning-50 overflow-hidden">
                  <div className="h-full bg-warning-500 transition-all" style={{ width: stats.mixed.sum > 0 ? `${(mixedDebtPart / stats.mixed.sum) * 100}%` : '0%' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top debtors */}
        <div className="card-flat p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider">Eng katta qarzdorlar</p>
            <Activity className="h-3.5 w-3.5 text-text-muted" />
          </div>
          {topDebtors.length > 0 ? (
            <div className="space-y-2">
              {topDebtors.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => navigate({ to: '/suppliers/$supplierId', params: { supplierId: s.id } })}
                  className="flex w-full items-center gap-2.5 rounded-lg p-1.5 hover:bg-surface-secondary transition-colors text-left"
                  style={{ minHeight: 'auto', minWidth: 'auto' }}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-danger-50 text-[10px] font-bold text-danger-700">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-text-primary">{s.name}</span>
                  <span className="text-[11px] font-bold text-danger-700 tabular-nums shrink-0">{compactMoney(Number(s.balance))}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-text-muted text-center py-4">Qarzdor yo'q</p>
          )}
        </div>
      </div>

      {/* Recent imports */}
      <div className="card-flat p-3.5 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] sm:text-sm font-semibold text-text-primary">So'nggi kirimlar</h3>
          <button onClick={() => navigate({ to: '/suppliers/imports', search: { filter: 'all' } })} className="text-[11px] font-semibold text-primary-600 hover:underline" style={{ minHeight: 'auto', minWidth: 'auto' }}>Hammasi →</button>
        </div>
        {recent.length > 0 ? (
          <div className="divide-y divide-border-subtle">
            {recent.slice(0, 8).map((r) => {
              const t = Number(r.total);
              const p = Number(r.paidAmount);
              const d = r.debtAmount;
              const kind: 'cash' | 'debt' | 'mixed' = p === 0 ? 'debt' : p >= t ? 'cash' : 'mixed';
              const KindIcon = kind === 'cash' ? Wallet : kind === 'debt' ? CreditCard : Layers;
              const kindColor = kind === 'cash' ? 'text-success-600 bg-success-50' : kind === 'debt' ? 'text-warning-600 bg-warning-50' : 'text-violet-600 bg-violet-50';
              return (
                <button
                  key={r.id}
                  onClick={() => navigate({ to: '/suppliers/$supplierId', params: { supplierId: r.supplierId } })}
                  className="flex w-full items-center gap-3 py-2.5 hover:bg-surface-secondary/50 transition-colors text-left px-1 rounded-lg"
                  style={{ minHeight: 'auto', minWidth: 'auto' }}
                >
                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', kindColor)}>
                    <KindIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] sm:text-[13px] font-semibold text-text-primary truncate">{r.supplierName}</p>
                    <p className="text-[10px] text-text-muted">{fmtDate(r.createdAt)} · {r.itemCount} mahsulot</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] sm:text-[13px] font-bold text-text-primary tabular-nums">{compactMoney(t)}</p>
                    {d > 0 && <p className="text-[10px] font-medium text-warning-700 tabular-nums">Qarz: {compactMoney(d)}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[12px] text-text-muted text-center py-8">Kirim yo'q</p>
        )}
      </div>
    </div>
  );
}

/* ─── Standard StatCard (clickable) ─── */
interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: typeof DollarSign;
  iconBg: string;
  iconColor: string;
  trend?: number;
  href?: string;
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
