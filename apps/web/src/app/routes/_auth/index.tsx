import { useState, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  DollarSign, ShoppingCart, CreditCard, TrendingUp,
  Banknote, ArrowUpRight, ArrowDownRight, BarChart3, Users, Package,
  Smartphone, CreditCard as CardIcon, Receipt,
} from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import {
  useDashboardSummary, useSalesTrend, useTopProducts, useTopCustomers,
  useDebtAging,
} from '@/hooks/useDashboard';
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

function compactMoney(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

function DashboardPage() {
  const [period, setPeriod] = useState('today');
  const { start, end } = useMemo(() => getDateRange(period), [period]);

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

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 animate-fade-in">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-text-primary">Boshqaruv paneli</h1>
          <p className="text-[11px] sm:text-sm text-text-muted mt-0.5 hidden sm:block">Sardorbek Furnitura — umumiy ko'rinish</p>
        </div>

        {/* Period — mobile: compact pills, desktop: avvalgidek */}
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
      </div>

      {/* ═══ Stat Cards ═══ */}
      {isLoading && !summary ? (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[80px] sm:h-[100px] rounded-xl bg-surface-secondary animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Row 1: Asosiy — mobile: horizontal scroll cards, desktop: grid */}
          {/* Mobile */}
          <div className="sm:hidden overflow-x-auto no-scrollbar -mx-3 px-3">
            <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
              {[
                { label: 'Jami sotuv', value: summary?.totalSales ?? 0, sub: `${summary?.totalCount ?? 0} chek`, icon: ShoppingCart, bg: 'bg-primary-50', color: 'text-primary-600' },
                { label: 'Sof foyda', value: summary?.profit ?? 0, icon: TrendingUp, bg: 'bg-success-50', color: 'text-success-600' },
                { label: 'Chegirma', value: summary?.totalDiscount ?? 0, icon: Receipt, bg: 'bg-orange-50', color: 'text-orange-600' },
                { label: 'Qarzlar', value: summary?.activeDebts ?? 0, sub: `${summary?.debtCount ?? 0} ta`, icon: CreditCard, bg: 'bg-danger-50', color: 'text-danger-600' },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="flex-shrink-0 w-[140px] rounded-xl bg-surface p-3" style={{ border: '1px solid var(--color-border-subtle)' }}>
                    <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg mb-2', card.bg)}>
                      <Icon className={cn('h-4 w-4', card.color)} />
                    </div>
                    <p className="text-base font-bold text-text-primary tabular-nums leading-tight">{compactMoney(card.value)}</p>
                    <p className="text-[10px] text-text-muted mt-0.5 uppercase tracking-wider">{card.label}</p>
                    {card.sub && <p className="text-[10px] text-text-muted">{card.sub}</p>}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Desktop Row 1 */}
          <div className="hidden sm:grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Jami sotuv" value={formatCurrency(summary?.totalSales ?? 0)} subtext={`${summary?.totalCount ?? 0} ta chek`} icon={ShoppingCart} iconBg="bg-primary-50" iconColor="text-primary-600" href={`/reports/sales?period=${period}&start=${start}&end=${end}`} />
            <StatCard label="Sof foyda" value={formatCurrency(summary?.profit ?? 0)} icon={TrendingUp} iconBg="bg-success-50" iconColor="text-success-600" href={`/reports/profit?period=${period}&start=${start}&end=${end}`} />
            <StatCard label="Chegirma" value={formatCurrency(summary?.totalDiscount ?? 0)} icon={Receipt} iconBg="bg-orange-50" iconColor="text-orange-600" />
            <StatCard label="Faol qarzlar" value={formatCurrency(summary?.activeDebts ?? 0)} subtext={`${summary?.debtCount ?? 0} ta`} icon={CreditCard} iconBg="bg-danger-50" iconColor="text-danger-600" href="/debts?status=ACTIVE" />
          </div>

          {/* Row 2: To'lov usullari — mobile: 2x2 compact grid, desktop: avvalgidek */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
            {[
              { label: 'Naqd', value: summary?.cash ?? 0, icon: Banknote, bg: 'bg-emerald-50', color: 'text-emerald-600', href: `CASH` },
              { label: 'Karta', value: summary?.card ?? 0, icon: CardIcon, bg: 'bg-blue-50', color: 'text-blue-600', href: `CARD` },
              { label: 'Click', value: summary?.click ?? 0, icon: Smartphone, bg: 'bg-violet-50', color: 'text-violet-600', href: `CLICK` },
              { label: 'Qarzga', value: summary?.debt ?? 0, icon: Receipt, bg: 'bg-orange-50', color: 'text-orange-600', href: `DEBT` },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label}>
                  {/* Mobile */}
                  <div className="sm:hidden rounded-xl bg-surface p-2.5" style={{ border: '1px solid var(--color-border-subtle)' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', card.bg)}>
                        <Icon className={cn('h-3.5 w-3.5', card.color)} />
                      </div>
                      <span className="text-[10px] text-text-muted uppercase tracking-wider">{card.label}</span>
                    </div>
                    <p className="text-[15px] font-bold text-text-primary tabular-nums">{compactMoney(card.value)}</p>
                  </div>
                  {/* Desktop */}
                  <div className="hidden sm:block">
                    <StatCard label={card.label === 'Qarzga' ? 'Qarzga sotuv' : `${card.label} pul`} value={formatCurrency(card.value)} icon={card.icon} iconBg={card.bg} iconColor={card.color} href={`/reports/sales?period=${period}&start=${start}&end=${end}&method=${card.href}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ═══ Charts Row ═══ */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
        {/* Sales Trend */}
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
                    <div
                      className="w-full rounded-t-sm bg-primary-500/80 hover:bg-primary-600 transition-colors cursor-default"
                      style={{ height: `${height}%` }}
                      title={`${point.date}: ${formatCurrency(point.total)}`}
                    />
                    <span className="text-[7px] sm:text-[9px] text-text-muted truncate w-full text-center">
                      {point.date.includes('T') ? point.date.split('T')[0]!.slice(5) : point.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-28 sm:h-40 items-center justify-center text-xs sm:text-sm text-text-muted">
              Ma'lumot yo'q
            </div>
          )}
        </div>

        {/* Debt Aging */}
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

      {/* ═══ Bottom — Top Products + Top Customers ═══ */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        {/* Top Products */}
        <div className="card-flat p-3.5 sm:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-[13px] sm:text-sm font-semibold text-text-primary">Top mahsulotlar</h3>
            <Package className="h-4 w-4 text-text-muted" />
          </div>
          {topProducts.length > 0 ? (
            <div className="space-y-2.5 sm:space-y-3">
              {topProducts.slice(0, 5).map((p, i) => (
                <div key={p.productId} className="flex items-center gap-2.5 sm:gap-3">
                  <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg bg-surface-tertiary text-[10px] sm:text-xs font-bold text-text-muted">
                    {i + 1}
                  </span>
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

        {/* Top Customers */}
        <div className="card-flat p-3.5 sm:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-[13px] sm:text-sm font-semibold text-text-primary">Top mijozlar</h3>
            <Users className="h-4 w-4 text-text-muted" />
          </div>
          {topCustomers.length > 0 ? (
            <div className="space-y-2.5 sm:space-y-3">
              {topCustomers.slice(0, 5).map((c) => (
                <div key={c.customerId} className="flex items-center gap-2.5 sm:gap-3">
                  <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[10px] sm:text-xs font-bold text-primary-700">
                    {c.customerName.charAt(0)}
                  </span>
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

/* ─── Desktop Stat Card (avvalgidek, o'zgarmagan) ─── */
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
