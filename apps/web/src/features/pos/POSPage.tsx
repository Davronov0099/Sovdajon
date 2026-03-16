import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ShoppingCart, Package } from 'lucide-react';
import { formatCurrency, getStockStatus } from '@sardorbek/shared';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useCartStore } from '@/stores/cart';
import { useUiStore } from '@/stores/ui';
import { useSound } from '@/hooks/useSound';
import { cn } from '@/lib/cn';
import { CartPanel } from './CartPanel';
import { PaymentModal } from './PaymentModal';
import { NumPad } from './NumPad';

const UNIT_LABELS: Record<string, string> = {
  PIECE: 'dona',
  KG: 'kg',
  METER: 'metr',
  SET: 'to\'plam',
  PACK: 'pachka',
  BOX: 'quti',
};

export function POSPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [numPadOpen, setNumPadOpen] = useState(false);
  const [numPadTarget, setNumPadTarget] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const catScrollRef = useRef<HTMLDivElement>(null);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const { play } = useSound();

  const { data: productsData, isLoading } = useProducts({
    search,
    categoryId,
    subCategoryId,
    page: 1,
    limit: 100,
  });
  const { data: catData } = useCategories();

  const products = productsData?.data ?? [];
  const categories = catData?.data ?? [];
  const addItem = useCartStore((s) => s.addItem);
  const itemCount = useCartStore((s) => s.getItemCount());

  // Auto-focus search on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); }
      if (['F1', 'F2', 'F3', 'F4', 'F5'].includes(e.key)) { e.preventDefault(); setPaymentOpen(true); }
      if (e.ctrlKey && e.key === 'Backspace') { e.preventDefault(); useCartStore.getState().clearCart(); }
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAddProduct = useCallback(
    (product: { id: string; name: string; price: number; costPrice: number; unit: string; stock: number }) => {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        costPrice: product.costPrice,
        unit: product.unit,
        stock: product.stock,
      });
      play('add-to-cart');
    },
    [addItem, play],
  );

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] overflow-hidden">
      {/* ─── Left — Products ─── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-surface-secondary">
        {/* Search bar */}
        <div className="bg-surface px-4 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Mahsulot qidirish..."
              className="input pl-10 pos-touch !bg-surface-secondary"
              aria-label="Mahsulot qidirish"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                style={{ minHeight: 'auto', minWidth: 'auto' }}
                aria-label="Tozalash"
              >
                <span className="text-xs font-medium">ESC</span>
              </button>
            )}
          </div>
        </div>

        {/* Categories — arrow scroll + mouse wheel horizontal */}
        <div className="bg-surface" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          {/* Main categories row */}
          <div className="relative">
            {/* Left arrow */}
            <button
              onClick={() => catScrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
              className="absolute left-0 top-0 z-10 flex h-full w-8 items-center justify-center bg-gradient-to-r from-surface via-surface/90 to-transparent text-text-muted hover:text-text-primary transition-colors"
              style={{ minHeight: 'auto', minWidth: 'auto' }}
              aria-label="Chapga aylantirish"
              tabIndex={-1}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>

            {/* Right arrow */}
            <button
              onClick={() => catScrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
              className="absolute right-0 top-0 z-10 flex h-full w-8 items-center justify-center bg-gradient-to-l from-surface via-surface/90 to-transparent text-text-muted hover:text-text-primary transition-colors"
              style={{ minHeight: 'auto', minWidth: 'auto' }}
              aria-label="O'ngga aylantirish"
              tabIndex={-1}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>

            {/* Scrollable container */}
            <div
              ref={catScrollRef}
              className="flex gap-1.5 px-10 py-2 overflow-x-auto no-scrollbar"
              onWheel={(e) => {
                if (catScrollRef.current && e.deltaY !== 0) {
                  e.preventDefault();
                  catScrollRef.current.scrollBy({ left: e.deltaY * 2, behavior: 'auto' });
                }
              }}
            >
          <button
            onClick={() => { setCategoryId(''); setSubCategoryId(''); }}
            className={cn(
              'shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all',
              !categoryId
                ? 'bg-sidebar text-white shadow-sm'
                : 'bg-surface-tertiary/70 text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
            )}
            style={{ minHeight: '32px', minWidth: 'auto' }}
          >
            Barchasi
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setCategoryId(categoryId === cat.id ? '' : cat.id); setSubCategoryId(''); }}
              className={cn(
                'shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all',
                categoryId === cat.id
                  ? 'bg-sidebar text-white shadow-sm'
                  : 'bg-surface-tertiary/70 text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
              )}
              style={{ minHeight: '32px', minWidth: 'auto' }}
            >
              {cat.name}
            </button>
          ))}
            </div>
          </div>

          {/* Sub-categories — arrow scroll + mouse wheel */}
          {categoryId && (() => {
            const selectedCat = categories.find((c) => c.id === categoryId);
            const subs = (selectedCat as Record<string, unknown>)?.subCategories as Array<{ id: string; name: string }> | undefined;
            if (!subs || subs.length === 0) return null;
            return (
              <div className="relative" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                {/* Left arrow */}
                <button
                  onClick={() => {
                    const el = document.getElementById('sub-cat-scroll');
                    el?.scrollBy({ left: -150, behavior: 'smooth' });
                  }}
                  className="absolute left-0 top-0 z-10 flex h-full w-6 items-center justify-center bg-gradient-to-r from-surface to-transparent text-text-muted hover:text-text-primary"
                  style={{ minHeight: 'auto', minWidth: 'auto' }}
                  tabIndex={-1}
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>

                {/* Right arrow */}
                <button
                  onClick={() => {
                    const el = document.getElementById('sub-cat-scroll');
                    el?.scrollBy({ left: 150, behavior: 'smooth' });
                  }}
                  className="absolute right-0 top-0 z-10 flex h-full w-6 items-center justify-center bg-gradient-to-l from-surface to-transparent text-text-muted hover:text-text-primary"
                  style={{ minHeight: 'auto', minWidth: 'auto' }}
                  tabIndex={-1}
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>

                <div
                  id="sub-cat-scroll"
                  className="flex gap-1.5 px-8 py-1.5 overflow-x-auto no-scrollbar"
                  onWheel={(e) => {
                    const el = document.getElementById('sub-cat-scroll');
                    if (el && e.deltaY !== 0) {
                      e.preventDefault();
                      el.scrollBy({ left: e.deltaY * 2, behavior: 'auto' });
                    }
                  }}
                >
                  <button
                    onClick={() => setSubCategoryId('')}
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all',
                      !subCategoryId
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-surface-tertiary/50 text-text-muted hover:text-text-secondary',
                    )}
                    style={{ minHeight: '26px', minWidth: 'auto' }}
                  >
                    Barchasi
                  </button>
                  {subs.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setSubCategoryId(subCategoryId === sub.id ? '' : sub.id)}
                      className={cn(
                        'shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all',
                        subCategoryId === sub.id
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-surface-tertiary/50 text-text-muted hover:text-text-secondary',
                      )}
                      style={{ minHeight: '26px', minWidth: 'auto' }}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-auto p-3">
          {isLoading ? (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="skeleton h-[240px] rounded-xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-text-muted">
              <Package className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Mahsulot topilmadi</p>
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
              {products.map((product) => {
                const stockStatus = getStockStatus(product.stock, product.minStock);
                const unitLabel = UNIT_LABELS[product.unit] || product.unit;
                const hasImage = product.images && product.images.length > 0 && product.images[0];

                const d1Qty = Number(product.discount1Qty || 0);
                const d1Pct = Number(product.discount1Pct || 0);
                const d2Qty = Number(product.discount2Qty || 0);
                const d2Pct = Number(product.discount2Pct || 0);
                const d3Qty = Number(product.discount3Qty || 0);
                const d3Pct = Number(product.discount3Pct || 0);
                const hasDiscountTiers = d1Qty > 0 || d2Qty > 0 || d3Qty > 0;

                return (
                  <button
                    key={product.id}
                    onClick={() =>
                      handleAddProduct({
                        id: product.id,
                        name: product.name,
                        price: Number(product.price),
                        costPrice: Number(product.costPrice),
                        unit: product.unit,
                        stock: product.stock,
                      })
                    }
                    className={cn(
                      'group relative flex flex-col overflow-hidden rounded-xl bg-surface text-left transition-all duration-150',
                      'active:scale-[0.97]',
                      'hover:shadow-card-hover hover:-translate-y-0.5',
                      stockStatus === 'OUT_OF_STOCK' && 'opacity-40',
                    )}
                    style={{ border: '1px solid var(--color-border-subtle)' }}
                    aria-label={`${product.name} — ${formatCurrency(Number(product.price))}`}
                  >
                    {/* ── Image ── */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-tertiary/50">
                      {hasImage ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package className="h-10 w-10 text-text-muted/15" />
                        </div>
                      )}

                      {/* Stock badge — chap pastda (rasmdagidek) */}
                      <span className={cn(
                        'absolute bottom-2 left-2 rounded-md px-2 py-0.5 text-[11px] font-bold text-white shadow-sm',
                        stockStatus === 'IN_STOCK' && 'bg-success-600',
                        stockStatus === 'LOW_STOCK' && 'bg-warning-600',
                        stockStatus === 'OUT_OF_STOCK' && 'bg-danger-600',
                        stockStatus === 'NEGATIVE' && 'bg-danger-700',
                      )}>
                        {product.stock} {unitLabel}
                      </span>
                    </div>

                    {/* ── Content ── */}
                    <div className="flex flex-1 flex-col px-3 pt-2.5 pb-3">
                      {/* Name */}
                      <h3 className="text-[13px] font-semibold text-text-primary leading-snug line-clamp-2">
                        {product.name}
                      </h3>

                      {/* Category / subcategory */}
                      <p className="mt-0.5 text-[11px] text-text-muted truncate">
                        {product.category?.name || ''}{product.subCategory?.name ? ` / ${product.subCategory.name}` : ''}
                      </p>

                      {/* Price */}
                      <p className="mt-1.5 text-base font-bold text-primary-600 tabular-nums">
                        {formatCurrency(Number(product.price))}
                      </p>

                      {/* 3-tier discounts — rasmdagidek ro'yxat */}
                      {hasDiscountTiers && (
                        <div className="mt-1.5 space-y-0.5">
                          {d1Qty > 0 && (
                            <p className="text-[11px] text-success-600 tabular-nums">
                              {d1Pct}% chegirma {d1Qty}+ ta
                            </p>
                          )}
                          {d2Qty > 0 && (
                            <p className="text-[11px] text-warning-600 tabular-nums">
                              {d2Pct}% chegirma {d2Qty}+ ta
                            </p>
                          )}
                          {d3Qty > 0 && (
                            <p className="text-[11px] text-danger-600 tabular-nums">
                              {d3Pct}% chegirma {d3Qty}+ ta
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Right — Cart (desktop) ─── */}
      <div className="hidden w-[380px] sm:flex flex-col bg-surface" style={{ borderLeft: '1px solid var(--color-border-subtle)' }}>
        <CartPanel
          onPayment={() => setPaymentOpen(true)}
          onNumPad={(productId) => { setNumPadTarget(productId); setNumPadOpen(true); }}
        />
      </div>

      {/* Mobile cart FAB */}
      <button
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-dropdown sm:hidden transition-transform active:scale-95"
        onClick={() => setPaymentOpen(true)}
        aria-label="Savat"
      >
        <ShoppingCart className="h-6 w-6" />
        {itemCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-danger-600 text-[10px] font-bold">
            {itemCount}
          </span>
        )}
      </button>

      {/* Payment modal */}
      <PaymentModal open={paymentOpen} onClose={() => setPaymentOpen(false)} />

      {/* NumPad */}
      {numPadOpen && numPadTarget && (
        <NumPad
          onClose={() => { setNumPadOpen(false); setNumPadTarget(null); }}
          onSubmit={(value) => {
            if (numPadTarget) {
              useCartStore.getState().updateQuantity(numPadTarget, value);
            }
            setNumPadOpen(false);
            setNumPadTarget(null);
          }}
        />
      )}
    </div>
  );
}
