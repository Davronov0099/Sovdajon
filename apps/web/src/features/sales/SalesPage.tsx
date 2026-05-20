import { useMemo, useState, useRef } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import {
  ShoppingCart, TrendingUp, CreditCard, Banknote, FileText, Receipt as ReceiptIcon,
  Printer, Undo2, Trash2, ChevronDown, ChevronUp,
  Table as TableIcon, LayoutGrid, List, AlertTriangle,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@sardorbek/shared';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { useReceipts, useDeleteReceipt } from '@/hooks/useReceipts';
import { useToast } from '@/components/ui/toast';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ReturnModal } from '@/features/receipts/ReturnModal';
import { cn } from '@/lib/cn';
import type { ReceiptItem } from '@/types/api';

type Period = 'today' | 'month' | 'year' | 'all';
type PaymentType = 'all' | 'cash' | 'debt';
type ViewMode = 'table' | 'card' | 'list';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Bugun' },
  { key: 'month', label: 'Oy' },
  { key: 'year', label: 'Yil' },
  { key: 'all', label: 'Hammasi' },
];

const PAYMENT_TYPES: { key: PaymentType; label: string }[] = [
  { key: 'all', label: 'Barchasi' },
  { key: 'cash', label: 'Naqtga sotuvlar' },
  { key: 'debt', label: 'Qarzga sotuvlar' },
];

const VIEW_MODES: { key: ViewMode; label: string; icon: typeof TableIcon }[] = [
  { key: 'table', label: 'Jadval', icon: TableIcon },
  { key: 'card', label: 'Karta', icon: LayoutGrid },
  { key: 'list', label: 'Roʻyxat', icon: List },
];

function getPeriodRange(p: Period): { start?: string; end?: string } {
  if (p === 'all') return {};
  const now = new Date();
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  if (p === 'today') start.setHours(0, 0, 0, 0);
  else if (p === 'month') { start.setMonth(start.getMonth() - 1); start.setHours(0, 0, 0, 0); }
  else if (p === 'year') { start.setFullYear(start.getFullYear() - 1); start.setHours(0, 0, 0, 0); }
  return { start: start.toISOString(), end: end.toISOString() };
}

const PAYMENT_LABEL: Record<string, { label: string; cls: string }> = {
  CASH: { label: 'Naqd', cls: 'bg-success-50 text-success-700' },
  CARD: { label: 'Karta', cls: 'bg-blue-50 text-blue-700' },
  CLICK: { label: 'Click', cls: 'bg-violet-50 text-violet-700' },
  TRANSFER: { label: 'Pul oʻtkazma', cls: 'bg-cyan-50 text-cyan-700' },
  DEBT: { label: 'Qarz', cls: 'bg-warning-50 text-warning-700' },
  MIXED: { label: 'Aralash', cls: 'bg-primary-50 text-primary-700' },
};

