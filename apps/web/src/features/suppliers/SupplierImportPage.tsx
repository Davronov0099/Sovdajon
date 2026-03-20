import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Plus, Trash2, Package, DollarSign, ArrowDownToLine, Search, X, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSupplier, useSupplierImport } from '@/hooks/useSuppliers';
import { useProducts } from '@/hooks/useProducts';
import { useUsdRateStore } from '@/stores/usdRate';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';

type Currency = 'UZS' | 'USD';

interface ImportItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  costCurrency: Currency;
  sellingPrice: number;
  sellCurrency: Currency;
}

export function SupplierImportPage() {
  const { supplierId } = useParams({ from: '/_auth/suppliers_/$supplierId_/import' });
  const navigate = useNavigate();
  const { toast } = useToast();
  const usdRate = useUsdRateStore((s) => s.rate);

  const { data: supplierData, isLoading: supplierLoading } = useSupplier(supplierId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supplier = (supplierData as any)?.data as any;

  const [items, setItems] = useState<ImportItem[]>([]);
  const [defaultCostCur, setDefaultCostCur] = useState<Currency>('USD');
  const [defaultSellCur, setDefaultSellCur] = useState<Currency>('UZS');
  const [note, setNote] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const { data: productsData } = useProducts({ search: productSearch, limit: 20 });
  const importMut = useSupplierImport();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products = ((productsData as any)?.data as Array<Record<string, unknown>>) ?? [];

  const rate = usdRate || 13000;

  /** Qiymatni UZS ga o'tkazish */
  function toUzs(value: number, cur: Currency): number {
    return cur === 'USD' ? value * rate : value;
  }
  /** Qiymatni boshqa valyutaga ko'rsatish */
  function toAltDisplay(value: number, cur: Currency): string {
    if (cur === 'USD') return formatCurrency(value * rate);
    return rate > 0 ? `$${(value / rate).toFixed(2)}` : '$0';
  }

  function addProduct(product: Record<string, unknown>) {
    if (items.find((i) => i.productId === product.id)) {
      toast("Bu mahsulot allaqachon qo'shilgan", 'error');
      return;
    }
    const currentCostPrice = Number(product.costPrice) || 0;
    const currentSellingPrice = Number(product.price) || 0;
    // Default valyutalarga moslashtirish
    const costVal = defaultCostCur === 'USD' ? (rate > 0 ? Math.round(currentCostPrice / rate * 100) / 100 : 0) : currentCostPrice;
    const sellVal = defaultSellCur === 'USD' ? (rate > 0 ? Math.round(currentSellingPrice / rate * 100) / 100 : 0) : currentSellingPrice;

    setItems([...items, {
      productId: product.id as string,
      productName: product.name as string,
      quantity: 1,
      costPrice: costVal,
      costCurrency: defaultCostCur,
      sellingPrice: sellVal,
      sellCurrency: defaultSellCur,
    }]);
    setProductSearch('');
    setSearchFocused(false);
  }

  function updateItem(index: number, field: keyof ImportItem, value: number) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  // Jami — har bir item'ni UZS ga o'tkazib hisoblash
  const totalCost = items.reduce((sum, item) => sum + item.quantity * toUzs(item.costPrice, item.costCurrency), 0);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  const marginStats = useMemo(() => {
    let totalMargin = 0;
    for (const item of items) {
      const costUzs = toUzs(item.costPrice, item.costCurrency);
      const sellUzs = toUzs(item.sellingPrice, item.sellCurrency);
      totalMargin += (sellUzs - costUzs) * item.quantity;
    }
    return { totalMargin };
  }, [items, rate]);

  async function handleSubmit() {
    if (items.length === 0) { toast("Kamida 1 ta mahsulot qo'shing", 'error'); return; }
    for (const item of items) {
      if (item.costPrice <= 0) { toast(`${item.productName}: Tan narxi 0 dan katta bo'lishi kerak`, 'error'); return; }
    }
    try {
      // API ga UZS da yuboramiz
      await importMut.mutateAsync({
        supplierId,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: toUzs(i.costPrice, i.costCurrency),
          sellingPrice: i.sellingPrice > 0 ? toUzs(i.sellingPrice, i.sellCurrency) : undefined,
        })),
        currency: 'UZS', rate: 1, note: note || undefined,
      });
      toast('Kirim muvaffaqiyatli saqlandi', 'success');
      navigate({ to: '/suppliers/$supplierId', params: { supplierId } });
    } catch { toast('Kirim saqlashda xatolik', 'error'); }
  }

  const showDropdown = searchFocused && productSearch.length >= 1 && products.length > 0;
  const inputCls = 'w-full rounded border border-border bg-surface-secondary/40 px-2 py-1 text-[13px] tabular-nums focus:outline-2 focus:outline-primary-500 focus:bg-surface';

  return (
    <div className="compact-inputs animate-fade-in pb-20 sm:pb-4">
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-surface border-b border-border px-4 py-2 sm:px-6 sm:py-3">
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
          {/* Default valyutalar */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex flex-col items-center">
              <span className="text-[7px] text-text-muted leading-none mb-0.5">Tan</span>
              <div className="flex rounded border border-border overflow-hidden h-6">
                {(['UZS', 'USD'] as const).map((c) => (
                  <button key={c} type="button" onClick={() => setDefaultCostCur(c)}
                    className={cn('px-1.5 text-[9px] font-bold transition-colors', defaultCostCur === c ? 'bg-emerald-600 text-white' : 'text-text-muted hover:bg-surface-secondary')}>
                    {c === 'USD' ? '$' : "so'm"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[7px] text-text-muted leading-none mb-0.5">Sotuv</span>
              <div className="flex rounded border border-border overflow-hidden h-6">
                {(['UZS', 'USD'] as const).map((c) => (
                  <button key={c} type="button" onClick={() => setDefaultSellCur(c)}
                    className={cn('px-1.5 text-[9px] font-bold transition-colors', defaultSellCur === c ? 'bg-blue-600 text-white' : 'text-text-muted hover:bg-surface-secondary')}>
                    {c === 'USD' ? '$' : "so'm"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <span className="hidden sm:flex items-center gap-1 text-[11px] text-text-muted shrink-0">
            <DollarSign className="h-3 w-3" />{formatCurrency(rate, '')}
          </span>
        </div>
      </div>

      <div className="px-4 sm:px-6 pt-3">
        {/* ── Search ── */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
          <input
            type="text" value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            placeholder="Mahsulot qidirish..."
            className="w-full rounded-lg border border-border bg-surface pl-8 pr-8 py-1.5 text-[13px] placeholder:text-text-muted/50 focus:outline-2 focus:outline-primary-500"
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

        {/* ── Empty ── */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 sm:py-20 text-text-muted">
            <Package className="h-10 w-10 opacity-20 mb-3" />
            <p className="text-xs font-medium">Mahsulot qo'shilmagan</p>
          </div>
        ) : (
          <>
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              {items.length} ta mahsulot · {totalQty} dona
            </p>

            {/* ── Desktop Table ── */}
            <div className="hidden sm:block card overflow-hidden mb-3">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary/60 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                    <th className="px-2.5 py-1.5 text-left w-8">#</th>
                    <th className="px-2.5 py-1.5 text-left">Mahsulot</th>
                    <th className="px-2.5 py-1.5 text-center w-24">Miqdor</th>
                    <th className="px-2.5 py-1.5 text-left">Tan narxi</th>
                    <th className="px-2.5 py-1.5 text-left">Sotuv narxi</th>
                    <th className="px-2.5 py-1.5 text-right w-28">Jami</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const costUzs = toUzs(item.costPrice, item.costCurrency);
                    const sellUzs = toUzs(item.sellingPrice, item.sellCurrency);
                    const itemTotal = item.quantity * costUzs;
                    const margin = sellUzs > 0 && costUzs > 0 ? ((sellUzs - costUzs) / costUzs * 100) : 0;
                    return (
                      <tr key={item.productId} className="border-b border-border/15 hover:bg-surface-secondary/20">
                        <td className="px-2.5 py-1.5 text-text-muted text-xs">{i + 1}</td>
                        <td className="px-2.5 py-1.5">
                          <p className="font-medium text-text-primary">{item.productName}</p>
                          {margin > 0 && (
                            <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-medium', margin >= 15 ? 'text-success-600' : margin >= 5 ? 'text-warning-600' : 'text-danger-600')}>
                              <TrendingUp className="h-2.5 w-2.5" />{margin.toFixed(1)}%
                            </span>
                          )}
                        </td>
                        <td className="px-2.5 py-1.5">
                          <input type="text" inputMode="numeric" value={item.quantity}
                            onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); updateItem(i, 'quantity', Math.max(1, parseInt(v) || 1)); }}
                            className={cn(inputCls, 'text-center font-semibold')}
                          />
                        </td>
                        <td className="px-2.5 py-1.5">
                          <div className="flex items-center gap-1">
                            <input type="text" inputMode="decimal" value={item.costPrice}
                              onChange={(e) => updateItem(i, 'costPrice', Math.max(0, Number(e.target.value) || 0))}
                              className={cn(inputCls, 'flex-1')}
                            />
                            <button type="button" onClick={() => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, costCurrency: it.costCurrency === 'USD' ? 'UZS' : 'USD', costPrice: it.costCurrency === 'USD' ? Math.round(it.costPrice * rate) : (rate > 0 ? Math.round(it.costPrice / rate * 100) / 100 : 0) } : it))}
                              className={cn('shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold transition-colors', item.costCurrency === 'USD' ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-tertiary text-text-muted')}>
                              {item.costCurrency === 'USD' ? '$' : "so'm"}
                            </button>
                          </div>
                          <p className="text-[9px] text-text-muted mt-px tabular-nums">≈ {toAltDisplay(item.costPrice, item.costCurrency)}</p>
                        </td>
                        <td className="px-2.5 py-1.5">
                          <div className="flex items-center gap-1">
                            <input type="text" inputMode="decimal" value={item.sellingPrice}
                              onChange={(e) => updateItem(i, 'sellingPrice', Math.max(0, Number(e.target.value) || 0))}
                              className={cn(inputCls, 'flex-1')}
                            />
                            <button type="button" onClick={() => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, sellCurrency: it.sellCurrency === 'USD' ? 'UZS' : 'USD', sellingPrice: it.sellCurrency === 'USD' ? Math.round(it.sellingPrice * rate) : (rate > 0 ? Math.round(it.sellingPrice / rate * 100) / 100 : 0) } : it))}
                              className={cn('shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold transition-colors', item.sellCurrency === 'USD' ? 'bg-blue-100 text-blue-700' : 'bg-surface-tertiary text-text-muted')}>
                              {item.sellCurrency === 'USD' ? '$' : "so'm"}
                            </button>
                          </div>
                          <p className="text-[9px] text-text-muted mt-px tabular-nums">≈ {toAltDisplay(item.sellingPrice, item.sellCurrency)}</p>
                        </td>
                        <td className="px-2.5 py-1.5 text-right font-semibold text-text-primary tabular-nums">{formatCurrency(itemTotal)}</td>
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

            {/* ── Mobile Cards ── */}
            <div className="sm:hidden space-y-1.5 mb-3">
              {items.map((item, i) => {
                const costUzs = toUzs(item.costPrice, item.costCurrency);
                const sellUzs = toUzs(item.sellingPrice, item.sellCurrency);
                const itemTotal = item.quantity * costUzs;
                const margin = sellUzs > 0 && costUzs > 0 ? ((sellUzs - costUzs) / costUzs * 100) : 0;

                return (
                  <div key={item.productId} className="rounded-lg border border-border/50 bg-surface p-2">
                    {/* Name */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-primary-50 text-[8px] font-bold text-primary-700">{i + 1}</span>
                        <p className="text-[11px] font-semibold text-text-primary truncate">{item.productName}</p>
                        {margin > 0 && (
                          <span className={cn('text-[8px] font-bold shrink-0', margin >= 15 ? 'text-success-600' : margin >= 5 ? 'text-warning-600' : 'text-danger-600')}>
                            {margin.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <button type="button" onClick={() => removeItem(i)} className="rounded p-0.5 text-text-muted/30 active:text-danger-600">
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-3 gap-1">
                      <div>
                        <label className="text-[8px] text-text-muted block mb-px">Miqdor</label>
                        <input type="text" inputMode="numeric" value={item.quantity}
                          onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); updateItem(i, 'quantity', Math.max(1, parseInt(v) || 1)); }}
                          className="w-full rounded border border-border bg-surface-secondary/40 px-1 py-1 text-[11px] text-center tabular-nums font-semibold focus:outline-2 focus:outline-primary-500 focus:bg-surface"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-px">
                          <label className="text-[8px] text-text-muted">Tan</label>
                          <button type="button" onClick={() => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, costCurrency: it.costCurrency === 'USD' ? 'UZS' : 'USD', costPrice: it.costCurrency === 'USD' ? Math.round(it.costPrice * rate) : (rate > 0 ? Math.round(it.costPrice / rate * 100) / 100 : 0) } : it))}
                            className={cn('text-[7px] font-bold px-1 rounded', item.costCurrency === 'USD' ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-tertiary text-text-muted')}>
                            {item.costCurrency === 'USD' ? '$' : "so'm"}
                          </button>
                        </div>
                        <input type="text" inputMode="decimal" value={item.costPrice}
                          onChange={(e) => updateItem(i, 'costPrice', Math.max(0, Number(e.target.value) || 0))}
                          className="w-full rounded border border-border bg-surface-secondary/40 px-1 py-1 text-[11px] tabular-nums focus:outline-2 focus:outline-primary-500 focus:bg-surface"
                        />
                        <p className="text-[7px] text-text-muted tabular-nums">≈ {toAltDisplay(item.costPrice, item.costCurrency)}</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-px">
                          <label className="text-[8px] text-text-muted">Sotuv</label>
                          <button type="button" onClick={() => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, sellCurrency: it.sellCurrency === 'USD' ? 'UZS' : 'USD', sellingPrice: it.sellCurrency === 'USD' ? Math.round(it.sellingPrice * rate) : (rate > 0 ? Math.round(it.sellingPrice / rate * 100) / 100 : 0) } : it))}
                            className={cn('text-[7px] font-bold px-1 rounded', item.sellCurrency === 'USD' ? 'bg-blue-100 text-blue-700' : 'bg-surface-tertiary text-text-muted')}>
                            {item.sellCurrency === 'USD' ? '$' : "so'm"}
                          </button>
                        </div>
                        <input type="text" inputMode="decimal" value={item.sellingPrice}
                          onChange={(e) => updateItem(i, 'sellingPrice', Math.max(0, Number(e.target.value) || 0))}
                          className="w-full rounded border border-border bg-surface-secondary/40 px-1 py-1 text-[11px] tabular-nums focus:outline-2 focus:outline-primary-500 focus:bg-surface"
                        />
                        <p className="text-[7px] text-text-muted tabular-nums">≈ {toAltDisplay(item.sellingPrice, item.sellCurrency)}</p>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between mt-1 pt-1" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                      <span className="text-[9px] text-text-muted">Jami</span>
                      <span className="text-[11px] font-bold text-text-primary tabular-nums">{formatCurrency(itemTotal)}</span>
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

            {/* ── Note ── */}
            <div className="card p-2 sm:p-3 mb-3">
              <label className="text-[8px] sm:text-[9px] font-medium text-text-muted uppercase block mb-1">Izoh</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Kirim haqida izoh..."
                rows={2} className="w-full rounded border border-border bg-surface-secondary/30 px-2 py-1.5 text-[11px] sm:text-[13px] placeholder:text-text-muted/40 resize-none focus:outline-2 focus:outline-primary-500 focus:bg-surface" />
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

      {/* ── Mobile Bottom ── */}
      {items.length > 0 && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border px-3 py-2 safe-area-bottom">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[8px] text-text-muted uppercase">Jami</p>
              <p className="text-[13px] font-bold text-text-primary tabular-nums truncate">{formatCurrency(totalCost)}</p>
            </div>
            <button onClick={handleSubmit} disabled={importMut.isPending} className="btn btn-primary px-4 py-1.5 text-[11px] shrink-0">
              {importMut.isPending ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <ArrowDownToLine className="h-3.5 w-3.5" />}
              Saqlash
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
