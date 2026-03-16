import { useMemo } from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import {
  ArrowLeft, ShoppingCart, Banknote, CreditCard as CardIcon,
  Smartphone, ArrowRightLeft, Receipt,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@sardorbek/shared';
import { useReceipts } from '@/hooks/useReceipts';

const PERIOD_LABELS: Record<string, string> = {
  today: 'Bugun',
  week: 'Hafta',
  month: 'Oy',
  year: 'Yil',
};

const METHOD_ICONS: Record<string, typeof Banknote> = {
  CASH: Banknote,
  CARD: CardIcon,
  CLICK: Smartphone,
  TRANSFER: ArrowRightLeft,
  DEBT: Receipt,
};

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Naqd',
  CARD: 'Karta',
  CLICK: 'Click',
  TRANSFER: "O'tkazma",
  DEBT: 'Qarzga',
  MIXED: 'Aralash',
};

interface ReceiptRow {
  id: string;
  number: number;
  total: string;
  paymentMethod: string;
  createdAt: string;
  customer?: { id: string; name: string; phone: string } | null;
  createdBy?: { id: string; name: string } | null;
  isDraft?: boolean;
  items?: { productName: string; quantity: number; total: string }[];
}

export function SalesReportPage() {
  const searchParams = useSearch({ strict: false }) as Record<string, string>;
  const period = searchParams.period ?? 'today';
  const start = searchParams.start;
  const end = searchParams.end;
  const methodFilter = searchParams.method;

  const { data, isLoading } = useReceipts({ page: 1, limit: 100 });
  const allReceipts = ((data as { data?: ReceiptRow[] } | undefined)?.data ?? []) as ReceiptRow[];

  // Filter: no drafts + date range + method
  const receipts = useMemo(() => {
    let filtered = allReceipts.filter((r) => !r.isDraft);
    if (start && end) {
      filtered = filtered.filter((r) => {
        const d = new Date(r.createdAt);
        return d >= new Date(start) && d <= new Date(end);
      });
    }
    if (methodFilter) {
      filtered = filtered.filter((r) => r.paymentMethod === methodFilter);
    }
    return filtered;
  }, [allReceipts, start, end, methodFilter]);

  // Stats
  const stats = useMemo(() => {
    let totalAmount = 0;
    const byMethod: Record<string, { amount: number; count: number }> = {};

    for (const r of receipts) {
      const amount = Number(r.total);
      totalAmount += amount;
      const method = r.paymentMethod;
      if (!byMethod[method]) byMethod[method] = { amount: 0, count: 0 };
      byMethod[method].amount += amount;
      byMethod[method].count += 1;
    }

    return { totalAmount, totalCount: receipts.length, byMethod };
  }, [receipts]);

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link to="/" className="inline-flex items-center justify-center rounded-lg p-2 text-text-muted hover:bg-surface-tertiary hover:text-text-primary transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
            Sotuv hisoboti {methodFilter ? `— ${METHOD_LABELS[methodFilter] ?? methodFilter}` : ''}
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            {PERIOD_LABELS[period] ?? period} | {receipts.length} ta chek
          </p>
        </div>
      </div>

      {/* Summary Stats — 2 ta card: jami summa + cheklar soni */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="stat-card">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 mb-2">
            <ShoppingCart className="h-4 w-4 text-primary-600" />
          </div>
          <p className="stat-value">{formatCurrency(stats.totalAmount)}</p>
          <p className="stat-label mt-1">{methodFilter ? `${METHOD_LABELS[methodFilter] ?? methodFilter} jami` : 'Jami sotuv'}</p>
        </div>
        <div className="stat-card">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info-50 mb-2">
            <Receipt className="h-4 w-4 text-info-600" />
          </div>
          <p className="stat-value">{stats.totalCount}</p>
          <p className="stat-label mt-1">Cheklar soni</p>
        </div>
      </div>

      {/* Receipts Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      ) : receipts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Receipt className="mb-4 h-16 w-16 opacity-30" />
          <p className="text-base font-medium">Bu davrda sotuv yo'q</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Chek #</th>
                <th>Sana</th>
                <th>Mijoz</th>
                <th>Kassir</th>
                <th>Usul</th>
                <th className="text-right">Summa</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium tabular-nums">#{String(r.number).padStart(6, '0')}</td>
                  <td className="text-text-muted text-xs">{formatDateTime(r.createdAt)}</td>
                  <td>
                    {r.customer ? (
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-50 text-[10px] font-bold text-primary-700">
                          {r.customer.name.charAt(0)}
                        </div>
                        <span className="text-sm">{r.customer.name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-tertiary text-[10px] font-bold text-text-muted">
                          O
                        </div>
                        <span className="text-sm text-text-muted">Oddiy mijoz</span>
                      </div>
                    )}
                  </td>
                  <td className="text-sm text-text-secondary">{r.createdBy?.name ?? '—'}</td>
                  <td>
                    <span className="badge badge-neutral text-[10px]">
                      {METHOD_LABELS[r.paymentMethod] ?? r.paymentMethod}
                    </span>
                  </td>
                  <td className="text-right font-semibold tabular-nums">{formatCurrency(Number(r.total))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-secondary font-semibold">
                <td colSpan={5}>Jami</td>
                <td className="text-right tabular-nums">{formatCurrency(stats.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
