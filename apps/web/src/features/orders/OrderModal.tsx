import { useState, useMemo, useCallback } from 'react';
import { Search, X, Plus, Trash2, Package, User, ShoppingBag, Phone } from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useProducts } from '@/hooks/useProducts';
import { useCustomerSearch } from '@/hooks/useCustomers';
import { useCreateOrder } from '@/hooks/useOrders';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';

interface OrderLineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OrderModal({ open, onClose }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<OrderLineItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productFocused, setProductFocused] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFocused, setCustomerFocused] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [note, setNote] = useState('');

  const { data: productsData } = useProducts({ search: productSearch, limit: 15 });
  const { data: customersData } = useCustomerSearch(customerSearch);
  const createMut = useCreateOrder();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products = ((productsData as any)?.data ?? []) as Array<{ id: string; name: string; price: string | number; stock: number }>;
  const customers = customersData?.data ?? [];

  const reset = useCallback(() => {
    setItems([]);
    setProductSearch('');
    setCustomerSearch('');
    setSelectedCustomer(null);
    setNote('');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  function addProduct(p: { id: string; name: string; price: string | number }) {
    if (items.find((i) => i.productId === p.id)) {
      toast("Bu mahsulot allaqachon qo'shilgan", 'error');
      return;
    }
    setItems((prev) => [...prev, {
      productId: p.id,
      productName: p.name,
      quantity: 1,
      unitPrice: Number(p.price) || 0,
    }]);
    setProductSearch('');
    setProductFocused(false);
  }

  function updateItem<K extends keyof OrderLineItem>(index: number, field: K, value: OrderLineItem[K]) {
    setItems((prev) => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (items.length === 0) { toast("Kamida 1 ta mahsulot qo'shing", 'error'); return; }
    for (const it of items) {
      if (it.unitPrice <= 0) { toast(`${it.productName}: Narx 0 dan katta bo'lishi kerak`, 'error'); return; }
      if (it.quantity <= 0) { toast(`${it.productName}: Miqdor 0 dan katta bo'lishi kerak`, 'error'); return; }
    }
    try {
      await createMut.mutateAsync({
        customerId: selectedCustomer?.id,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        note: note || undefined,
      });
      toast('Buyurtma yaratildi', 'success');
      handleClose();
    } catch (err) {
      const msg = (err as { message?: string }).message ?? 'Buyurtma yaratishda xatolik';
      toast(msg, 'error');
    }
  }

  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const showProductDropdown = productFocused && productSearch.length >= 1 && products.length > 0;
  const showCustomerDropdown = customerFocused && customerSearch.length >= 2 && customers.length > 0;

  return (
    <Modal open={open} onClose={handleClose} title="Yangi buyurtma" size="lg">
      <div className="space-y-4">
        {/* Customer selector */}
        <div className="relative">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Mijoz (ixtiyoriy)</p>
          {selectedCustomer ? (
            <div className="flex items-center gap-2 rounded-lg border border-primary-300 bg-primary-50/40 px-3 py-2">
              <User className="h-4 w-4 text-primary-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary truncate">{selectedCustomer.name}</p>
                <p className="text-[11px] text-text-muted">{selectedCustomer.phone}</p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-text-muted hover:text-danger-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                onFocus={() => setCustomerFocused(true)}
                onBlur={() => setTimeout(() => setCustomerFocused(false), 200)}
                placeholder="Mijoz nomi yoki telefon..."
                className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm placeholder:text-text-muted/50 focus:outline-2 focus:outline-primary-500"
              />
              {showCustomerDropdown && (
                <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-dropdown">
                  <div className="max-h-48 overflow-auto">
                    {customers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setSelectedCustomer({ id: c.id, name: c.name, phone: c.phone }); setCustomerSearch(''); setCustomerFocused(false); }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-primary-50/40 border-b border-border/15 last:border-0"
                      >
                        <User className="h-4 w-4 text-text-muted shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-text-primary truncate">{c.name}</p>
                          <p className="text-[11px] text-text-muted inline-flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5" />
                            {c.phone}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Product search */}
        <div className="relative">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Mahsulot qo'shish *</p>
          <Search className="absolute left-3 top-[31px] h-4 w-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            onFocus={() => setProductFocused(true)}
            onBlur={() => setTimeout(() => setProductFocused(false), 200)}
            placeholder="Mahsulot nomi yoki kod..."
            className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm placeholder:text-text-muted/50 focus:outline-2 focus:outline-primary-500"
          />
          {showProductDropdown && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-dropdown">
              <div className="max-h-56 overflow-auto">
                {products.map((p) => {
                  const added = items.some((i) => i.productId === p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => !added && addProduct(p)}
                      disabled={added}
                      className={cn(
                        'flex w-full items-center gap-2.5 px-3 py-2 text-left border-b border-border/15 last:border-0',
                        added ? 'opacity-30' : 'hover:bg-primary-50/40',
                      )}
                    >
                      <Package className="h-4 w-4 text-text-muted shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-text-primary truncate">{p.name}</p>
                        <p className="text-[11px] text-text-muted">Zaxira: {p.stock} · {formatCurrency(Number(p.price))}</p>
                      </div>
                      {!added && <Plus className="h-4 w-4 text-primary-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Items table */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-text-muted">
            <ShoppingBag className="h-10 w-10 opacity-20 mb-2" />
            <p className="text-sm font-medium">Mahsulot qo'shilmagan</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-secondary/60 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  <th className="px-3 py-2 text-left">Mahsulot</th>
                  <th className="px-3 py-2 text-center w-24">Miqdor</th>
                  <th className="px-3 py-2 text-center w-32">Narx</th>
                  <th className="px-3 py-2 text-right w-28">Jami</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.productId} className="border-t border-border/30">
                    <td className="px-3 py-2 font-medium text-text-primary">{item.productName}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, 'quantity', Math.max(1, parseInt(e.target.value.replace(/\D/g, '') || '1', 10)))}
                        className="w-full rounded border border-border bg-surface-secondary/40 px-2 py-1 text-center text-[13px] tabular-nums font-semibold focus:outline-2 focus:outline-primary-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(i, 'unitPrice', Math.max(0, Number(e.target.value) || 0))}
                        className="w-full rounded border border-border bg-surface-secondary/40 px-2 py-1 text-right text-[13px] tabular-nums focus:outline-2 focus:outline-primary-500"
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
          placeholder="Buyurtma haqida izoh (ixtiyoriy)..."
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
              <p className="text-sm font-bold text-text-primary tabular-nums">{totalQty}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase">Jami</p>
              <p className="text-sm font-bold text-primary-600 tabular-nums">{formatCurrency(total)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={createMut.isPending}>Bekor qilish</Button>
            <Button onClick={handleSubmit} loading={createMut.isPending} disabled={items.length === 0}>
              <ShoppingBag className="h-4 w-4" />
              Buyurtma yaratish
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
