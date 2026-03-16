import { Save, Minus, Plus, X, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import { useCartStore } from '@/stores/cart';
import { useSaveDraft } from '@/hooks/useReceipts';
import { useSound } from '@/hooks/useSound';
import { Button } from '@/components/ui/button';

interface CartPanelProps {
  onPayment: () => void;
  onNumPad: (productId: string) => void;
}

export function CartPanel({ onPayment, onNumPad }: CartPanelProps) {
  const { play } = useSound();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const globalDiscount = useCartStore((s) => s.globalDiscount);
  const setGlobalDiscount = useCartStore((s) => s.setGlobalDiscount);
  const clearCart = useCartStore((s) => s.clearCart);
  const subtotal = useCartStore((s) => s.getSubtotal());
  const discountAmount = useCartStore((s) => s.getDiscountAmount());
  const total = useCartStore((s) => s.getTotal());
  const saveDraft = useSaveDraft();

  function handleRemove(productId: string) {
    removeItem(productId);
    play('delete');
  }

  function handleQuantityChange(productId: string, delta: number) {
    const item = items.find((i) => i.productId === productId);
    if (!item) return;
    const newQty = Math.max(1, item.quantity + delta);
    updateQuantity(productId, newQty);
  }

  async function handleSaveDraft() {
    if (items.length === 0) return;
    try {
      await saveDraft.mutateAsync({
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          discount: i.discount,
        })),
        paymentMethod: 'CASH',
        discountPercent: 0,
      });
      play('success');
      clearCart();
    } catch {
      play('error');
    }
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
        <h2 className="text-base font-bold text-text-primary">
          Savat <span className="text-text-muted font-normal">({items.length})</span>
        </h2>
        {items.length > 0 && (
          <button
            onClick={() => { clearCart(); play('delete'); }}
            className="text-xs font-medium text-danger-600 hover:text-danger-700 transition-colors"
            aria-label="Savatchani tozalash"
            style={{ minHeight: 'auto', minWidth: 'auto' }}
          >
            Tozalash
          </button>
        )}
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-auto">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-text-muted px-6">
            <ShoppingBag className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Savat bo'sh</p>
            <p className="mt-1 text-xs">Mahsulotni bosib qo'shing</p>
          </div>
        ) : (
          <div className="px-2 py-2 space-y-1">
            {items.map((item) => (
              <div
                key={item.productId}
                className="group flex items-center gap-2.5 rounded-lg px-3 py-2.5 hover:bg-surface-secondary/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{item.name}</p>
                  <p className="text-xs text-text-muted tabular-nums">
                    {formatCurrency(item.price)} x {item.quantity}
                    {item.discount > 0 && (
                      <span className="ml-1.5 text-success-600 font-medium">-{item.discount}%</span>
                    )}
                  </p>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => handleQuantityChange(item.productId, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-tertiary hover:text-text-primary transition-colors"
                    aria-label="Kamaytirish"
                    style={{ minHeight: 'auto', minWidth: 'auto' }}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onNumPad(item.productId)}
                    className="flex h-7 w-9 items-center justify-center rounded-md border border-border text-xs font-bold text-text-primary hover:bg-surface-secondary tabular-nums"
                    aria-label="Miqdor kiritish"
                    style={{ minHeight: 'auto', minWidth: 'auto' }}
                  >
                    {item.quantity}
                  </button>
                  <button
                    onClick={() => handleQuantityChange(item.productId, 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-tertiary hover:text-text-primary transition-colors"
                    aria-label="Oshirish"
                    style={{ minHeight: 'auto', minWidth: 'auto' }}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {/* Line total */}
                <p className="w-20 text-right text-sm font-bold text-text-primary tabular-nums">
                  {formatCurrency(item.price * item.quantity * (1 - item.discount / 100))}
                </p>

                {/* Remove */}
                <button
                  onClick={() => handleRemove(item.productId)}
                  className="rounded-md p-1 text-text-muted opacity-0 group-hover:opacity-100 hover:bg-danger-50 hover:text-danger-600 transition-all"
                  aria-label={`${item.name} ni o'chirish`}
                  style={{ minHeight: 'auto', minWidth: 'auto' }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer — totals + actions */}
      {items.length > 0 && (
        <div className="p-4 space-y-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          {/* Discount */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">Chegirma (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={globalDiscount}
              onChange={(e) => setGlobalDiscount(Number(e.target.value))}
              className="w-14 rounded-md border border-border bg-surface px-2 py-1 text-right text-xs font-medium tabular-nums focus:border-primary-400 focus:ring-1 focus:ring-primary-400/20"
              aria-label="Umumiy chegirma foizi"
              style={{ minHeight: '28px' }}
            />
          </div>

          {/* Subtotal */}
          <div className="flex justify-between text-sm text-text-secondary">
            <span>Oraliq summa</span>
            <span className="tabular-nums">{formatCurrency(subtotal)}</span>
          </div>

          {/* Discount line */}
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-success-600">
              <span>Chegirma ({globalDiscount}%)</span>
              <span className="tabular-nums">-{formatCurrency(discountAmount)}</span>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between items-baseline pt-2" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
            <span className="text-sm font-semibold text-text-primary">Jami</span>
            <span className="text-xl font-bold text-text-primary tabular-nums">{formatCurrency(total)}</span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              loading={saveDraft.isPending}
              className="flex-1"
              aria-label="Qoralama saqlash (Ctrl+S)"
            >
              <Save className="h-4 w-4" />
              Saqlash
            </Button>
            <button
              onClick={onPayment}
              className="btn btn-success btn-lg flex-[2]"
              aria-label="To'lov (F1)"
            >
              To'lov — {formatCurrency(total)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
