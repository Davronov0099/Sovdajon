import { useState, useEffect, useCallback } from 'react';
import { Banknote, CreditCard, Smartphone, HandCoins, Layers } from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import type { PaymentMethod } from '@sardorbek/shared';
import { useCartStore } from '@/stores/cart';
import { useCreateReceipt } from '@/hooks/useReceipts';
import { useCustomerSearch, useCreateCustomer } from '@/hooks/useCustomers';
import { useSound } from '@/hooks/useSound';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/common/MoneyInput';
import { cn } from '@/lib/cn';

const PAYMENT_METHODS = [
  { key: 'CASH' as const, label: 'Naqd', icon: Banknote, shortcut: 'F1', color: 'text-success-600 bg-success-50' },
  { key: 'CARD' as const, label: 'Karta', icon: CreditCard, shortcut: 'F2', color: 'text-primary-600 bg-primary-50' },
  { key: 'CLICK' as const, label: 'Click', icon: Smartphone, shortcut: 'F3', color: 'text-violet-600 bg-violet-50' },
  { key: 'DEBT' as const, label: 'Qarz', icon: HandCoins, shortcut: 'F4', color: 'text-danger-600 bg-danger-50' },
  { key: 'MIXED' as const, label: 'Aralash', icon: Layers, shortcut: 'F5', color: 'text-amber-600 bg-amber-50' },
] as const;

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
}

