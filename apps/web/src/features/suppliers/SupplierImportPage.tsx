import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Plus, Trash2, Package, ArrowDownToLine, Search, X, TrendingUp, Wallet, CreditCard, Layers } from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSupplier, useSupplierImport } from '@/hooks/useSuppliers';
import { useProducts } from '@/hooks/useProducts';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { ProductModal, type ProductData } from '@/features/products/ProductModal';

interface ImportItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;        // Tan narxi (UZS)
  sellingPrice: number;     // Dona narxi (UZS)
  minSellingPrice: number;  // Min sotuv narxi (UZS)
  wholesalePrice: number;   // Optom narxi (UZS)
}

export function SupplierImportPage() {
  const { supplierId } = useParams({ from: '/_auth/suppliers_/$supplierId_/import' });
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: supplierData, isLoading: supplierLoading } = useSupplier(supplierId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supplier = (supplierData as any)?.data as any;

  const [items, setItems] = useState<ImportItem[]>([]);
  const [note, setNote] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'DEBT' | 'MIXED'>('DEBT');
  const [cashAmount, setCashAmount] = useState<number>(0);

  const { data: productsData, refetch: refetchProducts } = useProducts({ search: productSearch, limit: 20 });
  const importMut = useSupplierImport();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products = ((productsData as any)?.data as Array<Record<string, unknown>>) ?? [];

  function addProduct(product: Record<string, unknown>) {
    if (items.find((i) => i.productId === product.id)) {
      toast("Bu mahsulot allaqachon qo'shilgan", 'error');
      return;
    }
    setItems([...items, {
      productId: product.id as string,
      productName: product.name as string,
      quantity: 1,
      costPrice: Number(product.costPrice) || 0,
      sellingPrice: Number(product.price) || 0,
      minSellingPrice: Number(product.minSellingPrice) || 0,
      wholesalePrice: Number(product.wholesalePrice) || 0,
    }]);
    setProductSearch('');
    setSearchFocused(false);
  }

  // Yangi mahsulot yaratilgandan keyin avtomatik qo'shish
  async function handleNewProductCreated() {
    setNewProductOpen(false);
    // Refetch + agar yangi mahsulot ko'rinsa, qo'shish
    const result = await refetchProducts();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fresh = (result.data as any)?.data as Array<Record<string, unknown>> ?? [];
    // Eng so'nggi yaratilgan (createdAt bo'yicha 1-o'rinda) — Products list sort desc
    if (fresh.length > 0) {
      const candidate = fresh[0];
      if (candidate && !items.find((i) => i.productId === candidate.id)) {
        addProduct(candidate);
        toast("Yangi mahsulot qo'shildi", 'success');
      }
    }
  }

  function updateItem(index: number, field: keyof ImportItem, value: number) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const totalCost = items.reduce((sum, item) => sum + item.quantity * item.costPrice, 0);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  const marginStats = useMemo(() => {
    let totalMargin = 0;
    for (const item of items) {
      totalMargin += (item.sellingPrice - item.costPrice) * item.quantity;
    }
    return { totalMargin };
  }, [items]);

  // Naqd to'lov miqdori: rejim asosida
  const paidAmount = useMemo(() => {
    if (paymentMode === 'CASH') return totalCost;
    if (paymentMode === 'DEBT') return 0;
    return Math.min(Math.max(cashAmount, 0), totalCost);
  }, [paymentMode, cashAmount, totalCost]);
  const debtAmount = Math.max(0, totalCost - paidAmount);

  async function handleSubmit() {
    if (items.length === 0) { toast("Kamida 1 ta mahsulot qo'shing", 'error'); return; }
    for (const item of items) {
      if (item.costPrice <= 0) { toast(`${item.productName}: Tan narxi 0 dan katta bo'lishi kerak`, 'error'); return; }
      if (item.sellingPrice > 0 && item.minSellingPrice > 0 && item.minSellingPrice > item.sellingPrice) {
        toast(`${item.productName}: Min narx Dona narxidan katta bo'lmasin`, 'error'); return;
      }
    }
    if (paymentMode === 'MIXED') {
      if (cashAmount <= 0) { toast("Naqd miqdorini kiriting yoki rejimni o'zgartiring", 'error'); return; }
      if (cashAmount >= totalCost) { toast("Aralash to'lovda naqd jami summadan kam bo'lishi kerak", 'error'); return; }
    }
    try {
      await importMut.mutateAsync({
        supplierId,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.costPrice,
          sellingPrice: i.sellingPrice > 0 ? i.sellingPrice : undefined,
          minSellingPrice: i.minSellingPrice > 0 ? i.minSellingPrice : undefined,
          wholesalePrice: i.wholesalePrice > 0 ? i.wholesalePrice : undefined,
        })),
        note: note || undefined,
        paidAmount,
      });
      toast('Kirim muvaffaqiyatli saqlandi', 'success');
      navigate({ to: '/suppliers/$supplierId', params: { supplierId } });
    } catch (err) {
      const msg = (err as { message?: string }).message ?? 'Kirim saqlashda xatolik';
      toast(msg, 'error');
    }
  }

  const showDropdown = searchFocused && productSearch.length >= 1 && products.length > 0;
  const inputCls = 'w-full rounded border border-border bg-surface-secondary/40 px-2 py-1 text-[13px] tabular-nums focus:outline-2 focus:outline-primary-500 focus:bg-surface';

  return (
    <div className="compact-inputs animate-fade-in pb-24 sm:pb-4">
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-surface border-b border-border px-3 py-2 sm:px-6 sm:py-3">
        <div className="flex items-center gap-2.5">
          <Link to="/suppliers/$supplierId" params={{ supplierId }} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-secondary transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            {supplierLoading ? <Skeleton className="h-4 w-28" /> : (
              <>
                <h1 className="text-sm sm:text-base font-bold text-text-primary truncate">Yangi kirim</h1>
                <p className="text-[10px] sm:text-xs text-text-muted truncate">{supplier?.name}</p>
              </>
            )}
          </div>
          <span className="hidden sm:flex items-center gap-1 text-[11px] text-text-muted font-medium shrink-0">
            Valyuta: <span className="font-bold text-text-primary">so'm (UZS)</span>
          </span>
        </div>
      </div>

      <div className="px-3 sm:px-6 pt-3">
        {/* ── Search + New Product ── */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
            <input
              type="text" value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              placeholder="Mahsulot qidirish..."
              className="w-full rounded-lg border border-border bg-surface pl-8 pr-8 py-2 sm:py-1.5 text-[13px] placeholder:text-text-muted/50 focus:outline-2 focus:outline-primary-500"
            />
            {productSearch && (
              <button type="button" onClick={() => { setProductSearch(''); setSearchFocused(false); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-text-muted">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {showDropdown && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-dropdown">
                <div className="max-h-56 overflow-auto">
                  {products.map((p) => {
                    const added = items.some((i) => i.productId === p.id);
                    return (
                      <button key={p.id as string} type="button" onMouseDown={(e) => e.preventDefault()}
                        onClick={() => !added && addProduct(p)} disabled={added}
                        className={cn('flex w-full items-center gap-2.5 px-2.5 py-2 text-left border-b border-border/15 last:border-0', added ? 'opacity-30' : 'hover:bg-primary-50/40 active:bg-primary-50')}>
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-surface-secondary text-text-muted">
                          <Package className="h-3 w-3" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-medium text-text-primary truncate">{String(p.name)}</p>
                          <p className="text-[10px] text-text-muted">Zaxira: {Number(p.stock)} · {formatCurrency(Number(p.costPrice))}</p>
                        </div>
                        {!added && <Plus className="h-3.5 w-3.5 text-primary-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setNewProductOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 sm:py-1.5 text-[12px] font-semibold text-white hover:bg-primary-700 transition-colors shrink-0"
            style={{ minHeight: 'auto' }}
            title="Yangi mahsulot yaratish"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Yangi mahsulot</span>
            <span className="sm:hidden">Yangi</span>
          </button>
        </div>

        {/* ── Empty ── */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 sm:py-20 text-text-muted">
            <Package className="h-10 w-10 opacity-20 mb-3" />
            <p className="text-xs font-medium">Mahsulot qo'shilmagan</p>
            <p className="text-[10px] mt-1 text-text-muted/70">Qidirib toping yoki "Yangi mahsulot" tugmasini bosing</p>
          </div>
        ) : (
          <>
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              {items.length} ta mahsulot · {totalQty} dona
            </p>

            {/* ── Desktop Table — 4 prices ── */}
            <div className="hidden lg:block card overflow-hidden mb-3">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary/60 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                    <th className="px-2 py-1.5 text-left w-8">#</th>
                    <th className="px-2 py-1.5 text-left min-w-[140px]">Mahsulot</th>
                    <th className="px-2 py-1.5 text-center w-20">Miqdor</th>
                    <th className="px-2 py-1.5 text-left w-28">Tan</th>
                    <th className="px-2 py-1.5 text-left w-28">Min</th>
                    <th className="px-2 py-1.5 text-left w-28">Optom</th>
                    <th className="px-2 py-1.5 text-left w-28">Dona</th>
                    <th className="px-2 py-1.5 text-right w-28">Jami</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const itemTotal = item.quantity * item.costPrice;
                    const margin = item.sellingPrice > 0 && item.costPrice > 0
                      ? ((item.sellingPrice - item.costPrice) / item.costPrice * 100)
                      : 0;
                    return (
                      <tr key={item.productId} className="border-b border-border/15 hover:bg-surface-secondary/20">
                        <td className="px-2 py-1.5 text-text-muted text-xs">{i + 1}</td>
                        <td className="px-2 py-1.5">
                          <p className="font-medium text-text-primary text-[12.5px]">{item.productName}</p>
                          {margin > 0 && (
                            <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-medium', margin >= 15 ? 'text-success-600' : margin >= 5 ? 'text-warning-600' : 'text-danger-600')}>
                              <TrendingUp className="h-2.5 w-2.5" />{margin.toFixed(1)}%
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" inputMode="numeric" value={item.quantity}
                            onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); updateItem(i, 'quantity', Math.max(1, parseInt(v) || 1)); }}
                            className={cn(inputCls, 'text-center font-semibold')}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" inputMode="decimal" value={item.costPrice}
                            onChange={(e) => updateItem(i, 'costPrice', Math.max(0, Number(e.target.value) || 0))}
                            className={inputCls}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" inputMode="decimal" value={item.minSellingPrice}
                            onChange={(e) => updateItem(i, 'minSellingPrice', Math.max(0, Number(e.target.value) || 0))}
                            className={inputCls} placeholder="0"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" inputMode="decimal" value={item.wholesalePrice}
                            onChange={(e) => updateItem(i, 'wholesalePrice', Math.max(0, Number(e.target.value) || 0))}
                            className={inputCls} placeholder="0"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" inputMode="decimal" value={item.sellingPrice}
                            onChange={(e) => updateItem(i, 'sellingPrice', Math.max(0, Number(e.target.value) || 0))}
                            className={inputCls}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right font-semibold text-text-primary tabular-nums text-[12.5px]">{formatCurrency(itemTotal)}</td>
                        <td className="px-1 py-1.5">
                          <button type="button" onClick={() => removeItem(i)} className="rounded p-1 text-text-muted/40 hover:text-danger-600 hover:bg-danger-50 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Tablet/Mobile Cards — 4 prices ── */}
            <div className="lg:hidden space-y-2 mb-3">
              {items.map((item, i) => {
                const itemTotal = item.quantity * item.costPrice;
                const margin = item.sellingPrice > 0 && item.costPrice > 0
                  ? ((item.sellingPrice - item.costPrice) / item.costPrice * 100)
                  : 0;

                return (
                  <div key={item.productId} className="rounded-xl border border-border bg-surface p-2.5 sm:p-3 shadow-sm">
                    {/* Name + remove */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary-50 text-[10px] font-bold text-primary-700">{i + 1}</span>
                        <p className="text-[13px] font-semibold text-text-primary truncate">{item.productName}</p>
                        {margin > 0 && (
                          <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-bold shrink-0', margin >= 15 ? 'text-success-600' : margin >= 5 ? 'text-warning-600' : 'text-danger-600')}>
                            <TrendingUp className="h-2.5 w-2.5" />{margin.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <button type="button" onClick={() => removeItem(i)}
                        className="rounded-lg p-1.5 text-text-muted/50 hover:text-danger-600 hover:bg-danger-50 active:bg-danger-100 transition-colors"
                        style={{ minHeight: 'auto', minWidth: 'auto' }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Miqdor */}
                    <div className="mb-2">
                      <label className="text-[10px] font-semibold text-text-muted uppercase block mb-1">Miqdor</label>
                      <div className="flex items-center gap-1.5">
                        <button type="button"
                          onClick={() => updateItem(i, 'quantity', Math.max(1, item.quantity - 1))}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-secondary text-text-primary font-bold active:bg-primary-50"
                          style={{ minHeight: 'auto', minWidth: 'auto' }}>−</button>
                        <input type="text" inputMode="numeric" value={item.quantity}
                          onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); updateItem(i, 'quantity', Math.max(1, parseInt(v) || 1)); }}
                          className="flex-1 h-9 rounded-lg border border-border bg-surface text-center text-[14px] font-bold tabular-nums focus:outline-2 focus:outline-primary-500"
                        />
                        <button type="button"
                          onClick={() => updateItem(i, 'quantity', item.quantity + 1)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-secondary text-text-primary font-bold active:bg-primary-50"
                          style={{ minHeight: 'auto', minWidth: 'auto' }}>+</button>
                      </div>
                    </div>

                    {/* 4 prices grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-danger-600 block mb-1">Tan narxi *</label>
                        <input type="text" inputMode="decimal" value={item.costPrice}
                          onChange={(e) => updateItem(i, 'costPrice', Math.max(0, Number(e.target.value) || 0))}
                          className="w-full h-9 rounded-lg border border-border bg-surface-secondary/40 px-2 text-[13px] tabular-nums focus:outline-2 focus:outline-danger-500 focus:bg-surface"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-warning-700 block mb-1">Min narx</label>
                        <input type="text" inputMode="decimal" value={item.minSellingPrice}
                          onChange={(e) => updateItem(i, 'minSellingPrice', Math.max(0, Number(e.target.value) || 0))}
                          className="w-full h-9 rounded-lg border border-border bg-surface-secondary/40 px-2 text-[13px] tabular-nums focus:outline-2 focus:outline-warning-500 focus:bg-surface"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-primary-700 block mb-1">Optom narx</label>
                        <input type="text" inputMode="decimal" value={item.wholesalePrice}
                          onChange={(e) => updateItem(i, 'wholesalePrice', Math.max(0, Number(e.target.value) || 0))}
                          className="w-full h-9 rounded-lg border border-border bg-surface-secondary/40 px-2 text-[13px] tabular-nums focus:outline-2 focus:outline-primary-500 focus:bg-surface"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-success-700 block mb-1">Dona narx</label>
                        <input type="text" inputMode="decimal" value={item.sellingPrice}
                          onChange={(e) => updateItem(i, 'sellingPrice', Math.max(0, Number(e.target.value) || 0))}
                          className="w-full h-9 rounded-lg border border-border bg-surface-secondary/40 px-2 text-[13px] tabular-nums focus:outline-2 focus:outline-success-500 focus:bg-surface"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                      <span className="text-[10px] text-text-muted font-medium uppercase">Jami</span>
                      <span className="text-[13px] font-bold text-primary-700 tabular-nums">{formatCurrency(itemTotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Summary ── */}
            <div className="card overflow-hidden mb-3">
              <div className="grid grid-cols-4 divide-x divide-border/20">
                <div className="py-2 px-1 sm:p-3 text-center">
                  <p className="text-[7px] sm:text-[9px] text-text-muted font-medium uppercase">Mahsulot</p>
                  <p className="text-xs sm:text-base font-bold text-text-primary">{items.length}</p>
                </div>
                <div className="py-2 px-1 sm:p-3 text-center">
                  <p className="text-[7px] sm:text-[9px] text-text-muted font-medium uppercase">Miqdor</p>
                  <p className="text-xs sm:text-base font-bold text-text-primary">{totalQty}</p>
                </div>
                <div className="py-2 px-1 sm:p-3 text-center">
                  <p className="text-[7px] sm:text-[9px] text-text-muted font-medium uppercase">Foyda</p>
                  <p className={cn('text-xs sm:text-base font-bold tabular-nums', marginStats.totalMargin >= 0 ? 'text-success-600' : 'text-danger-600')}>
                    {formatCurrency(marginStats.totalMargin)}
                  </p>
                </div>
                <div className="py-2 px-1 sm:p-3 text-center bg-primary-50/30">
                  <p className="text-[7px] sm:text-[9px] text-primary-600 font-semibold uppercase">Jami</p>
                  <p className="text-xs sm:text-base font-bold text-primary-700 tabular-nums">{formatCurrency(totalCost)}</p>
                </div>
              </div>
            </div>

            {/* ── To'lov turi ── */}
            <div className="card p-2.5 sm:p-3 mb-3">
              <label className="text-[10px] font-semibold text-text-muted uppercase block mb-2">To'lov turi</label>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                <button
                  type="button"
                  onClick={() => { setPaymentMode('DEBT'); setCashAmount(0); }}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 transition-all',
                    paymentMode === 'DEBT'
                      ? 'border-warning-500 bg-warning-50 text-warning-700 ring-2 ring-warning-200'
                      : 'border-border bg-surface text-text-muted hover:border-warning-300 hover:bg-warning-50/30',
                  )}
                  style={{ minHeight: 'auto' }}
                >
                  <CreditCard className="h-4 w-4" />
                  <span className="text-[11px] font-semibold">Qarz</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setPaymentMode('CASH'); setCashAmount(totalCost); }}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 transition-all',
                    paymentMode === 'CASH'
                      ? 'border-success-500 bg-success-50 text-success-700 ring-2 ring-success-200'
                      : 'border-border bg-surface text-text-muted hover:border-success-300 hover:bg-success-50/30',
                  )}
                  style={{ minHeight: 'auto' }}
                >
                  <Wallet className="h-4 w-4" />
                  <span className="text-[11px] font-semibold">Naqd</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setPaymentMode('MIXED'); }}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 transition-all',
                    paymentMode === 'MIXED'
                      ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                      : 'border-border bg-surface text-text-muted hover:border-primary-300 hover:bg-primary-50/30',
                  )}
                  style={{ minHeight: 'auto' }}
                >
                  <Layers className="h-4 w-4" />
                  <span className="text-[11px] font-semibold">Aralash</span>
                </button>
              </div>

              {/* Mixed input */}
              {paymentMode === 'MIXED' && (
                <div className="mb-2">
                  <label className="text-[10px] font-medium text-text-muted block mb-1">Naqd berilayotgan summa</label>
                  <input
                    type="text" inputMode="decimal" value={cashAmount || ''}
                    onChange={(e) => setCashAmount(Math.max(0, Number(e.target.value.replace(/\s/g, '')) || 0))}
                    placeholder="0"
                    className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-[14px] font-semibold tabular-nums focus:outline-2 focus:outline-primary-500"
                  />
                </div>
              )}

              {/* Breakdown */}
              {totalCost > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="rounded-lg bg-success-50/60 px-2.5 py-1.5">
                    <p className="text-[9px] text-success-700 font-semibold uppercase">Naqd</p>
                    <p className="text-[13px] font-bold text-success-700 tabular-nums">{formatCurrency(paidAmount)}</p>
                  </div>
                  <div className="rounded-lg bg-warning-50/60 px-2.5 py-1.5">
                    <p className="text-[9px] text-warning-700 font-semibold uppercase">Qarz</p>
                    <p className="text-[13px] font-bold text-warning-700 tabular-nums">{formatCurrency(debtAmount)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Note ── */}
            <div className="card p-2 sm:p-3 mb-3">
              <label className="text-[10px] font-semibold text-text-muted uppercase block mb-1.5">Izoh</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Kirim haqida izoh..."
                rows={2} className="w-full rounded-lg border border-border bg-surface-secondary/30 px-2.5 py-1.5 text-[12px] sm:text-[13px] placeholder:text-text-muted/40 resize-none focus:outline-2 focus:outline-primary-500 focus:bg-surface" />
            </div>

            {/* ── Desktop Actions ── */}
            <div className="hidden sm:flex items-center justify-between gap-3 pb-2">
              <Link to="/suppliers/$supplierId" params={{ supplierId }} className="btn btn-secondary btn-sm">Bekor qilish</Link>
              <Button onClick={handleSubmit} loading={importMut.isPending} disabled={items.length === 0}>
                <ArrowDownToLine className="h-4 w-4" />Kirimni saqlash
              </Button>
            </div>
          </>
        )}
      </div>

      {/* ── Mobile Bottom Action ── */}
      {items.length > 0 && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border px-3 py-2.5 safe-area-bottom shadow-lg">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] text-text-muted uppercase font-semibold">Jami</p>
              <p className="text-[14px] font-bold text-primary-700 tabular-nums truncate">{formatCurrency(totalCost)}</p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={importMut.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2.5 text-[12px] font-semibold text-white shrink-0 disabled:opacity-50 active:bg-primary-700"
              style={{ minHeight: 'auto', minWidth: 'auto' }}
            >
              {importMut.isPending
                ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                : <ArrowDownToLine className="h-3.5 w-3.5" />}
              Saqlash
            </button>
          </div>
        </div>
      )}

      {/* ── New Product Modal ── */}
      <ProductModal
        open={newProductOpen}
        onClose={handleNewProductCreated}
        product={null}
      />
    </div>
  );
}

// ProductData re-export — backward compat
export type { ProductData };
