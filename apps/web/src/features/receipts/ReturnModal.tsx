import { useState, useMemo } from 'react';
import { Undo2, Package, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@sardorbek/shared';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useCreateReturn } from '@/hooks/useReturns';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import type { ReceiptItem as ReceiptType } from '@/types/api';

interface ReturnLine {
  receiptItemId: string;
  productId: string;
  productName: string;
  unitPrice: number;
  maxQty: number;
  qty: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  receipt: ReceiptType | null;
  /** Mahsulot bo'yicha avval qaytarilgan jami miqdor (productId -> qty). Optional */
  alreadyReturned?: Record<string, number>;
}

const RETURN_PERIOD_DAYS = 14;

export function ReturnModal({ open, onClose, receipt, alreadyReturned = {} }: Props) {
  const { toast } = useToast();
  const createMut = useCreateReturn();
  const [lines, setLines] = useState<ReturnLine[]>([]);
  const [reason, setReason] = useState('');

  // Receipt o'zgarganda inputlarni qayta tayyorlash
  useMemo(() => {
    if (!receipt) { setLines([]); return; }
    const init: ReturnLine[] = receipt.items.map((it) => {
      const returned = alreadyReturned[it.productId] ?? 0;
      const maxQty = Math.max(0, it.quantity - returned);
      return {
        receiptItemId: it.id,
        productId: it.productId,
        productName: it.productName,
        unitPrice: Number(it.unitPrice),
        maxQty,
        qty: 0,
      };
    });
    setLines(init);
  }, [receipt, alreadyReturned]);

  if (!receipt) return null;

  const daysSince = Math.floor((Date.now() - new Date(receipt.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const periodExpired = daysSince > RETURN_PERIOD_DAYS;

  function updateQty(i: number, q: number) {
    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, qty: Math.max(0, Math.min(q, l.maxQty)) } : l));
  }

  function setMax(i: number) {
    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, qty: l.maxQty } : l));
  }

  async function handleSubmit() {
    if (!receipt) return;
    const items = lines.filter((l) => l.qty > 0);
    if (items.length === 0) { toast("Hech bo'lmasa bitta mahsulot tanlang", 'error'); return; }
    if (!reason.trim()) { toast("Qaytarish sababini yozing", 'error'); return; }
    try {
      await createMut.mutateAsync({
        receiptId: receipt.id,
        items: items.map((l) => ({ receiptItemId: l.receiptItemId, quantity: l.qty })),
        reason: reason.trim(),
      });
      toast(`${items.length} ta mahsulot qaytarildi`, 'success');
      setReason('');
      onClose();
    } catch (err) {
      const msg = (err as { message?: string }).message ?? 'Qaytarish xatoligi';
      toast(msg, 'error');
    }
  }

  const totalReturn = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <Modal open={open} onClose={onClose} title={`Qaytarish — Chek #${receipt.number}`} size="lg">
      <div className="space-y-4">
        {/* Receipt info */}
        <div className="rounded-lg bg-surface-secondary/40 p-3 text-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-semibold text-text-primary">Chek raqami: #{receipt.number}</p>
              <p className="text-text-muted">{formatDateTime(receipt.createdAt)}</p>
              {receipt.customer && (
                <p className="text-text-muted mt-0.5">Mijoz: {receipt.customer.name}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-text-muted">Chek summasi</p>
              <p className="text-base font-bold text-text-primary tabular-nums">{formatCurrency(Number(receipt.total))}</p>
            </div>
          </div>
        </div>

        {/* Period warning */}
        {periodExpired ? (
          <div className="flex items-start gap-2 rounded-lg bg-danger-50 border border-danger-200 p-3">
            <AlertCircle className="h-4 w-4 text-danger-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-danger-700">Qaytarish muddati o'tgan</p>
              <p className="text-danger-600 mt-0.5">Chek {daysSince} kun avval yaratilgan. Qaytarish muddati: {RETURN_PERIOD_DAYS} kun.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-lg bg-info-50 border border-info-200 p-3">
            <AlertCircle className="h-4 w-4 text-info-600 shrink-0 mt-0.5" />
            <p className="text-xs text-info-700">
              Qaytarilgan mahsulotlar zaxiraga (do'kon) qaytariladi. Chek qarzga sotilgan bo'lsa, qarz miqdori kamayadi.
            </p>
          </div>
        )}

        {/* Items */}
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-secondary/60 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Mahsulot</th>
                <th className="px-3 py-2 text-right w-20">Sotilgan</th>
                <th className="px-3 py-2 text-center w-28">Qaytariladi</th>
                <th className="px-3 py-2 text-right w-28">Summa</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.receiptItemId} className={cn('border-t border-border/30', l.maxQty === 0 && 'opacity-40')}>
                  <td className="px-3 py-2">
                    <p className="font-medium text-text-primary">{l.productName}</p>
                    <p className="text-[10px] text-text-muted">{formatCurrency(l.unitPrice)} / dona</p>
                  </td>
                  <td className="px-3 py-2 text-right text-text-muted tabular-nums">{l.maxQty}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={l.qty}
                        disabled={l.maxQty === 0 || periodExpired}
                        onChange={(e) => updateQty(i, parseInt(e.target.value.replace(/\D/g, '') || '0', 10))}
                        className="w-full rounded border border-border bg-surface-secondary/40 px-2 py-1 text-center text-[13px] tabular-nums font-semibold focus:outline-2 focus:outline-primary-500 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        disabled={l.maxQty === 0 || periodExpired}
                        onClick={() => setMax(i)}
                        className="text-[10px] text-primary-600 hover:text-primary-700 disabled:opacity-30 font-medium px-1"
                        title="Maksimal"
                      >
                        Max
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {l.qty > 0 ? formatCurrency(l.qty * l.unitPrice) : '—'}
                  </td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-text-muted text-xs">
                  <Package className="h-8 w-8 mx-auto opacity-20 mb-2" />
                  Mahsulot yo'q
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Reason */}
        <div>
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Qaytarish sababi *</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Masalan: Yaroqsiz, sifati past, mijoz fikrini o'zgartirdi..."
            rows={2}
            disabled={periodExpired}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-text-muted/40 resize-none focus:outline-2 focus:outline-primary-500 disabled:opacity-50"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
          <div className="flex gap-4">
            <div>
              <p className="text-[10px] text-text-muted uppercase">Qaytariladi</p>
              <p className="text-sm font-bold text-text-primary tabular-nums">{totalQty} ta</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase">Summa</p>
              <p className="text-sm font-bold text-danger-600 tabular-nums">{formatCurrency(totalReturn)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={createMut.isPending}>Bekor qilish</Button>
            <Button
              onClick={handleSubmit}
              loading={createMut.isPending}
              disabled={periodExpired || totalQty === 0 || !reason.trim()}
            >
              <Undo2 className="h-4 w-4" />
              Qaytarishni saqlash
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
