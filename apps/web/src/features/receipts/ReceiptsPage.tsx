import { useState, useMemo } from 'react';
import {
  Receipt as ReceiptIcon, Search, User, Calendar, Package, ChevronDown,
  Undo2, Banknote, CreditCard, Wallet, ArrowLeftRight, Coins, Layers,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@sardorbek/shared';
import { SearchInput } from '@/components/common/SearchInput';
import { Skeleton } from '@/components/ui/skeleton';
import { useReceipts } from '@/hooks/useReceipts';
import { ReturnModal } from './ReturnModal';
import { cn } from '@/lib/cn';
import type { ReceiptItem } from '@/types/api';

const PAYMENT_CONFIG: Record<string, { label: string; icon: typeof Banknote; cls: string }> = {
  CASH:     { label: 'Naqd',    icon: Banknote,      cls: 'bg-success-50 text-success-700' },
  CARD:     { label: 'Karta',   icon: CreditCard,    cls: 'bg-info-50 text-info-700' },
  CLICK:    { label: 'Click',   icon: Wallet,        cls: 'bg-primary-50 text-primary-700' },
  TRANSFER: { label: "O'tkazma", icon: ArrowLeftRight, cls: 'bg-warning-50 text-warning-700' },
  DEBT:     { label: 'Qarzga',  icon: Coins,         cls: 'bg-danger-50 text-danger-700' },
  MIXED:    { label: 'Aralash', icon: Layers,        cls: 'bg-purple-50 text-purple-700' },
};

export function ReceiptsPage() {
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [returnReceipt, setReturnReceipt] = useState<ReceiptItem | null>(null);

  const { data, isLoading } = useReceipts({
    search,
    paymentMethod: paymentFilter || undefined,
    isDraft: false,
    limit: 50,
  });

  const receipts: ReceiptItem[] = useMemo(() => data?.data ?? [], [data]);
  const total = data?.pagination?.total ?? 0;

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Cheklar tarixi</h1>
        <p className="text-sm text-text-muted mt-0.5">{total} ta chek · qaytarish va detallarini ko'rish</p>
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          onClick={() => setPaymentFilter('')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
            !paymentFilter ? 'bg-primary-600 text-white shadow-sm' : 'bg-surface text-text-secondary hover:bg-surface-secondary',
          )}
          style={!paymentFilter ? undefined : { border: '1px solid var(--color-border)' }}
        >
          Barchasi
        </button>
        {Object.entries(PAYMENT_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setPaymentFilter(paymentFilter === key ? '' : key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
              paymentFilter === key ? 'bg-primary-600 text-white shadow-sm' : 'bg-surface text-text-secondary hover:bg-surface-secondary',
            )}
            style={paymentFilter !== key ? { border: '1px solid var(--color-border)' } : undefined}
          >
            <cfg.icon className="h-3.5 w-3.5" />
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Chek raqami, mijoz nomi yoki telefon..." className="w-full" />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : receipts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <ReceiptIcon className="mb-4 h-14 w-14 opacity-15" />
          <p className="text-base font-medium">Chek topilmadi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {receipts.map((r) => (
            <ReceiptRow
              key={r.id}
              receipt={r}
              expanded={expandedId === r.id}
              onToggle={() => setExpandedId((p) => p === r.id ? null : r.id)}
              onReturn={() => setReturnReceipt(r)}
            />
          ))}
        </div>
      )}

      <ReturnModal
        open={!!returnReceipt}
        onClose={() => setReturnReceipt(null)}
        receipt={returnReceipt}
      />
    </div>
  );
}

/* ─── Receipt row ─── */
function ReceiptRow({
  receipt: r,
  expanded,
  onToggle,
  onReturn,
}: {
  receipt: ReceiptItem;
  expanded: boolean;
  onToggle: () => void;
  onReturn: () => void;
}) {
  const cfg = PAYMENT_CONFIG[r.paymentMethod] ?? PAYMENT_CONFIG.CASH;
  const totalQty = r.items.reduce((s, i) => s + i.quantity, 0);
  const daysSince = Math.floor((Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const canReturn = daysSince <= 14;

  return (
    <div className="card">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-3 sm:p-4 text-left hover:bg-surface-secondary/30 transition-colors"
        style={{ minHeight: 'auto' }}
      >
        <div className={cn('flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg', cfg.cls)}>
          <cfg.icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-text-primary">#{r.number}</span>
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', cfg.cls)}>{cfg.label}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
            {r.customer ? (
              <span className="inline-flex items-center gap-1 truncate max-w-[150px]">
                <User className="h-3 w-3 shrink-0" />
                {r.customer.name}
              </span>
            ) : (
              <span className="italic text-text-muted/50">Mijozsiz</span>
            )}
            <span className="inline-flex items-center gap-1">
              <Package className="h-3 w-3 shrink-0" />
              {totalQty} ta
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3 shrink-0" />
              {formatDateTime(r.createdAt)}
            </span>
            {r.createdBy && (
              <span className="text-text-muted/70">· {r.createdBy.name}</span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-sm sm:text-base font-bold text-primary-600 tabular-nums">
            {formatCurrency(Number(r.total))}
          </p>
          <ChevronDown className={cn('inline-block h-4 w-4 text-text-muted transition-transform mt-0.5', expanded && 'rotate-180')} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/30 p-3 sm:p-4 bg-surface-secondary/20">
          {/* Items */}
          <div className="rounded-lg border border-border/30 overflow-hidden mb-3 bg-surface">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="bg-surface-secondary/60 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  <th className="px-3 py-1.5 text-left">Mahsulot</th>
                  <th className="px-3 py-1.5 text-right w-14">Miqdor</th>
                  <th className="px-3 py-1.5 text-right w-24">Narx</th>
                  <th className="px-3 py-1.5 text-right w-24">Jami</th>
                </tr>
              </thead>
              <tbody>
                {r.items.map((it) => (
                  <tr key={it.id} className="border-t border-border/20">
                    <td className="px-3 py-1.5 text-text-primary truncate max-w-[180px]">{it.productName}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{it.quantity}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(Number(it.unitPrice))}</td>
                    <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{formatCurrency(Number(it.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onReturn}
              disabled={!canReturn}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                canReturn
                  ? 'bg-warning-600 text-white hover:bg-warning-700'
                  : 'bg-surface text-text-muted cursor-not-allowed opacity-50',
              )}
              title={canReturn ? "Qaytarish" : `Muddat o'tgan (${daysSince} kun)`}
              style={{ minHeight: 'auto' }}
            >
              <Undo2 className="h-3 w-3" />
              {canReturn ? 'Qaytarish' : `Muddat o'tgan`}
            </button>
            <span className="text-[10px] text-text-muted">
              {daysSince === 0 ? "Bugun" : daysSince === 1 ? "Kecha" : `${daysSince} kun avval`}
              {canReturn && <> · Qolgan muddat: {14 - daysSince} kun</>}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
