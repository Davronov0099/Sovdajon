import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { Search, ShoppingCart, Package, Loader2, X, ClipboardList, Check, Trash2 } from 'lucide-react';
import { formatCurrency, getStockStatus } from '@sardorbek/shared';
import { useInfiniteProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { useCartStore } from '@/stores/cart';
import { useUiStore } from '@/stores/ui';
import { useSound } from '@/hooks/useSound';
import { useToast } from '@/components/ui/toast';
import { Modal } from '@/components/ui/modal';
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

/* ─── Memoized product card — cart o'zgarganda qayta renderlanmaydi ─── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const POSProductCard = memo(function POSProductCard({ product, onClick }: { product: any; onClick: () => void }) {
  const stockStatus = getStockStatus(product.stock, product.minStock);
  const unitLabel = UNIT_LABELS[product.unit] || product.unit;
  const hasImage = product.images && product.images.length > 0 && product.images[0];
  const price = Number(product.price);

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl bg-surface text-left transition-all duration-150',
        'active:scale-[0.97]',
        'hover:shadow-card-hover hover:-translate-y-0.5',
        stockStatus === 'OUT_OF_STOCK' && 'opacity-40',
      )}
      style={{ border: '1px solid var(--color-border-subtle)', contentVisibility: 'auto', containIntrinsicSize: '0 280px' }}
      aria-label={`${product.name} — ${formatCurrency(price)}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-tertiary/50">
        {hasImage ? (
          <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center"><Package className="h-10 w-10 text-text-muted/15" /></div>
        )}
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
      <div className="flex flex-1 flex-col px-2 sm:px-3 pt-2 sm:pt-2.5 pb-2 sm:pb-3">
        <h3 className="text-[12px] sm:text-[13px] font-semibold text-text-primary leading-snug line-clamp-2">{product.name}</h3>
        <p className="mt-0.5 text-[10px] sm:text-[11px] text-text-muted truncate">
          {product.category?.name || ''}{product.subCategory?.name ? ` / ${product.subCategory.name}` : ''}
        </p>
        <p className="mt-1 sm:mt-1.5 text-sm sm:text-base font-bold text-primary-600 tabular-nums">{formatCurrency(price)}</p>
      </div>
    </button>
  );
});

export function POSPage() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [numPadOpen, setNumPadOpen] = useState(false);
  const [numPadTarget, setNumPadTarget] = useState<string | null>(null);
  const [numPadProduct, setNumPadProduct] = useState<{ id: string; name: string; price: number; costPrice: number; unit: string; stock: number } | null>(null);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const catScrollRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { play } = useSound();
  const { toast } = useToast();

  // Buyurtmalar
  const { data: ordersData } = useOrders({ status: 'PENDING' });
  const pendingOrders = ordersData?.data ?? [];
  const updateStatus = useUpdateOrderStatus();
  const addItem = useCartStore((s) => s.addItem);
  const setCustomer = useCartStore((s) => s.setCustomer);
  const clearCart = useCartStore((s) => s.clearCart);

  function loadOrderToCart(order: typeof pendingOrders[0]) {
    clearCart();
    for (const item of order.items) {
      addItem({
        productId: item.productId,
        name: item.product.name,
        price: Number(item.unitPrice),
        costPrice: 0,
        unit: 'PIECE',
        stock: 9999,
      });
      // Miqdorni to'g'rilash (addItem 1 qo'shadi, biz quantity-1 marta qo'shimcha)
      for (let i = 1; i < item.quantity; i++) {
        addItem({
          productId: item.productId,
          name: item.product.name,
          price: Number(item.unitPrice),
          costPrice: 0,
          unit: 'PIECE',
          stock: 9999,
        });
      }
    }
    if (order.customer) {
      setCustomer(order.customer.id, order.customer.name);
    }
    updateStatus.mutate({ id: order.id, status: 'CONFIRMED' }, {
      onSuccess: () => {
        toast(`Buyurtma #${order.number} savatga yuklandi`, 'success');
        setOrdersOpen(false);
      },
    });
  }

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteProducts({
    search,
    categoryId,
    subCategoryId,
    limit: 200,
  });
  const { data: catData } = useCategories();

  const products = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
  const categories = catData?.data ?? [];

  // Scroll bo'lgandagina keyingi sahifani yuklash
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '300px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const itemCount = useCartStore((s) => s.getItemCount());

  // Auto-collapse sidebar on POS (desktop only)
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  useEffect(() => {
    const isDesktop = window.innerWidth >= 640;
    if (isDesktop) {
      setSidebarOpen(false);
      return () => { setSidebarOpen(true); };
    }
  }, [setSidebarOpen]);

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

  const handleProductClick = useCallback(
    (product: { id: string; name: string; price: number; costPrice: number; unit: string; stock: number }) => {
      setNumPadProduct(product);
      setNumPadTarget(null);
      setNumPadOpen(true);
    },
    [],
  );

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] overflow-hidden">
      {/* ─── Left — Products ─── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-surface-secondary">
        {/* Search bar + Orders button */}
        <div className="bg-surface px-4 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div className="flex items-center gap-2">
          {pendingOrders.length > 0 && (
            <button
              onClick={() => setOrdersOpen(true)}
              className="relative shrink-0 flex items-center gap-1.5 rounded-xl bg-warning-50 px-3 py-2.5 text-[13px] font-semibold text-warning-700 hover:bg-warning-100 active:scale-[0.97] transition-all"
              style={{ minHeight: 'auto', minWidth: 'auto' }}
            >
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Buyurtmalar</span>
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-warning-600 px-1 text-[10px] font-bold text-white">
                {pendingOrders.length}
              </span>
            </button>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none z-10" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Mahsulot qidirish..."
              className="input pos-touch !bg-surface-secondary"
              style={{ paddingLeft: '40px' }}
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
            const subs = (selectedCat as unknown as Record<string, unknown>)?.subCategories as Array<{ id: string; name: string }> | undefined;
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
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
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {products.map((product) => (
                  <POSProductCard
                    key={product.id}
                    product={product}
                    onClick={() =>
                      handleProductClick({
                        id: product.id,
                        name: product.name,
                        price: Number(product.price),
                        costPrice: Number(product.costPrice),
                        unit: product.unit,
                        stock: product.stock,
                      })
                    }
                  />
                ))}
              </div>

              {/* Infinite scroll sentinel */}
              <div ref={loadMoreRef} className="flex items-center justify-center py-6">
                {isFetchingNextPage ? (
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Yuklanmoqda...
                  </div>
                ) : hasNextPage ? (
                  <div className="h-4" />
                ) : products.length > 0 ? (
                  <p className="text-xs text-text-muted">Barcha {products.length} ta mahsulot ko'rsatildi</p>
                ) : null}
              </div>
            </>
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
        onClick={() => setMobileCartOpen(true)}
        aria-label="Savat"
      >
        <ShoppingCart className="h-6 w-6" />
        {itemCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-danger-600 text-[10px] font-bold">
            {itemCount}
          </span>
        )}
      </button>

      {/* Mobile cart drawer */}
      {mobileCartOpen && (
        <div className="fixed inset-0 z-40 sm:hidden" data-no-swipe>
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileCartOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-[380px] animate-slide-in-right">
            {/* Close button */}
            <button
              onClick={() => setMobileCartOpen(false)}
              className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface-secondary/80 text-text-muted hover:bg-surface-tertiary hover:text-text-primary transition-colors backdrop-blur-sm"
              style={{ minHeight: 'auto', minWidth: 'auto' }}
            >
              <X className="h-4 w-4" />
            </button>
            <CartPanel
              onPayment={() => { setMobileCartOpen(false); setPaymentOpen(true); }}
              onNumPad={(productId) => { setNumPadTarget(productId); setNumPadOpen(true); }}
            />
          </div>
        </div>
      )}

      {/* Payment modal */}
      <PaymentModal open={paymentOpen} onClose={() => setPaymentOpen(false)} />

      {/* NumPad */}
      {numPadOpen && (
        <NumPad
          onClose={() => { setNumPadOpen(false); setNumPadTarget(null); setNumPadProduct(null); }}
          onSubmit={(value) => {
            if (numPadTarget) {
              useCartStore.getState().updateQuantity(numPadTarget, value);
            } else if (numPadProduct) {
              const store = useCartStore.getState();
              const existing = store.items.find((i) => i.productId === numPadProduct.id);
              if (existing) {
                store.updateQuantity(numPadProduct.id, existing.quantity + value);
              } else {
                store.addItem({
                  productId: numPadProduct.id,
                  name: numPadProduct.name,
                  price: numPadProduct.price,
                  costPrice: numPadProduct.costPrice,
                  unit: numPadProduct.unit,
                  stock: numPadProduct.stock,
                });
                if (value > 1) {
                  store.updateQuantity(numPadProduct.id, value);
                }
              }
              play('add-to-cart');
            }
            setNumPadOpen(false);
            setNumPadTarget(null);
            setNumPadProduct(null);
          }}
        />
      )}

      {/* Orders modal */}
      <Modal open={ordersOpen} onClose={() => setOrdersOpen(false)} title={`Buyurtmalar (${pendingOrders.length})`} size="md">
        {pendingOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-text-muted">
            <ClipboardList className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-sm">Kutilayotgan buyurtma yo'q</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingOrders.map((order) => (
              <div key={order.id} className="rounded-xl p-3" style={{ border: '1px solid var(--color-border-subtle)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-bold text-text-primary">#{order.number}</span>
                    {order.customer && (
                      <span className="ml-2 text-xs text-text-muted">{order.customer.name}</span>
                    )}
                  </div>
                  <span className="text-base font-bold text-primary-600 tabular-nums">{formatCurrency(Number(order.total))}</span>
                </div>
                <div className="space-y-1 mb-2.5">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-[12px]">
                      <span className="text-text-secondary truncate flex-1 mr-2">{item.product.name}</span>
                      <span className="text-text-muted tabular-nums shrink-0">{item.quantity} × {formatCurrency(Number(item.unitPrice))}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[11px] text-text-muted mb-2.5">
                  <span>{order.createdBy?.name ?? 'Noma\'lum'}</span>
                  <span>{new Date(order.createdAt).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadOrderToCart(order)}
                    disabled={updateStatus.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-success-600 py-2 text-[13px] font-semibold text-white hover:bg-success-700 active:scale-[0.97] transition-all"
                    style={{ minHeight: 'auto' }}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Savatga yuklash
                  </button>
                  <button
                    onClick={() => updateStatus.mutate({ id: order.id, status: 'CANCELLED' }, {
                      onSuccess: () => toast(`Buyurtma #${order.number} bekor qilindi`, 'success'),
                    })}
                    disabled={updateStatus.isPending}
                    className="flex items-center justify-center rounded-lg bg-danger-50 px-3 py-2 text-danger-600 hover:bg-danger-100 transition-colors"
                    style={{ minHeight: 'auto', minWidth: 'auto' }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
