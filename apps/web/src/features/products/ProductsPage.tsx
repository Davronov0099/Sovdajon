import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Package, Archive, AlertTriangle, TrendingDown, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import { SearchInput } from '@/components/common/SearchInput';
import { useInfiniteProducts, useProductStats } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { ProductModal } from './ProductModal';
import { cn } from '@/lib/cn';

export function ProductsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const catScrollRef = useRef<HTMLDivElement>(null);
  const subScrollRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteProducts({
    search, categoryId, subCategoryId, stockStatus: stockFilter, limit: 2000,
  });
  const { data: statsData, isLoading: statsLoading } = useProductStats();
  const { data: catData } = useCategories();

  // Flatten all pages into one array
  const products = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
  const totalCount = data?.pages[0]?.pagination.total ?? 0;
  const stats = statsData?.data;
  const categories = catData?.data ?? [];

  // Infinite scroll — IntersectionObserver
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Selected category's subcategories
  const subCategories = useMemo(() => {
    if (!categoryId) return [];
    const cat = categories.find((c) => c.id === categoryId);
    return ((cat as Record<string, unknown>)?.subCategories as Array<{ id: string; name: string }>) ?? [];
  }, [categoryId, categories]);

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{t('nav.products')}</h1>
          <p className="text-sm text-text-muted mt-0.5">Mahsulot boshqaruvi</p>
        </div>
        <button onClick={() => { setEditId(null); setModalOpen(true); }} className="btn btn-primary btn-md">
          <Plus className="h-4 w-4" />
          {t('common.create')}
        </button>
      </div>

      {/* Stat Cards — rasmdagidek */}
      {/* Mini stat filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        {statsLoading ? (
          <>
            <div className="skeleton h-9 w-24 rounded-lg" />
            <div className="skeleton h-9 w-28 rounded-lg" />
            <div className="skeleton h-9 w-24 rounded-lg" />
            <div className="skeleton h-9 w-36 rounded-lg" />
          </>
        ) : stats ? (
          <>
            <button
              onClick={() => { setStockFilter(''); setPage(1); }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                !stockFilter ? 'bg-primary-600 text-white shadow-sm' : 'bg-surface text-text-secondary hover:bg-surface-secondary',
              )}
              style={stockFilter ? { border: '1px solid var(--color-border)' } : undefined}
            >
              <Package className="h-3.5 w-3.5" />
              Jami <span className="font-bold tabular-nums">{stats.total}</span>
            </button>
            <button
              onClick={() => { setStockFilter(stockFilter === 'LOW_STOCK' ? '' : 'LOW_STOCK'); setPage(1); }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                stockFilter === 'LOW_STOCK' ? 'bg-warning-600 text-white shadow-sm' : 'bg-surface text-text-secondary hover:bg-surface-secondary',
              )}
              style={stockFilter !== 'LOW_STOCK' ? { border: '1px solid var(--color-border)' } : undefined}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Kam qolgan <span className="font-bold tabular-nums">{stats.lowStock}</span>
            </button>
            <button
              onClick={() => { setStockFilter(stockFilter === 'OUT_OF_STOCK' ? '' : 'OUT_OF_STOCK'); setPage(1); }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                stockFilter === 'OUT_OF_STOCK' ? 'bg-danger-600 text-white shadow-sm' : 'bg-surface text-text-secondary hover:bg-surface-secondary',
              )}
              style={stockFilter !== 'OUT_OF_STOCK' ? { border: '1px solid var(--color-border)' } : undefined}
            >
              <TrendingDown className="h-3.5 w-3.5" />
              Tugagan <span className="font-bold tabular-nums">{stats.outOfStock}</span>
            </button>
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-sm text-text-muted" style={{ border: '1px solid var(--color-border)' }}>
              <Archive className="h-3.5 w-3.5 text-info-500" />
              Qiymat: <span className="font-bold text-text-primary tabular-nums">{formatCurrency(stats.totalValue)}</span>
            </div>
          </>
        ) : null}
      </div>

      {/* Search */}
      <div className="mb-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Mahsulot qidirish..."
          className="w-full"
        />
      </div>

      {/* Categories — arrow scroll */}
      <div className="relative mb-1">
        <button onClick={() => catScrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })} className="absolute left-0 top-0 z-10 flex h-full w-7 items-center justify-center bg-gradient-to-r from-surface-secondary to-transparent text-text-muted hover:text-text-primary" style={{ minHeight: 'auto', minWidth: 'auto' }} tabIndex={-1}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button onClick={() => catScrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })} className="absolute right-0 top-0 z-10 flex h-full w-7 items-center justify-center bg-gradient-to-l from-surface-secondary to-transparent text-text-muted hover:text-text-primary" style={{ minHeight: 'auto', minWidth: 'auto' }} tabIndex={-1}>
          <ChevronRight className="h-4 w-4" />
        </button>
        <div ref={catScrollRef} className="flex gap-1.5 px-8 py-1.5 overflow-x-auto no-scrollbar" onWheel={(e) => { if (catScrollRef.current && e.deltaY !== 0) { e.preventDefault(); catScrollRef.current.scrollBy({ left: e.deltaY * 2, behavior: 'auto' }); } }}>
          <button onClick={() => { setCategoryId(''); setSubCategoryId(''); setStockFilter(''); setPage(1); }} className={cn('shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all', !categoryId ? 'bg-sidebar text-white shadow-sm' : 'bg-surface-tertiary/70 text-text-secondary hover:bg-surface-tertiary')} style={{ minHeight: '32px', minWidth: 'auto' }}>
            Barchasi
          </button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => { setCategoryId(categoryId === cat.id ? '' : cat.id); setSubCategoryId(''); setPage(1); }} className={cn('shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all', categoryId === cat.id ? 'bg-sidebar text-white shadow-sm' : 'bg-surface-tertiary/70 text-text-secondary hover:bg-surface-tertiary')} style={{ minHeight: '32px', minWidth: 'auto' }}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-categories — arrow scroll */}
      {subCategories.length > 0 && (
        <div className="relative mb-3">
          <button onClick={() => subScrollRef.current?.scrollBy({ left: -150, behavior: 'smooth' })} className="absolute left-0 top-0 z-10 flex h-full w-6 items-center justify-center bg-gradient-to-r from-surface-secondary to-transparent text-text-muted hover:text-text-primary" style={{ minHeight: 'auto', minWidth: 'auto' }} tabIndex={-1}>
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button onClick={() => subScrollRef.current?.scrollBy({ left: 150, behavior: 'smooth' })} className="absolute right-0 top-0 z-10 flex h-full w-6 items-center justify-center bg-gradient-to-l from-surface-secondary to-transparent text-text-muted hover:text-text-primary" style={{ minHeight: 'auto', minWidth: 'auto' }} tabIndex={-1}>
            <ChevronRight className="h-3 w-3" />
          </button>
          <div ref={subScrollRef} className="flex gap-1.5 px-7 py-1 overflow-x-auto no-scrollbar" onWheel={(e) => { if (subScrollRef.current && e.deltaY !== 0) { e.preventDefault(); subScrollRef.current.scrollBy({ left: e.deltaY * 2, behavior: 'auto' }); } }}>
            <button onClick={() => { setSubCategoryId(''); setPage(1); }} className={cn('shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all', !subCategoryId ? 'bg-primary-100 text-primary-700' : 'bg-surface-tertiary/50 text-text-muted')} style={{ minHeight: '26px', minWidth: 'auto' }}>
              Barchasi
            </button>
            {subCategories.map((sub) => (
              <button key={sub.id} onClick={() => { setSubCategoryId(subCategoryId === sub.id ? '' : sub.id); setPage(1); }} className={cn('shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all', subCategoryId === sub.id ? 'bg-primary-100 text-primary-700' : 'bg-surface-tertiary/50 text-text-muted')} style={{ minHeight: '26px', minWidth: 'auto' }}>
                {sub.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product Grid */}
      <div>
        {isLoading ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton h-[240px] rounded-xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted">
            <Package className="mb-4 h-16 w-16 opacity-20" />
            <p className="text-base font-medium">{t('common.noData')}</p>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {products.map((product) => {
              const hasImage = product.images && product.images.length > 0 && product.images[0];
              const stockColor = product.stock === 0 ? 'bg-danger-600' : product.stock <= product.minStock ? 'bg-warning-600' : 'bg-success-600';

              return (
                <div
                  key={product.id}
                  className={cn(
                    'group relative flex flex-col overflow-hidden rounded-xl bg-surface cursor-pointer transition-all duration-150',
                    'hover:shadow-card-hover hover:-translate-y-0.5',
                    product.stock === 0 && 'opacity-50',
                  )}
                  style={{ border: '1px solid var(--color-border-subtle)' }}
                  onClick={() => { setEditId(product.id); setModalOpen(true); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && (setEditId(product.id), setModalOpen(true))}
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-tertiary/50">
                    {hasImage ? (
                      <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-10 w-10 text-text-muted/15" />
                      </div>
                    )}

                    {/* Stock badge */}
                    <span className={cn('absolute bottom-2 left-2 rounded-md px-2 py-0.5 text-[11px] font-bold text-white shadow-sm', stockColor)}>
                      {product.stock} ta
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col px-3 pt-2.5 pb-3">
                    <h3 className="text-[13px] font-semibold text-text-primary leading-snug line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-text-muted truncate">
                      {product.category?.name || ''}{product.subCategory?.name ? ` / ${product.subCategory.name}` : ''}
                    </p>
                    <p className="mt-1.5 text-base font-bold text-primary-600 tabular-nums">
                      {formatCurrency(Number(product.price))}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={loadMoreRef} className="flex items-center justify-center py-6">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Yuklanmoqda...
              </div>
            ) : hasNextPage ? (
              <p className="text-xs text-text-muted">{products.length} / {totalCount} ta ko'rsatilmoqda</p>
            ) : products.length > 0 ? (
              <p className="text-xs text-text-muted">Barcha {totalCount} ta mahsulot ko'rsatildi</p>
            ) : null}
          </div>
        )}
      </div>

      <ProductModal open={modalOpen} onClose={() => { setModalOpen(false); setEditId(null); }} productId={editId} />
    </div>
  );
}