export function SalesPage() {
  const search = useSearch({ from: '/_auth/sales' });
  const navigate = useNavigate();
  const { toast } = useToast();
  const period = search.period;
  const type = search.type;
  const view = search.view;

  const setSearch = (next: Partial<typeof search>) => {
    navigate({ to: '/sales', search: (prev) => ({ ...prev, ...next }) });
  };

  const range = useMemo(() => getPeriodRange(period), [period]);

  // Stats — period bo'yicha (payment type ta'sir qilmaydi)
  const { data: summaryResp, isLoading: statsLoading } = useDashboardSummary(range.start ?? '', range.end ?? '');
  const stats = summaryResp?.data;

  // Receipts — period + payment type filter
  const paymentMethod = type === 'cash' ? 'CASH' : type === 'debt' ? 'DEBT' : undefined;
  const { data: receiptsResp, isLoading: listLoading } = useReceipts({
    page: 1,
    limit: 200,
    startDate: range.start,
    endDate: range.end,
    paymentMethod,
  });
  const receipts: ReceiptItem[] = useMemo(() => receiptsResp?.data ?? [], [receiptsResp]);

  // Row actions state
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [printRow, setPrintRow] = useState<ReceiptItem | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [returnFor, setReturnFor] = useState<ReceiptItem | null>(null);
  const [deleteFor, setDeleteFor] = useState<ReceiptItem | null>(null);
  const deleteMut = useDeleteReceipt();

  const toggleExpand = (id: string) => {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  function handlePrint(r: ReceiptItem) {
    setPrintRow(r);
    // Wait one frame for the print template to mount, then print
    setTimeout(() => { window.print(); setPrintRow(null); }, 80);
  }

  async function handleDelete() {
    if (!deleteFor) return;
    try {
      await deleteMut.mutateAsync(deleteFor.id);
      toast("Savdo o'chirildi", 'success');
      setDeleteFor(null);
    } catch (err) {
      toast((err as { message?: string }).message ?? "O'chirish xatosi", 'error');
    }
  }

  // Derived stats
  const totalCount = receipts.length;
  const totalSum = receipts.reduce((s, r) => s + Number(r.total), 0);
  const debtSum = receipts.filter((r) => r.paymentMethod === 'DEBT').reduce((s, r) => s + Number(r.total), 0);
  const cashSum = receipts.filter((r) => r.paymentMethod === 'CASH').reduce((s, r) => s + Number(r.total), 0);
  const avgCheck = totalCount > 0 ? totalSum / totalCount : 0;

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-text-primary">Sotuvlar</h1>
          <p className="text-[11px] sm:text-sm text-text-muted">Savdolar boshqaruvi va hisobotlar</p>
        </div>
        {/* Period filter */}
        <div className="flex rounded-lg p-0.5 sm:p-1 gap-0.5 shrink-0" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setSearch({ period: p.key })}
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
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-6">
        <StatCard label="Jami savdolar" value={formatCurrency(stats?.totalSales ?? 0)} icon={ShoppingCart} bg="bg-primary-50" color="text-primary-600" loading={statsLoading} />
        <StatCard label="Sof foyda" value={formatCurrency(stats?.profit ?? 0)} icon={TrendingUp} bg="bg-success-50" color="text-success-600" loading={statsLoading} />
        <StatCard label="Qarzga savdolar" value={formatCurrency(stats?.debt ?? 0)} icon={CreditCard} bg="bg-warning-50" color="text-warning-600" loading={statsLoading} />
        <StatCard label="Naqd savdolar" value={formatCurrency(stats?.cash ?? 0)} icon={Banknote} bg="bg-emerald-50" color="text-emerald-600" loading={statsLoading} />
        <StatCard label="Savdolar soni" value={String(stats?.totalCount ?? 0)} sub={`${totalCount} ko'rsatilmoqda`} icon={FileText} bg="bg-blue-50" color="text-blue-600" loading={statsLoading} />
        <StatCard label="O'rtacha chek" value={formatCurrency((stats?.totalCount ?? 0) > 0 ? (stats!.totalSales / stats!.totalCount) : 0)} icon={ReceiptIcon} bg="bg-violet-50" color="text-violet-600" loading={statsLoading} />
      </div>

      {/* Filter row: payment type + view modes */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex rounded-lg p-0.5 gap-0.5 shrink-0 overflow-x-auto" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          {PAYMENT_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setSearch({ type: t.key })}
              className={cn(
                'px-2.5 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap',
                type === t.key ? 'bg-primary-600 text-white shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface-tertiary',
              )}
              style={{ minHeight: 'auto', minWidth: 'auto' }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg p-0.5 gap-0.5 shrink-0" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          {VIEW_MODES.map((v) => {
            const Icon = v.icon;
            const active = view === v.key;
            return (
              <button
                key={v.key}
                onClick={() => setSearch({ view: v.key })}
                className={cn(
                  'flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-md text-[11px] sm:text-xs font-medium transition-all',
                  active ? 'bg-primary-600 text-white shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface-tertiary',
                )}
                style={{ minHeight: 'auto', minWidth: 'auto' }}
                title={v.label}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading / Empty */}
      {listLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      ) : receipts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <ReceiptIcon className="h-12 w-12 opacity-20 mb-3" />
          <p className="text-sm font-medium">Savdo topilmadi</p>
          <p className="text-[11px] text-text-muted/70 mt-1">Boshqa davr yoki to'lov turini tanlang</p>
        </div>
      ) : view === 'table' ? (
        <SalesTable
          receipts={receipts}
          expanded={expanded}
          onToggle={toggleExpand}
          onPrint={handlePrint}
          onReturn={setReturnFor}
          onDelete={setDeleteFor}
        />
      ) : view === 'card' ? (
        <SalesCards
          receipts={receipts}
          expanded={expanded}
          onToggle={toggleExpand}
          onPrint={handlePrint}
          onReturn={setReturnFor}
          onDelete={setDeleteFor}
        />
      ) : (
        <SalesList
          receipts={receipts}
          expanded={expanded}
          onToggle={toggleExpand}
          onPrint={handlePrint}
          onReturn={setReturnFor}
          onDelete={setDeleteFor}
        />
      )}

      {/* Total summary for filtered table */}
      {receipts.length > 0 && (
        <div className="rounded-lg bg-surface-secondary/50 px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] sm:text-xs text-text-secondary">
          <span><strong className="text-text-primary tabular-nums">{totalCount}</strong> ta chek</span>
          <span>Jami: <strong className="text-text-primary tabular-nums">{formatCurrency(totalSum)}</strong></span>
          {cashSum > 0 && <span>Naqd: <strong className="text-success-700 tabular-nums">{formatCurrency(cashSum)}</strong></span>}
          {debtSum > 0 && <span>Qarz: <strong className="text-warning-700 tabular-nums">{formatCurrency(debtSum)}</strong></span>}
          <span className="ml-auto">O'rtacha: <strong className="text-text-primary tabular-nums">{formatCurrency(avgCheck)}</strong></span>
        </div>
      )}

      {/* Return modal — uses existing ReturnModal */}
      <ReturnModal
        open={returnFor !== null}
        onClose={() => setReturnFor(null)}
        receipt={returnFor}
      />

      {/* Delete confirm */}
      <Modal open={deleteFor !== null} onClose={() => setDeleteFor(null)} title="Savdoni o'chirishni tasdiqlang" size="sm">
        {deleteFor && (
          <div className="space-y-3">
            <div className="flex gap-2.5 rounded-lg bg-danger-50 p-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-danger-600" />
              <div className="text-[12px] text-danger-800 leading-snug">
                <p>Chek <b>#{deleteFor.number}</b> ({formatCurrency(Number(deleteFor.total))} so'm) va unga bog'liq qarz ma'lumotlari o'chiriladi.</p>
                <p className="mt-1.5 font-semibold">Bu amalni ortga qaytarib bo'lmaydi.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDeleteFor(null)} disabled={deleteMut.isPending}>Bekor</Button>
              <Button onClick={handleDelete} loading={deleteMut.isPending} className="bg-danger-600 hover:bg-danger-700 text-white">
                <Trash2 className="h-4 w-4" /> O'chirish
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Hidden print template — appears only during window.print() */}
      {printRow && (
        <div ref={printRef} className="print-only fixed inset-0 z-[9999] bg-white text-black p-6" style={{ display: 'none' }}>
          <PrintTemplate receipt={printRow} />
        </div>
      )}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-only, .print-only * { visibility: visible !important; }
          .print-only { display: block !important; position: absolute !important; inset: 0 !important; }
        }
      `}</style>
    </div>
  );
}

/* ─── Stat card ─── */
function StatCard({ label, value, sub, icon: Icon, bg, color, loading }: {
  label: string; value: string; sub?: string;
  icon: typeof ShoppingCart; bg: string; color: string; loading?: boolean;
}) {
  return (
    <div className="card p-2.5 sm:p-3 flex items-center gap-2.5">
      <div className={cn('flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg', bg)}>
        <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', color)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] sm:text-[10px] text-text-muted font-semibold uppercase truncate">{label}</p>
        {loading
          ? <Skeleton className="h-5 w-20 mt-0.5" />
          : <p className="text-sm sm:text-base font-bold text-text-primary tabular-nums leading-tight truncate">{value}</p>}
        {sub && <p className="text-[9px] sm:text-[10px] text-text-muted tabular-nums truncate">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Shared row props ─── */
interface RowsProps {
  receipts: ReceiptItem[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onPrint: (r: ReceiptItem) => void;
  onReturn: (r: ReceiptItem) => void;
  onDelete: (r: ReceiptItem) => void;
}

/* ─── Table view ─── */
function SalesTable({ receipts, expanded, onToggle, onPrint, onReturn, onDelete }: RowsProps) {
  return (
    <div className="card overflow-hidden">
      {/* Mobile: card-like rows; Desktop: table */}
      <div className="hidden lg:block">
        <table className="w-full text-[12.5px]">
          <thead className="bg-surface-secondary/60 text-[10px] uppercase tracking-wider text-text-muted">
            <tr>
              <th className="px-3 py-2 text-left w-12">#</th>
              <th className="px-3 py-2 text-left">Sana</th>
              <th className="px-3 py-2 text-left">Mijoz</th>
              <th className="px-3 py-2 text-left">Kassir</th>
              <th className="px-3 py-2 text-right">Summa</th>
              <th className="px-3 py-2 text-left">To'lov</th>
              <th className="px-3 py-2 text-left w-20">Holat</th>
              <th className="px-3 py-2 text-right w-44">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((r) => {
              const pm = PAYMENT_LABEL[r.paymentMethod] ?? { label: r.paymentMethod, cls: 'bg-gray-50 text-gray-700' };
              const isExpanded = expanded.has(r.id);
              return (
                <TableRowGroup
                  key={r.id} r={r} isExpanded={isExpanded} pm={pm}
                  onToggle={() => onToggle(r.id)}
                  onPrint={() => onPrint(r)}
                  onReturn={() => onReturn(r)}
                  onDelete={() => onDelete(r)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="lg:hidden divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
        {receipts.map((r) => (
          <CardRow key={r.id} r={r}
            isExpanded={expanded.has(r.id)}
            onToggle={() => onToggle(r.id)}
            onPrint={() => onPrint(r)}
            onReturn={() => onReturn(r)}
            onDelete={() => onDelete(r)}
          />
        ))}
      </div>
    </div>
  );
}

function TableRowGroup({ r, isExpanded, pm, onToggle, onPrint, onReturn, onDelete }: {
  r: ReceiptItem; isExpanded: boolean;
  pm: { label: string; cls: string };
  onToggle: () => void; onPrint: () => void; onReturn: () => void; onDelete: () => void;
}) {
  return (
    <>
      <tr className="border-t border-border/30 hover:bg-surface-secondary/40">
        <td className="px-3 py-2 text-text-muted font-medium tabular-nums">{r.number}</td>
        <td className="px-3 py-2 text-text-secondary text-[11.5px]">{formatDateTime(r.createdAt)}</td>
        <td className="px-3 py-2 text-text-primary">{r.customer?.name ?? <span className="text-text-muted italic">Mijozsiz</span>}</td>
        <td className="px-3 py-2 text-text-secondary">{r.createdBy?.name ?? '—'}</td>
        <td className="px-3 py-2 text-right font-bold text-text-primary tabular-nums">{formatCurrency(Number(r.total))}</td>
        <td className="px-3 py-2"><span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', pm.cls)}>{pm.label}</span></td>
        <td className="px-3 py-2"><span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', r.isDraft ? 'bg-warning-50 text-warning-700' : 'bg-success-50 text-success-700')}>{r.isDraft ? 'Qoralama' : 'Tugatildi'}</span></td>
        <td className="px-3 py-2">
          <div className="flex items-center justify-end gap-1">
            <ActionButton onClick={onToggle} icon={isExpanded ? ChevronUp : ChevronDown} title="Batafsil" />
            <ActionButton onClick={onPrint} icon={Printer} title="Chop etish" />
            <ActionButton onClick={onReturn} icon={Undo2} title="Qaytarish" tone="primary" />
            <ActionButton onClick={onDelete} icon={Trash2} title="O'chirish" tone="danger" />
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-surface-secondary/30">
          <td colSpan={8} className="px-3 py-3"><AccordionDetails r={r} /></td>
        </tr>
      )}
    </>
  );
}

function CardRow({ r, isExpanded, onToggle, onPrint, onReturn, onDelete }: {
  r: ReceiptItem; isExpanded: boolean;
  onToggle: () => void; onPrint: () => void; onReturn: () => void; onDelete: () => void;
}) {
  const pm = PAYMENT_LABEL[r.paymentMethod] ?? { label: r.paymentMethod, cls: 'bg-gray-50 text-gray-700' };
  return (
    <div className="p-3 hover:bg-surface-secondary/30">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-text-primary">#{r.number} <span className="font-normal text-text-muted text-[11px]">{formatDateTime(r.createdAt)}</span></p>
          <p className="text-[11px] text-text-muted truncate">{r.customer?.name ?? 'Mijozsiz'} · {r.createdBy?.name ?? '—'}</p>
        </div>
        <p className="text-[14px] font-bold text-text-primary tabular-nums shrink-0">{formatCurrency(Number(r.total))}</p>
      </div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', pm.cls)}>{pm.label}</span>
        {r.isDraft && <span className="rounded bg-warning-50 px-1.5 py-0.5 text-[10px] font-semibold text-warning-700">Qoralama</span>}
      </div>
      <div className="flex items-center gap-1">
        <ActionButton onClick={onToggle} icon={isExpanded ? ChevronUp : ChevronDown} title="Batafsil" />
        <ActionButton onClick={onPrint} icon={Printer} title="Chop etish" />
        <ActionButton onClick={onReturn} icon={Undo2} title="Qaytarish" tone="primary" />
        <ActionButton onClick={onDelete} icon={Trash2} title="O'chirish" tone="danger" />
      </div>
      {isExpanded && <div className="mt-3"><AccordionDetails r={r} /></div>}
    </div>
  );
}

/* ─── Card view (compact tiles grid) ─── */
function SalesCards(props: RowsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
      {props.receipts.map((r) => (
        <div key={r.id} className="card p-3">
          <CardRow r={r}
            isExpanded={props.expanded.has(r.id)}
            onToggle={() => props.onToggle(r.id)}
            onPrint={() => props.onPrint(r)}
            onReturn={() => props.onReturn(r)}
            onDelete={() => props.onDelete(r)}
          />
        </div>
      ))}
    </div>
  );
}

/* ─── List view (dense, single line per row) ─── */
function SalesList({ receipts, expanded, onToggle, onPrint, onReturn, onDelete }: RowsProps) {
  return (
    <div className="card divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
      {receipts.map((r) => {
        const pm = PAYMENT_LABEL[r.paymentMethod] ?? { label: r.paymentMethod, cls: 'bg-gray-50 text-gray-700' };
        const isEx = expanded.has(r.id);
        return (
          <div key={r.id}>
            <div className="flex items-center gap-2 px-3 py-2 hover:bg-surface-secondary/40">
              <span className="text-text-muted text-[11px] tabular-nums w-10 shrink-0">#{r.number}</span>
              <span className="text-text-secondary text-[11px] shrink-0 w-32 truncate">{formatDateTime(r.createdAt)}</span>
              <span className="text-text-primary text-[12px] flex-1 truncate">{r.customer?.name ?? <span className="text-text-muted italic">Mijozsiz</span>}</span>
              <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold shrink-0', pm.cls)}>{pm.label}</span>
              <span className="text-text-primary text-[12px] font-bold tabular-nums shrink-0 w-28 text-right">{formatCurrency(Number(r.total))}</span>
              <div className="flex items-center gap-0.5 shrink-0">
                <ActionButton onClick={() => onToggle(r.id)} icon={isEx ? ChevronUp : ChevronDown} title="Batafsil" small />
                <ActionButton onClick={() => onPrint(r)} icon={Printer} title="Chop etish" small />
                <ActionButton onClick={() => onReturn(r)} icon={Undo2} title="Qaytarish" tone="primary" small />
                <ActionButton onClick={() => onDelete(r)} icon={Trash2} title="O'chirish" tone="danger" small />
              </div>
            </div>
            {isEx && <div className="px-3 pb-3 bg-surface-secondary/20"><AccordionDetails r={r} /></div>}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Action button ─── */
function ActionButton({ onClick, icon: Icon, title, tone, small }: {
  onClick: () => void; icon: typeof Printer; title: string;
  tone?: 'primary' | 'danger'; small?: boolean;
}) {
  const cls = tone === 'primary'
    ? 'text-primary-600 hover:bg-primary-50'
    : tone === 'danger'
    ? 'text-danger-500 hover:bg-danger-50'
    : 'text-text-muted hover:bg-surface-secondary hover:text-text-primary';
  return (
    <button
      onClick={onClick}
      className={cn('flex items-center justify-center rounded-md transition-colors', small ? 'h-6 w-6' : 'h-7 w-7', cls)}
      style={{ minHeight: 'auto', minWidth: 'auto' }}
      title={title}
    >
      <Icon className={small ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
    </button>
  );
}

/* ─── Accordion (expanded row) details ─── */
function AccordionDetails({ r }: { r: ReceiptItem }) {
  const pm = PAYMENT_LABEL[r.paymentMethod] ?? { label: r.paymentMethod, cls: 'bg-gray-50 text-gray-700' };
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <div><span className="text-text-muted">Kassir:</span><br /><b className="text-text-primary">{r.createdBy?.name ?? '—'}</b></div>
        <div><span className="text-text-muted">Mijoz:</span><br /><b className="text-text-primary">{r.customer?.name ?? '—'}</b>{r.customer?.phone && <><br /><span className="text-text-muted">{r.customer.phone}</span></>}</div>
        <div><span className="text-text-muted">Sana/Vaqt:</span><br /><b className="text-text-primary">{formatDateTime(r.createdAt)}</b></div>
        <div><span className="text-text-muted">To'lov:</span><br /><span className={cn('inline-block rounded px-1.5 py-0.5 font-bold', pm.cls)}>{pm.label}</span></div>
      </div>
      <div className="rounded-lg border border-border/40 overflow-hidden bg-surface">
        <table className="w-full text-[11.5px]">
          <thead className="bg-surface-secondary text-text-muted">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">Mahsulot</th>
              <th className="px-2 py-1.5 text-right font-medium">Miqdor</th>
              <th className="px-2 py-1.5 text-right font-medium">Narx</th>
              <th className="px-2 py-1.5 text-right font-medium">Jami</th>
            </tr>
          </thead>
          <tbody>
            {r.items.map((it) => (
              <tr key={it.id} className="border-t border-border/30">
                <td className="px-2 py-1.5 text-text-primary">{it.productName}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{it.quantity}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(Number(it.unitPrice))}</td>
                <td className="px-2 py-1.5 text-right font-medium tabular-nums">{formatCurrency(Number(it.total))}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-border/60 bg-surface-secondary/40">
              <td colSpan={3} className="px-2 py-2 text-right text-[12px] font-bold text-text-primary">Jami:</td>
              <td className="px-2 py-2 text-right text-[12.5px] font-bold text-text-primary tabular-nums">{formatCurrency(Number(r.total))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Print template ─── */
function PrintTemplate({ receipt: r }: { receipt: ReceiptItem }) {
  const pm = PAYMENT_LABEL[r.paymentMethod] ?? { label: r.paymentMethod, cls: '' };
  return (
    <div style={{ fontFamily: 'monospace', maxWidth: 400, margin: '0 auto', fontSize: 12 }}>
      <h2 style={{ textAlign: 'center', margin: 0 }}>SovdaJON</h2>
      <p style={{ textAlign: 'center', margin: '4px 0' }}>Chek #{r.number}</p>
      <p style={{ textAlign: 'center', margin: '4px 0' }}>{formatDateTime(r.createdAt)}</p>
      <hr />
      <p>Kassir: {r.createdBy?.name ?? '—'}</p>
      {r.customer && <p>Mijoz: {r.customer.name} ({r.customer.phone})</p>}
      <hr />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Mahsulot</th>
            <th style={{ textAlign: 'right' }}>Mq</th>
            <th style={{ textAlign: 'right' }}>Narx</th>
            <th style={{ textAlign: 'right' }}>Jami</th>
          </tr>
        </thead>
        <tbody>
          {r.items.map((it) => (
            <tr key={it.id}>
              <td>{it.productName}</td>
              <td style={{ textAlign: 'right' }}>{it.quantity}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(Number(it.unitPrice))}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(Number(it.total))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr />
      <p style={{ textAlign: 'right', fontWeight: 700, fontSize: 14 }}>JAMI: {formatCurrency(Number(r.total))}</p>
      <p style={{ textAlign: 'right' }}>To'lov: {pm.label}</p>
      <p style={{ textAlign: 'center', marginTop: 16 }}>Rahmat! Yana keling 🙏</p>
    </div>
  );
}
