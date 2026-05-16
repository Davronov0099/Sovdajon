import { useState, useMemo, useCallback } from 'react';
import { Search, X, Plus, Trash2, Package, ArrowLeftRight, Warehouse, ChevronDown } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useWarehouses, useWarehouseProducts, useTransferWarehouseStock } from '@/hooks/useWarehouses';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import type { WarehouseStockItem } from '@/types/api';

interface TransferItem {
  productId: string;
  productName: string;
  available: number;
  quantity: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  warehouseId: string;
  warehouseName: string;
}

export function TransferModal({ open, onClose, warehouseId, warehouseName }: Props) {
  const { toast } = useToast();
  const { data: warehousesData } = useWarehouses();
  const allWarehouses = warehousesData?.data ?? [];
  const destinations = allWarehouses.filter((w) => w.id !== warehouseId);

  const [toWarehouseId, setToWarehouseId] = useState('');
  const [destDropdownOpen, setDestDropdownOpen] = useState(false);
  const [items, setItems] = useState<TransferItem[]>([]);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [note, setNote] = useState('');

  const { data: productsData } = useWarehouseProducts(warehouseId, { search, limit: 20 });
  const transferMut = useTransferWarehouseStock();

  const products: WarehouseStockItem[] = useMemo(() => productsData?.data ?? [], [productsData]);
  const toWarehouse = destinations.find((w) => w.id === toWarehouseId);

  const reset = useCallback(() => {
    setToWarehouseId('');
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
    if (!toWarehouseId) { toast("Maqsad omborni tanlang", 'error'); return; }
    if (items.length === 0) { toast("Kamida 1 ta mahsulot qo'shing", 'error'); return; }
    try {
      await transferMut.mutateAsync({
        warehouseId,
        toWarehouseId,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        note: note || undefined,
      });
      toast(`${items.length} ta mahsulot "${toWarehouse?.name}" omborga ko'chirildi`, 'success');
      handleClose();
    } catch (err) {
      const msg = (err as { message?: string }).message ?? "Ko'chirish xatoligi";
      toast(msg, 'error');
    }
  }

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const showDropdown = searchFocused && search.length >= 1 && products.length > 0;

  return (
    <Modal open={open} onClose={handleClose} title={`Boshqa omborga ko'chirish — ${warehouseName}`} size="lg">
      <div className="space-y-4">
        {/* Flow visual */}
        <div className="flex items-center justify-center gap-3 rounded-lg bg-surface-secondary/50 py-2.5 text-[12px]">
          <div className="flex items-center gap-1.5 font-medium text-text-secondary">
            <Warehouse className="h-3.5 w-3.5" />
            <span>{warehouseName}</span>
          </div>
          <ArrowLeftRight className="h-4 w-4 text-primary-600" />
          <div className="flex items-center gap-1.5 font-medium text-text-secondary">
            <Warehouse className="h-3.5 w-3.5" />
            <span>{toWarehouse?.name ?? '...'}</span>
          </div>
        </div>

        {/* Destination warehouse selector */}
        <div className="relative">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Maqsad ombor *</p>
          <button
            type="button"
            onClick={() => setDestDropdownOpen((v) => !v)}
            disabled={destinations.length === 0}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-50',
              toWarehouse
                ? 'border-primary-400 bg-primary-50/50 text-primary-700'
                : 'border-border bg-surface text-text-muted hover:bg-surface-secondary',
            )}
          >
            <Warehouse className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left text-[13px] font-medium truncate">
              {toWarehouse ? toWarehouse.name : destinations.length === 0 ? 'Boshqa ombor yo\'q' : "Ombor tanlang..."}
            </span>
            <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', destDropdownOpen && 'rotate-180')} />
          </button>
          {destDropdownOpen && destinations.length > 0 && (
            <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-surface shadow-dropdown overflow-hidden">
              {destinations.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => { setToWarehouseId(w.id); setDestDropdownOpen(false); }}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-primary-50/50 border-b border-border/10 last:border-0',
                    toWarehouseId === w.id ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-text-primary',
                  )}
                >
                  <Warehouse className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                  <span className="flex-1 truncate">{w.name}</span>
                  {w._count && (
                    <span className="text-[10px] text-text-muted shrink-0">{w._count.products} ta</span>
                  )}
                </button>
              ))}
            </div>
          )}
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
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-dropdown">
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
                      <Package className="h-4 w-4 text-text-muted shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-text-primary truncate">{s.product.name}</p>
                        <p className="text-[11px] text-text-muted">Omborda: {s.quantity} ta</p>
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
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-secondary/60 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  <th className="px-3 py-2 text-left">Mahsulot</th>
                  <th className="px-3 py-2 text-center w-28">Miqdor</th>
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
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={transferMut.isPending}>Bekor qilish</Button>
            <Button onClick={handleSubmit} loading={transferMut.isPending} disabled={!toWarehouseId || items.length === 0}>
              <ArrowLeftRight className="h-4 w-4" />
              Ko'chirish
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
