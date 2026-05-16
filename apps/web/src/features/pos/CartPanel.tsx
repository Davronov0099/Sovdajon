import { useState } from 'react';
import { Save, Minus, Plus, X, ShoppingBag, ShoppingCart, FileText, Trash2, Clock, Package, ChevronLeft, Upload, ScanBarcode } from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import { useCartStore } from '@/stores/cart';
import { useReceipts, useSaveDraft, useDeleteDraft, useHelperCarts } from '@/hooks/useReceipts';
import { useSound } from '@/hooks/useSound';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { ReceiptItem } from '@/types/api';

type Tab = 'cart' | 'drafts';

interface CartPanelProps {
  onPayment: () => void;
  onNumPad: (productId: string) => void;
}

export function CartPanel({ onPayment, onNumPad }: CartPanelProps) {
  const [tab, setTab] = useState<Tab>('cart');
  const { play } = useSound();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const subtotal = useCartStore((s) => s.getSubtotal());
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
        })),
        paymentMethod: 'CASH',
      });
      play('success');
      clearCart();
    } catch {
      play('error');
    }
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Tabs */}
      <div className="flex shrink-0" style={{ borderBottom: '2px solid var(--color-border-subtle)' }}>
        <button
          onClick={() => setTab('cart')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-semibold transition-colors relative',
            tab === 'cart'
              ? 'text-primary-600'
              : 'text-text-muted hover:text-text-secondary',
          )}
          style={{ minHeight: 'auto', minWidth: 'auto' }}
        >
          <ShoppingCart className="h-4 w-4" />
          Savat
          {items.length > 0 && (
            <span className={cn(
              'ml-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold',
              tab === 'cart' ? 'bg-primary-600 text-white' : 'bg-surface-tertiary text-text-muted',
            )}>
              {items.length}
            </span>
          )}
          {tab === 'cart' && (
            <span className="absolute bottom-[-2px] left-2 right-2 h-[2px] rounded-full bg-primary-600" />
          )}
        </button>
        <button
          onClick={() => setTab('drafts')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-semibold transition-colors relative',
            tab === 'drafts'
              ? 'text-warning-600'
              : 'text-text-muted hover:text-text-secondary',
          )}
          style={{ minHeight: 'auto', minWidth: 'auto' }}
        >
          <FileText className="h-4 w-4" />
          Saqlanganlar
          {tab === 'drafts' && (
            <span className="absolute bottom-[-2px] left-2 right-2 h-[2px] rounded-full bg-warning-600" />
          )}
        </button>
      </div>

      {tab === 'cart' ? (
        <CartTab
          items={items}
          subtotal={subtotal}
          total={total}
          saveDraft={saveDraft}
          onRemove={handleRemove}
          onQuantityChange={handleQuantityChange}
          onNumPad={onNumPad}
          onClearCart={() => { clearCart(); play('delete'); }}
          onSaveDraft={handleSaveDraft}
          onPayment={onPayment}
        />
      ) : (
        <DraftsTab onLoadDraft={() => setTab('cart')} />
      )}
    </div>
  );
}

/* ─── Cart Tab ─── */
interface CartTabProps {
  items: ReturnType<typeof useCartStore.getState>['items'];
  subtotal: number;
  total: number;
  saveDraft: ReturnType<typeof useSaveDraft>;
  onRemove: (id: string) => void;
  onQuantityChange: (id: string, delta: number) => void;
  onNumPad: (id: string) => void;
  onClearCart: () => void;
  onSaveDraft: () => void;
  onPayment: () => void;
}

