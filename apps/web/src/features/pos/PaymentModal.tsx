import { useState, useEffect, useCallback, useRef } from 'react';
import { Banknote, CreditCard, Smartphone, HandCoins, X, Check, Printer, Plus } from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import { useCartStore } from '@/stores/cart';
import { useAuthStore } from '@/stores/auth';
import { useCreateReceipt } from '@/hooks/useReceipts';
import { useCustomerSearch, useCreateCustomer } from '@/hooks/useCustomers';
import { useSound } from '@/hooks/useSound';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Receipt } from './Receipt';
import { cn } from '@/lib/cn';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
}

export function PaymentModal({ open, onClose }: PaymentModalProps) {
  const { play } = useSound();
  const receiptRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.getTotal());
  const globalDiscount = useCartStore((s) => s.globalDiscount);
  const customerId = useCartStore((s) => s.customerId);
  const customerName = useCartStore((s) => s.customerName);
  const setCustomer = useCartStore((s) => s.setCustomer);
  const clearCart = useCartStore((s) => s.clearCart);

  const [cashAmount, setCashAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [clickAmount, setClickAmount] = useState(0);
  const [debtAmount, setDebtAmount] = useState(0);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [debtDueDate, setDebtDueDate] = useState(''); // YYYY-MM-DD format
  const [success, setSuccess] = useState(false);

  const createReceipt = useCreateReceipt();
  const { data: searchResults } = useCustomerSearch(customerSearch);
  const createCustomer = useCreateCustomer();

  const subtotal = useCartStore((s) => s.getSubtotal());
  const rawSubtotal = useCartStore((s) => s.getRawSubtotal());

  // Qarzga sotganda auto-chegirma qo'llanilmaydi — to'liq narx ishlatiladi
  const effectiveTotal = debtAmount > 0 ? rawSubtotal : total;

  const paidTotal = cashAmount + cardAmount + clickAmount + debtAmount;
  const remaining = effectiveTotal - paidTotal;
  const bonus = remaining > 0.5 ? remaining : 0;
  const change = remaining < -0.5 ? Math.abs(remaining) : 0;
  const canConfirm = paidTotal > 0 || items.length > 0;

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setCashAmount(0);
    setCardAmount(0);
    setClickAmount(0);
    setDebtAmount(0);
    setCustomerSearch('');
    setShowNewCustomer(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
    const d = new Date(); d.setDate(d.getDate() + 30);
    setDebtDueDate(d.toISOString().slice(0, 10));
    setSuccess(false);
    // iOS scroll lock
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // Keyboard: Enter to confirm, Escape to close
  useEffect(() => {
    if (!open || success) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && canConfirm) {
        e.preventDefault();
        handleConfirm();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, success, canConfirm]);

  const handleConfirm = useCallback(async () => {
    if (items.length === 0) return;
    if (debtAmount > 0 && !customerId) return;

    // Bonus: qolgan summa chegirma sifatida qo'shiladi
    // API: server_total = server_subtotal * (1 - discountPercent/100)
    // server_subtotal = sum of (price * qty * (1 - itemDiscount/100))
    // Biz xohlagan narsa: server_total ≈ paidTotal (bonus = total - paidTotal)
    let effectiveDiscount = globalDiscount;
    const actualPaid = Math.min(paidTotal, effectiveTotal); // Ortiqcha to'langan bo'lsa, total'dan oshmasin
    if (bonus > 0 && subtotal > 0) {
      effectiveDiscount = Math.round((1 - actualPaid / subtotal) * 10000) / 100;
      effectiveDiscount = Math.min(99, Math.max(0, effectiveDiscount));
    }

    // Qarz alohida — API'da DEBT mixed payment'ga qo'shilmaydi
    // Shuning uchun bonus hisobida faqat naqd usullarni hisoblaymiz
    // Agar qarz bo'lsa, qarz alohida DEBT receipt sifatida yoziladi
    // Hozircha: qarzni bonus sifatida chegirmaga qo'shamiz
    const nonDebtPaid = cashAmount + cardAmount + clickAmount;
    const filledMethods = [
      cashAmount > 0 && 'CASH',
      cardAmount > 0 && 'CARD',
      clickAmount > 0 && 'CLICK',
    ].filter(Boolean) as string[];

    // Debt summasini ham bonus (chegirma) sifatida hisoblaymiz
    // Faqat naqd usullar orqali to'lov qilinadi
    const effectivePaid = nonDebtPaid; // API ga yuboriladigan haqiqiy to'lov
    if (debtAmount > 0 && subtotal > 0) {
      // Qarz summasi ham bonus ga qo'shiladi
      effectiveDiscount = Math.round((1 - effectivePaid / subtotal) * 10000) / 100;
      effectiveDiscount = Math.min(99, Math.max(0, effectiveDiscount));
    }
    const newTotal = bonus > 0 || debtAmount > 0 ? effectivePaid : total;

    let effectiveMethod: string;
    if (effectivePaid === 0 && paidTotal === 0) {
      effectiveMethod = 'CASH';
    } else if (effectivePaid === 0 && debtAmount > 0) {
      effectiveMethod = 'DEBT';
    } else if (filledMethods.length === 1) {
      effectiveMethod = filledMethods[0]!;
    } else if (filledMethods.length >= 2) {
      effectiveMethod = 'MIXED';
    } else {
      effectiveMethod = 'CASH';
    }

    // Mixed payments — faqat CASH, CARD, CLICK
    let mixedPayments: { method: 'CASH' | 'CARD' | 'CLICK' | 'TRANSFER'; amount: number }[] | undefined;
    if (effectiveMethod === 'MIXED') {
      mixedPayments = [
        ...(cashAmount > 0 ? [{ method: 'CASH' as const, amount: cashAmount }] : []),
        ...(cardAmount > 0 ? [{ method: 'CARD' as const, amount: cardAmount }] : []),
        ...(clickAmount > 0 ? [{ method: 'CLICK' as const, amount: clickAmount }] : []),
      ];
    }

    // Qarzga sotganda — hech qanday chegirma bo'lmaydi
    const isDebtPayment = effectiveMethod === 'DEBT' || debtAmount > 0;

    const payload = {
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        discount: isDebtPayment ? 0 : i.discount,
      })),
      paymentMethod: effectiveMethod as 'CASH' | 'CARD' | 'CLICK' | 'DEBT' | 'MIXED' | 'TRANSFER',
      discountPercent: isDebtPayment ? 0 : effectiveDiscount,
      customerId: (effectiveMethod === 'DEBT' || debtAmount > 0) ? (customerId ?? undefined) : (customerId ?? undefined),
      cashReceived: effectiveMethod === 'CASH' ? (cashAmount > 0 ? cashAmount : newTotal) : undefined,
      debtDueDate: (effectiveMethod === 'DEBT' || debtAmount > 0) ? debtDueDate : undefined,
      mixedPayments,
    };

    try {
      console.log('Payment payload:', JSON.stringify(payload, null, 2));
      await createReceipt.mutateAsync(payload);
      play('success');
      setSuccess(true);
    } catch (err) {
      console.error('Payment error:', err);
      play('error');
    }
  }, [items, bonus, paidTotal, subtotal, cashAmount, cardAmount, clickAmount, debtAmount, globalDiscount, customerId, total, effectiveTotal, createReceipt, play]);

  function handleClose() {
    if (success) clearCart();
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
      setShowNewCustomer(false);
    } catch { /* ignore */ }
  }

  function handleSetFullCash() {
    const t = debtAmount > 0 ? rawSubtotal : total;
    const rem = t - cardAmount - clickAmount - debtAmount;
    setCashAmount(Math.max(0, rem));
  }
  function handleSetFullCard() {
    const t = debtAmount > 0 ? rawSubtotal : total;
    const rem = t - cashAmount - clickAmount - debtAmount;
    setCardAmount(Math.max(0, rem));
  }
  function handleSetFullClick() {
    const t = debtAmount > 0 ? rawSubtotal : total;
    const rem = t - cashAmount - cardAmount - debtAmount;
    setClickAmount(Math.max(0, rem));
  }
  function handleSetFullDebt() {
    // Qarz uchun doim to'liq narx (chegirmasiz)
    const rem = rawSubtotal - cashAmount - cardAmount - clickAmount;
    setDebtAmount(Math.max(0, rem));
  }

  function parseMoneyInput(val: string): number {
    const raw = val.replace(/[^0-9]/g, '');
    return parseInt(raw) || 0;
  }

  function formatMoneyDisplay(val: number): string {
    if (val === 0) return '';
    return val.toLocaleString('uz-UZ');
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleClose} data-no-swipe>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative z-10 w-full max-w-[400px] mx-4 rounded-2xl bg-surface shadow-modal overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Success View ─── */}
        {success ? (
          <div className="px-5 py-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-8 w-8 text-emerald-600" strokeWidth={3} />
            </div>
            <h3 className="mt-3 text-lg font-bold text-text-primary">Muvaffaqiyatli!</h3>
            <p className="text-xl font-extrabold text-text-primary mt-1 tabular-nums">{formatCurrency(effectiveTotal)}</p>
            {change > 0 && (
              <p className="mt-2 text-base font-bold text-emerald-600 tabular-nums">Qaytim: {formatCurrency(change)}</p>
            )}
            {bonus > 0 && (
              <p className="mt-2 text-base font-bold text-amber-600 tabular-nums">Bonus: {formatCurrency(bonus)}</p>
            )}
            <div className="flex gap-2 mt-5">
              <Button variant="outline" onClick={handleClose} className="flex-1">Yopish</Button>
              <Button onClick={() => window.print()} className="flex-1 gap-1.5">
                <Printer className="h-4 w-4" />
                Chop etish
              </Button>
            </div>

            {/* Hidden receipt for printing */}
            <Receipt
              ref={receiptRef}
              data={{
                items: items.map((i) => ({
                  name: i.name,
                  quantity: i.quantity,
                  price: i.price,
                  discount: i.discount,
                })),
                subtotal,
                discountPercent: globalDiscount,
                discountAmount: subtotal - total,
                bonus,
                total,
                paidCash: cashAmount,
                paidCard: cardAmount,
                paidClick: clickAmount,
                paidDebt: debtAmount,
                change,
                customerName: customerName,
                cashierName: user?.name ?? 'Kassir',
              }}
            />
          </div>
        ) : (
          <div className="overflow-auto" style={{ maxHeight: '85vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h3 className="text-base font-bold text-text-primary">To'lov</h3>
              <button
                onClick={handleClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-surface-secondary hover:text-text-primary transition-colors"
                style={{ minHeight: 'auto', minWidth: 'auto' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Total */}
            <div className="px-5 pb-3 text-center">
              <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide">Jami summa</p>
              <p className="text-2xl font-extrabold text-text-primary tabular-nums mt-0.5">{formatCurrency(effectiveTotal)}</p>
              {debtAmount > 0 && effectiveTotal !== total && (
                <p className="text-[11px] text-amber-600 mt-0.5">Qarzga chegirma qo'llanilmaydi</p>
              )}
              <p className="text-[11px] text-text-muted mt-0.5">{items.length} ta mahsulot</p>
            </div>

            {/* ─── Mijoz ─── */}
            <div className="px-5 pb-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
              <p className="text-[12px] font-semibold text-text-secondary pt-3 pb-1.5">Mijoz</p>
              {customerId ? (
                <div className="flex items-center justify-between rounded-lg bg-surface-secondary px-3 py-2">
                  <span className="text-[13px] font-medium text-text-primary">{customerName}</span>
                  <button
                    onClick={() => useCartStore.getState().clearCustomer()}
                    className="text-[11px] font-medium text-danger-600 hover:text-danger-700"
                    style={{ minHeight: 'auto', minWidth: 'auto' }}
                  >
                    Bekor
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Input
                    id="customer-search"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Mijoz qidirish..."
                    className="!text-[13px] !py-2"
                  />
                  {searchResults?.data && searchResults.data.length > 0 && (
                    <div className="max-h-24 overflow-auto rounded-lg border border-border">
                      {searchResults.data.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setCustomer(c.id, c.name); setCustomerSearch(''); }}
                          className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[12px] hover:bg-surface-secondary"
                          style={{ minHeight: 'auto' }}
                        >
                          <span className="font-medium">{c.name}</span>
                          <span className="text-text-muted">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!showNewCustomer ? (
                    <button
                      onClick={() => setShowNewCustomer(true)}
                      className="flex items-center gap-1 text-[12px] font-medium text-primary-600 hover:text-primary-700"
                      style={{ minHeight: 'auto', minWidth: 'auto' }}
                    >
                      <Plus className="h-3 w-3" />
                      Yangi mijoz
                    </button>
                  ) : (
                    <div className="space-y-1.5 rounded-lg bg-surface-secondary p-2.5">
                      <Input id="new-name" placeholder="Ism" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} className="!text-[13px] !py-1.5" />
                      <Input id="new-phone" placeholder="+998901234567" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} className="!text-[13px] !py-1.5" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleCreateCustomer} loading={createCustomer.isPending} className="text-[12px]">Yaratish</Button>
                        <Button size="sm" variant="outline" onClick={() => setShowNewCustomer(false)} className="text-[12px]">Bekor</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ─── Payment Inputs ─── */}
            <div className="px-5 pb-3 space-y-2.5" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
              <p className="text-[12px] font-semibold text-text-secondary pt-3">To'lov usullari</p>

              {/* Naqd pul */}
              <PaymentRow
                icon={<Banknote className="h-4 w-4 text-emerald-600" />}
                label="Naqd pul"
                value={cashAmount}
                onChange={setCashAmount}
                onFull={handleSetFullCash}
                parse={parseMoneyInput}
                format={formatMoneyDisplay}
                autoFocus
              />

              {/* Karta */}
              <PaymentRow
                icon={<CreditCard className="h-4 w-4 text-blue-600" />}
                label="Karta"
                value={cardAmount}
                onChange={setCardAmount}
                onFull={handleSetFullCard}
                parse={parseMoneyInput}
                format={formatMoneyDisplay}
              />

              {/* Click */}
              <PaymentRow
                icon={<Smartphone className="h-4 w-4 text-violet-600" />}
                label="Click"
                value={clickAmount}
                onChange={setClickAmount}
                onFull={handleSetFullClick}
                parse={parseMoneyInput}
                format={formatMoneyDisplay}
              />

              {/* Qarz — faqat mijoz tanlanganda */}
              {customerId && (
                <>
                  <PaymentRow
                    icon={<HandCoins className="h-4 w-4 text-red-600" />}
                    label="Qarz"
                    value={debtAmount}
                    onChange={setDebtAmount}
                    onFull={handleSetFullDebt}
                    parse={parseMoneyInput}
                    format={formatMoneyDisplay}
                  />
                  {/* Qarz oxirgi muddati */}
                  {debtAmount > 0 && (
                    <div className="ml-[90px] pl-2 flex items-center gap-2">
                      <span className="text-[11px] text-text-muted shrink-0">Gacha:</span>
                      <input
                        type="date"
                        value={debtDueDate}
                        onChange={(e) => setDebtDueDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 10)}
                        className="flex-1 rounded-lg border border-border bg-surface px-2 py-1 text-[12px] font-medium text-text-primary tabular-nums focus:border-danger-400 focus:ring-1 focus:ring-danger-400/20 focus:outline-none"
                        style={{ minHeight: '32px' }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ─── Remaining / Change ─── */}
            {paidTotal > 0 && (
              <div className="px-5 pb-3">
                {remaining > 0.5 ? (
                  <div className="rounded-xl bg-amber-50 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-[12px] font-medium text-amber-700">Bonus</span>
                    <span className="text-base font-extrabold text-amber-700 tabular-nums">{formatCurrency(remaining)}</span>
                  </div>
                ) : change > 0 ? (
                  <div className="rounded-xl bg-emerald-50 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-[12px] font-medium text-emerald-700">Qaytim</span>
                    <span className="text-base font-extrabold text-emerald-700 tabular-nums">{formatCurrency(change)}</span>
                  </div>
                ) : (
                  <div className="rounded-xl bg-emerald-50 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-[12px] font-medium text-emerald-700">To'liq to'landi</span>
                    <Check className="h-4 w-4 text-emerald-600" />
                  </div>
                )}
              </div>
            )}

            {/* ─── Action Buttons ─── */}
            <div className="flex gap-2 px-5 pb-4">
              <button
                onClick={handleConfirm}
                disabled={
                  createReceipt.isPending ||
                  items.length === 0 ||
                  (debtAmount > 0 && !customerId)
                }
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-bold text-white transition-all',
                  !createReceipt.isPending && items.length > 0
                    ? 'bg-primary-600 hover:bg-primary-700 active:scale-[0.98]'
                    : 'bg-gray-300 cursor-not-allowed',
                )}
                style={{ minHeight: 'auto' }}
              >
                {createReceipt.isPending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  'Tasdiqlash'
                )}
              </button>
              <button
                onClick={handleClose}
                className="shrink-0 rounded-xl px-5 py-3 text-[14px] font-semibold text-text-secondary hover:bg-surface-secondary transition-colors"
                style={{ minHeight: 'auto', border: '1px solid var(--color-border)' }}
              >
                Bekor
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Payment Row Component ─── */
interface PaymentRowProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  onChange: (v: number) => void;
  onFull: () => void;
  parse: (val: string) => number;
  format: (val: number) => string;
  autoFocus?: boolean;
}

function PaymentRow({ icon, label, value, onChange, onFull, parse, format, autoFocus }: PaymentRowProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 shrink-0 w-[90px]">
        {icon}
        <span className="text-[12px] font-semibold text-text-primary">{label}</span>
      </div>
      <div className="flex flex-1 items-center gap-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            inputMode="numeric"
            value={format(value)}
            onChange={(e) => onChange(parse(e.target.value))}
            placeholder="0"
            autoFocus={autoFocus}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 pr-12 text-[13px] font-medium text-text-primary tabular-nums placeholder:text-text-muted/50 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 focus:outline-none"
            style={{ minHeight: '36px' }}
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-text-muted">so'm</span>
        </div>
        <button
          onClick={onFull}
          className="shrink-0 rounded-lg bg-primary-50 px-2.5 py-2 text-[11px] font-bold text-primary-600 hover:bg-primary-100 transition-colors"
          style={{ minHeight: '36px', minWidth: 'auto' }}
        >
          To'liq
        </button>
      </div>
    </div>
  );
}