export function PaymentModal({ open, onClose }: PaymentModalProps) {
  const { play } = useSound();
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.getTotal());
  const globalDiscount = useCartStore((s) => s.globalDiscount);
  const customerId = useCartStore((s) => s.customerId);
  const customerName = useCartStore((s) => s.customerName);
  const setCustomer = useCartStore((s) => s.setCustomer);
  const clearCart = useCartStore((s) => s.clearCart);

  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [cashReceived, setCashReceived] = useState(0);
  const [mixedCash, setMixedCash] = useState(0);
  const [mixedCard, setMixedCard] = useState(0);
  const [mixedClick, setMixedClick] = useState(0);
  const [customerSearch, setCustomerSearch] = useState('');
  const [step, setStep] = useState<'method' | 'details' | 'success'>('method');

  const createReceipt = useCreateReceipt();
  const { data: searchResults } = useCustomerSearch(customerSearch);
  const createCustomer = useCreateCustomer();
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const change = method === 'CASH' ? Math.max(0, cashReceived - total) : 0;
  const mixedTotal = mixedCash + mixedCard + mixedClick;
  const mixedRemaining = total - mixedTotal;

  // F1-F5 shortcuts
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      const fKeys: Record<string, PaymentMethod> = {
        F1: 'CASH', F2: 'CARD', F3: 'CLICK', F4: 'DEBT', F5: 'MIXED',
      };
      if (fKeys[e.key]) {
        e.preventDefault();
        setMethod(fKeys[e.key]!);
        setStep('details');
      }
      if (e.key === 'Enter' && step === 'details') {
        e.preventDefault();
        handleConfirm();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, step, method]);

  const handleConfirm = useCallback(async () => {
    if (items.length === 0) return;

    const payload = {
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        discount: i.discount,
      })),
      paymentMethod: method,
      discountPercent: globalDiscount,
      customerId: customerId ?? undefined,
      cashReceived: method === 'CASH' ? cashReceived : undefined,
      mixedPayments: method === 'MIXED'
        ? [
            ...(mixedCash > 0 ? [{ method: 'CASH' as const, amount: mixedCash }] : []),
            ...(mixedCard > 0 ? [{ method: 'CARD' as const, amount: mixedCard }] : []),
            ...(mixedClick > 0 ? [{ method: 'CLICK' as const, amount: mixedClick }] : []),
          ]
        : undefined,
    };

    try {
      await createReceipt.mutateAsync(payload);
      play('success');
      setStep('success');
    } catch {
      play('error');
    }
  }, [items, method, globalDiscount, customerId, cashReceived, mixedCash, mixedCard, mixedClick, createReceipt, play]);

  function handleClose() {
    if (step === 'success') {
      clearCart();
    }
    setStep('method');
    setCashReceived(0);
    setMixedCash(0);
    setMixedCard(0);
    setMixedClick(0);
    setCustomerSearch('');
    onClose();
  }

  async function handleCreateCustomer() {
    if (!newCustomerName || !newCustomerPhone) return;
    try {
      const res = await createCustomer.mutateAsync({
        name: newCustomerName,
        phone: newCustomerPhone,
      });
      setCustomer(res.data.id, res.data.name);
      setNewCustomerName('');
      setNewCustomerPhone('');
    } catch { /* ignore */ }
  }

  return (
    <Modal open={open} onClose={handleClose} title="To'lov" size="md">
      {/* Step 1: Method selection */}
      {step === 'method' && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-text-primary">{formatCurrency(total)}</p>
            <p className="text-sm text-text-muted">{items.length} ta mahsulot</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PAYMENT_METHODS.map((pm) => {
              const Icon = pm.icon;
              return (
                <button
                  key={pm.key}
                  onClick={() => { setMethod(pm.key); setStep('details'); }}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                    method === pm.key ? 'border-primary-500 bg-primary-50' : 'border-border hover:border-primary-300',
                  )}
                >
                  <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', pm.color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-text-primary">{pm.label}</span>
                  <kbd className="rounded border border-border bg-surface-secondary px-1.5 py-0.5 text-xs text-text-muted">
                    {pm.shortcut}
                  </kbd>
                </button>
              );
            })}
          </div>

          {/* Customer selector */}
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-sm font-medium text-text-primary">
              Mijoz {method === 'DEBT' && <span className="text-danger-600">*</span>}
            </p>
            {customerId ? (
              <div className="flex items-center justify-between rounded-lg bg-surface-secondary px-3 py-2">
                <span className="text-sm font-medium">{customerName}</span>
                <button onClick={() => useCartStore.getState().clearCustomer()} className="text-xs text-danger-600">
                  Bekor
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  id="customer-search"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Mijoz qidirish..."
                />
                {searchResults?.data && searchResults.data.length > 0 && (
                  <div className="max-h-32 overflow-auto rounded-lg border border-border">
                    {searchResults.data.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setCustomer(c.id, c.name); setCustomerSearch(''); }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-secondary"
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-text-muted">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
                {/* Quick create customer */}
                <details className="rounded-lg border border-border">
                  <summary className="cursor-pointer px-3 py-2 text-sm text-primary-600">+ Yangi mijoz</summary>
                  <div className="space-y-2 p-3 pt-0">
                    <Input id="new-name" placeholder="Ism" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
                    <Input id="new-phone" placeholder="+998901234567" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} />
                    <Button size="sm" onClick={handleCreateCustomer} loading={createCustomer.isPending}>Yaratish</Button>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Payment details */}
      {step === 'details' && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-text-muted">Jami to'lov</p>
            <p className="text-3xl font-bold text-text-primary">{formatCurrency(total)}</p>
          </div>

          {method === 'CASH' && (
            <div className="space-y-3">
              <MoneyInput
                id="cash-received"
                label="Qabul qilingan summa"
                value={cashReceived}
                onChange={setCashReceived}
                autoFocus
              />
              {cashReceived >= total && (
                <div className="rounded-lg bg-success-50 p-3 text-center">
                  <p className="text-sm text-success-700">Qaytim</p>
                  <p className="text-2xl font-bold text-success-800">{formatCurrency(change)}</p>
                </div>
              )}
            </div>
          )}

          {method === 'CARD' && (
            <div className="rounded-lg bg-primary-50 p-6 text-center">
              <CreditCard className="mx-auto mb-2 h-12 w-12 text-primary-600" />
              <p className="text-sm text-primary-700">Karta terminali orqali to'lash</p>
            </div>
          )}

          {method === 'CLICK' && (
            <div className="rounded-lg bg-violet-50 p-6 text-center">
              <Smartphone className="mx-auto mb-2 h-12 w-12 text-violet-600" />
              <p className="text-sm text-violet-700">Click ilovasi orqali to'lash</p>
            </div>
          )}

          {method === 'DEBT' && (
            <div className="rounded-lg bg-danger-50 p-4">
              <p className="mb-2 text-sm font-medium text-danger-700">Qarzga sotuv</p>
              {!customerId && (
                <p className="text-sm text-danger-600">Mijoz tanlanmagan! Orqaga qaytib mijoz tanlang.</p>
              )}
              {customerId && (
                <p className="text-sm text-text-secondary">
                  {customerName} ga {formatCurrency(total)} qarz yoziladi
                </p>
              )}
            </div>
          )}

          {method === 'MIXED' && (
            <div className="space-y-3">
              <MoneyInput id="mixed-cash" label="Naqd" value={mixedCash} onChange={setMixedCash} />
              <MoneyInput id="mixed-card" label="Karta" value={mixedCard} onChange={setMixedCard} />
              <MoneyInput id="mixed-click" label="Click" value={mixedClick} onChange={setMixedClick} />
              <div className={cn(
                'rounded-lg p-3 text-center',
                Math.abs(mixedRemaining) < 1 ? 'bg-success-50' : 'bg-warning-50',
              )}>
                <p className="text-sm text-text-muted">Qoldi</p>
                <p className={cn('text-xl font-bold', Math.abs(mixedRemaining) < 1 ? 'text-success-700' : 'text-warning-700')}>
                  {formatCurrency(mixedRemaining)}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep('method')} className="flex-1">
              Orqaga
            </Button>
            <Button
              onClick={handleConfirm}
              loading={createReceipt.isPending}
              disabled={
                (method === 'DEBT' && !customerId) ||
                (method === 'MIXED' && Math.abs(mixedRemaining) >= 1) ||
                items.length === 0
              }
              className="flex-[2]"
            >
              Tasdiqlash (Enter)
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 'success' && (
        <div className="space-y-4 py-4 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success-50">
            <svg className="h-10 w-10 text-success-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-text-primary">To'lov muvaffaqiyatli!</h3>
          <p className="text-text-muted">{formatCurrency(total)}</p>

          {change > 0 && (
            <p className="text-lg font-bold text-success-600">Qaytim: {formatCurrency(change)}</p>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Yopish
            </Button>
            <Button
              onClick={() => { window.print(); }}
              className="flex-1"
              aria-label="Chop etish (Ctrl+P)"
            >
              Chop etish
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