function CartTab({
  items, subtotal, total, saveDraft,
  onRemove, onQuantityChange, onNumPad, onClearCart, onSaveDraft, onPayment,
}: CartTabProps) {
  return (
    <>
      {/* Tozalash */}
      {items.length > 0 && (
        <div className="flex justify-end px-4 pt-2">
          <button
            onClick={onClearCart}
            className="text-[11px] font-medium text-danger-600 hover:text-danger-700 transition-colors"
            style={{ minHeight: 'auto', minWidth: 'auto' }}
          >
            Tozalash
          </button>
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-auto">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-text-muted px-6">
            <ShoppingBag className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">Savat bo'sh</p>
            <p className="mt-1 text-xs">Mahsulotni bosib qo'shing</p>
          </div>
        ) : (
          <div className="px-2 py-1">
            {items.map((item, idx) => {
              const lineTotal = item.price * item.quantity;
              return (
                <div
                  key={item.productId}
                  className="group rounded-lg px-3 py-2.5 hover:bg-surface-secondary/60 transition-colors"
                  style={idx > 0 ? { borderTop: '1px solid var(--color-border-subtle)' } : undefined}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold text-text-primary leading-snug line-clamp-2 flex-1 min-w-0">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[13px] font-bold text-text-primary tabular-nums whitespace-nowrap">
                        {formatCurrency(lineTotal)}
                      </span>
                      <button
                        onClick={() => onRemove(item.productId)}
                        className="rounded-md p-0.5 text-danger-400 hover:bg-danger-50 hover:text-danger-600 transition-all"
                        style={{ minHeight: 'auto', minWidth: 'auto' }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <p className="text-xs text-text-muted tabular-nums">
                      {formatCurrency(item.price)} x {item.quantity.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onQuantityChange(item.productId, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-text-muted hover:bg-surface-tertiary hover:text-text-primary transition-colors"
                        style={{ minHeight: 'auto', minWidth: 'auto' }}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => onNumPad(item.productId)}
                        className="flex h-6 items-center justify-center rounded-md border border-border bg-surface-secondary/80 text-xs font-bold text-text-primary hover:bg-surface-tertiary tabular-nums px-2"
                        style={{ minHeight: 'auto', minWidth: '32px' }}
                      >
                        {item.quantity.toLocaleString()}
                      </button>
                      <button
                        onClick={() => onQuantityChange(item.productId, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-text-muted hover:bg-surface-tertiary hover:text-text-primary transition-colors"
                        style={{ minHeight: 'auto', minWidth: 'auto' }}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="shrink-0 p-4 space-y-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          <div className="flex justify-between text-sm text-text-secondary">
            <span>Oraliq summa</span>
            <span className="tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between items-baseline pt-2" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
            <span className="text-sm font-semibold text-text-primary">Jami</span>
            <span className="text-xl font-bold text-text-primary tabular-nums">{formatCurrency(total)}</span>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              onClick={onSaveDraft}
              loading={saveDraft.isPending}
              className="shrink-0"
            >
              <Save className="h-4 w-4" />
            </Button>
            <button
              onClick={onPayment}
              className="btn btn-success btn-lg flex-1 whitespace-nowrap overflow-hidden"
            >
              <span className="truncate tabular-nums">To'lov — {formatCurrency(total)}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Drafts Tab ─── */
function DraftsTab({ onLoadDraft }: { onLoadDraft: () => void }) {
  const { data, isLoading } = useReceipts({ isDraft: true, limit: 50 });
  const deleteDraft = useDeleteDraft();
  const { play } = useSound();
  const [selected, setSelected] = useState<ReceiptItem | null>(null);

  const drafts = data?.data ?? [];

  function handleLoad(draft: ReceiptItem) {
    const store = useCartStore.getState();
    store.clearCart();
    for (const item of draft.items) {
      const price = parseFloat(String(item.unitPrice)) || 0;
      const costPrice = parseFloat(String(item.costPrice)) || 0;
      const qty = Number(item.quantity) || 1;
      store.addItem({
        productId: item.productId,
        name: item.productName || 'Noma\'lum',
        price,
        costPrice,
        unit: 'PIECE',
        stock: 9999,
      });
      if (qty > 1) {
        store.updateQuantity(item.productId, qty);
      }
    }
    if (draft.customer) {
      store.setCustomer(draft.customer.id, draft.customer.name);
    }
    play('add-to-cart');
    setSelected(null);
    onLoadDraft();
  }

  function handleDelete(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    deleteDraft.mutate(id, {
      onSuccess: () => {
        play('delete');
        if (selected?.id === id) setSelected(null);
      },
    });
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Hozirgina';
    if (mins < 60) return `${mins} daq oldin`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} soat oldin`;
    const days = Math.floor(hours / 24);
    return `${days} kun oldin`;
  }

  // ─── Detail View ───
  if (selected) {
    const draftTotal = parseFloat(String(selected.total)) || 0;
    return (
      <div className="flex h-full flex-col">
        {/* Detail header */}
        <div className="flex items-center gap-2 px-3 py-2.5 shrink-0" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <button
            onClick={() => setSelected(null)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-surface-tertiary hover:text-text-primary transition-colors"
            style={{ minHeight: 'auto', minWidth: 'auto' }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-text-primary">Qoralama #{selected.number}</p>
            <p className="text-[11px] text-text-muted">{timeAgo(selected.createdAt)} &middot; {selected.items.length} ta mahsulot</p>
          </div>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-auto px-3 py-2">
          <div className="space-y-0.5">
            {selected.items.map((item, idx) => {
              const unitPrice = parseFloat(String(item.unitPrice)) || 0;
              const qty = Number(item.quantity) || 0;
              const lineTotal = unitPrice * qty;
              return (
                <div
                  key={item.id}
                  className="rounded-lg px-3 py-2.5"
                  style={idx > 0 ? { borderTop: '1px solid var(--color-border-subtle)' } : undefined}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold text-text-primary leading-snug line-clamp-2 flex-1 min-w-0">
                      {item.productName}
                    </p>
                    <span className="text-[13px] font-bold text-text-primary tabular-nums whitespace-nowrap shrink-0">
                      {formatCurrency(lineTotal)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-muted tabular-nums">
                    {formatCurrency(unitPrice)} x {qty.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail footer */}
        <div className="shrink-0 p-4 space-y-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          {selected.customer && (
            <div className="flex justify-between text-xs text-text-muted">
              <span>Mijoz</span>
              <span className="font-medium text-text-secondary">{selected.customer.name}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-semibold text-text-primary">Jami</span>
            <span className="text-xl font-bold text-text-primary tabular-nums">{formatCurrency(draftTotal)}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleDelete(selected.id)}
              disabled={deleteDraft.isPending}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-danger-200 text-danger-600 hover:bg-danger-50 transition-colors"
              style={{ minHeight: 'auto', minWidth: 'auto' }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleLoad(selected)}
              className="btn btn-success btn-lg flex-1 gap-2"
            >
              <Upload className="h-4 w-4" />
              Kassaga yuklash
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── List View ───
  const { data: helperData } = useHelperCarts();
  const helperCarts = (helperData?.data ?? []) as ReceiptItem[];

  return (
    <div className="flex-1 overflow-auto">
      {isLoading ? (
        <div className="p-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      ) : drafts.length === 0 && helperCarts.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-text-muted px-6">
          <FileText className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm font-medium">Saqlanganlar yo'q</p>
          <p className="mt-1 text-xs text-center">Savatdagi mahsulotlarni saqlash tugmasi orqali saqlang</p>
        </div>
      ) : (
        <div className="p-2 space-y-1.5">
          {/* ─── Helper Carts ─── */}
          {helperCarts.length > 0 && (
            <>
              <p className="text-[11px] font-bold text-primary-600 uppercase tracking-wide px-1 pt-1 flex items-center gap-1">
                <ScanBarcode className="h-3 w-3" />
                Yordamchilardan ({helperCarts.length})
              </p>
              {helperCarts.map((cart) => (
                <div
                  key={cart.id}
                  onClick={() => { handleLoad(cart); handleDelete(cart.id); }}
                  className="w-full text-left rounded-xl p-3 transition-all hover:bg-primary-50 group cursor-pointer"
                  style={{ border: '2px solid var(--color-primary-200)' }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleLoad(cart)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                        <ScanBarcode className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-text-primary">
                          {(cart as ReceiptItem & { createdBy?: { name: string } }).createdBy?.name || 'Yordamchi'}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-text-muted">
                          <span className="inline-flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {timeAgo(cart.createdAt)}
                          </span>
                          <span className="inline-flex items-center gap-0.5">
                            <Package className="h-3 w-3" />
                            {cart.items.length}
                          </span>
                          {cart.customer && (
                            <span className="text-primary-600 font-medium">{cart.customer.name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-primary-600 tabular-nums shrink-0">
                      {formatCurrency(parseFloat(String(cart.total)) || 0)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {cart.items.slice(0, 3).map((item) => (
                      <span key={item.id} className="inline-flex items-center gap-0.5 rounded bg-primary-50 px-1.5 py-0.5 text-[10px] text-primary-700">
                        {item.productName.length > 15 ? item.productName.slice(0, 15) + '...' : item.productName}
                        <span className="font-bold">x{item.quantity}</span>
                      </span>
                    ))}
                    {cart.items.length > 3 && (
                      <span className="inline-flex items-center rounded bg-primary-50 px-1.5 py-0.5 text-[10px] text-primary-600 font-medium">
                        +{cart.items.length - 3}
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLoad(cart); handleDelete(cart.id); }}
                      className="w-full rounded-lg py-1.5 text-[11px] font-bold text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                      style={{ minHeight: 'auto', minWidth: 'auto' }}
                    >
                      Kassaga yuklash
                    </button>
                  </div>
                </div>
              ))}
              {drafts.length > 0 && (
                <p className="text-[11px] font-bold text-warning-600 uppercase tracking-wide px-1 pt-2">Qoralamalar</p>
              )}
            </>
          )}
          {drafts.map((draft) => (
            <div
              key={draft.id}
              onClick={() => handleLoad(draft)}
              className="w-full text-left rounded-xl p-3 transition-all hover:bg-surface-secondary group cursor-pointer"
              style={{ border: '1px solid var(--color-border-subtle)' }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleLoad(draft)}
            >
              {/* Header row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-50 text-warning-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-text-primary">#{draft.number}</p>
                    <div className="flex items-center gap-2 text-[11px] text-text-muted">
                      <span className="inline-flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {timeAgo(draft.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-0.5">
                        <Package className="h-3 w-3" />
                        {draft.items.length}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-sm font-bold text-text-primary tabular-nums shrink-0">
                  {formatCurrency(parseFloat(String(draft.total)) || 0)}
                </span>
              </div>

              {/* Items preview */}
              <div className="mt-2 flex flex-wrap gap-1">
                {draft.items.slice(0, 3).map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-0.5 rounded bg-surface-tertiary/70 px-1.5 py-0.5 text-[10px] text-text-secondary"
                  >
                    {item.productName.length > 15 ? item.productName.slice(0, 15) + '...' : item.productName}
                    <span className="font-bold">x{item.quantity}</span>
                  </span>
                ))}
                {draft.items.length > 3 && (
                  <span className="inline-flex items-center rounded bg-surface-tertiary/70 px-1.5 py-0.5 text-[10px] text-text-muted font-medium">
                    +{draft.items.length - 3}
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-2 flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setSelected(draft); }}
                  className="flex-1 rounded-lg py-1.5 text-[11px] font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors"
                  style={{ minHeight: 'auto', minWidth: 'auto' }}
                >
                  Batafsil
                </button>
                <button
                  onClick={(e) => handleDelete(draft.id, e)}
                  disabled={deleteDraft.isPending}
                  className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-danger-600 bg-danger-50 hover:bg-danger-100 transition-colors"
                  style={{ minHeight: 'auto', minWidth: 'auto' }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
