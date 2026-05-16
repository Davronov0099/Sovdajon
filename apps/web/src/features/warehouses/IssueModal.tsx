import { useState, useMemo, useCallback } from 'react';
import { Search, X, Plus, Trash2, Package, ArrowUpFromLine, Store } from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useWarehouseProducts, useIssueWarehouseStock } from '@/hooks/useWarehouses';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import type { WarehouseStockItem } from '@/types/api';

interface IssueItem {
  productId: string;
  productName: string;
  available: number;
  quantity: number;
  unitPrice: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  warehouseId: string;
  warehouseName: string;
}

export function IssueModal({ open, onClose, warehouseId, warehouseName }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<IssueItem[]>([]);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [note, setNote] = useState('');

  const { data: productsData } = useWarehouseProducts(warehouseId, { search, limit: 20 });
  const issueMut = useIssueWarehouseStock();

  const products: WarehouseStockItem[] = useMemo(() => productsData?.data ?? [], [productsData]);

  const reset = useCallback(() => {
    setItems([]);
    setSearch('');
    setNote('');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  function addProduct(s: WarehouseStockItem) {
    if (items.find((i) => i.productId === s.productId)) {
      toast("Bu mahsulot allaqachon qo'shilgan", 'error');
      return;
    }
    setItems((prev) => [...prev, {
      productId: s.productId,
      productName: s.product.name,
      available: s.quantity,
      quantity: 1,
      unitPrice: Number(s.product.price),
    }]);
    setSearch('');
    setSearchFocused(false);
  }

  function updateQuantity(index: number, qty: number) {
    setItems((prev) => prev.map((it, i) => {
      if (i !== index) return it;
      const clamped = Math.max(1, Math.min(qty, it.available));
      return { ...it, quantity: clamped };
    }));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (items.length === 0) { toast("Kamida 1 ta mahsulot qo'shing", 'error'); return; }
    try {
      await issueMut.mutateAsync({
        warehouseId,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        note: note || undefined,
      });
      toast(`${items.length} ta mahsulot do'konga chiqarildi`, 'success');
      handleClose();
    } catch (err) {
      const msg = (err as { message?: string }).message ?? 'Chiqim xatoligi';
      toast(msg, 'error');
    }
  }

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const totalValue = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const showDropdown = searchFocused && search.length >= 1 && products.length > 0;

  return (
    <Modal open={open} onClose={handleClose} title={`Do'konga chiqim — ${warehouseName}`} size="lg">
      <div className="space-y-4">
        {/* Flow visual */}
        <div className="flex items-center justify-center gap-3 rounded-lg bg-surface-secondary/50 py-2.5 text-[12px] text-text-muted">
          <div className="flex items-center gap-1.5 font-medium">
            <Package className="h-3.5 w-3.5" />
            <span>Ombor</span>
          </div>
          <ArrowUpFromLine className="h-4 w-4 text-primary-600" />
          <div className="flex items-center gap-1.5 font-medium">
            <Store className="h-3.5 w-3.5" />
            <span>Do'kon (mahsulotlar bo'limi)</span>
          </div>
        </div>

        {/* Product search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            placeholder="Ombordagi mahsulotni qidirish..."
            className="w-full rounded-lg border border-border bg-surface pl-9 pr-9 py-2 text-sm placeholder:text-text-muted/50 focus:outline-2 focus:outline-primary-500"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {showDropdown && (
            <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-dropdown">
              <div className="max-h-60 overflow-auto">
                {products.map((s) => {
                  const added = items.some((i) => i.productId === s.productId);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => !added && addProduct(s)}
                      disabled={added}
                      className={cn(
                        'flex w-full items-center gap-2.5 px-3 py-2 text-left border-b border-border/15 last:border-0',
                        added ? 'opacity-30' : 'hover:bg-primary-50/40',
                      )}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-surface-secondary text-text-muted">
                        <Package className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-text-primary truncate">{s.product.name}</p>
                        <p className="text-[11px] text-text-muted">Omborda: {s.quantity} ta · {formatCurrency(Number(s.product.price))}</p>
                      </div>
                      {!added && <Plus className="h-4 w-4 text-primary-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Selected items */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-text-muted">
            <Package className="h-10 w-10 opacity-20 mb-2" />
            <p className="text-sm font-medium">Mahsulot qo'shilmagan</p>
            <p className="text-xs mt-1">Yuqoridagi qidiruv orqali tanlang</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-secondary/60 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  <th className="px-3 py-2 text-left">Mahsulot</th>
                  <th className="px-3 py-2 text-center w-28">Miqdor</th>
                  <th className="px-3 py-2 text-right w-24">Jami</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.productId} className="border-t border-border/30">
                    <td className="px-3 py-2">
                      <p className="font-medium text-text-primary">{item.productName}</p>
                      <p className="text-[10px] text-text-muted">Omborda mavjud: {item.available} ta</p>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(i, parseInt(e.target.value.replace(/\D/g, '') || '0', 10))}
                        className="w-full rounded border border-border bg-surface-secondary/40 px-2 py-1 text-center text-[13px] tabular-nums font-semibold focus:outline-2 focus:outline-primary-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-text-primary tabular-nums">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </td>
                    <td className="px-2 py-2">
                      <button onClick={() => removeItem(i)} className="rounded p-1 text-text-muted/40 hover:text-danger-600 hover:bg-danger-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Note */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Izoh (ixtiyoriy)..."
          rows={2}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-text-muted/40 resize-none focus:outline-2 focus:outline-primary-500"
        />

        {/* Summary + Actions */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
          <div className="flex gap-4">
            <div>
              <p className="text-[10px] text-text-muted uppercase">Mahsulot</p>
              <p className="text-sm font-bold text-text-primary">{items.length}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase">Miqdor</p>
              <p className="text-sm font-bold text-text-primary tabular-nums">{totalQty} ta</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase">Qiymat</p>
              <p className="text-sm font-bold text-primary-600 tabular-nums">{formatCurrency(totalValue)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={issueMut.isPending}>Bekor qilish</Button>
            <Button onClick={handleSubmit} loading={issueMut.isPending} disabled={items.length === 0}>
              <ArrowUpFromLine className="h-4 w-4" />
              Chiqim qilish
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
