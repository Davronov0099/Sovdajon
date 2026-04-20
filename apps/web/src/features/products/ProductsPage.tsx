import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Package, Archive, AlertTriangle, TrendingDown, Tag, ChevronLeft, ChevronRight, Loader2, QrCode, Pencil, Trash2, CheckSquare, Square, X, Pencil as PencilIcon } from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import { SearchInput } from '@/components/common/SearchInput';
import { useInfiniteProducts, useProductStats, useDeleteProduct } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { ProductModal } from './ProductModal';
import { BulkEditModal } from './BulkEditModal';
import { cn } from '@/lib/cn';

/* ─── Product Card (memoized) ─── */
interface ProductCardProps {
  product: {
    id: string;
    code: number | null;
    name: string;
    price: string;
    stock: number;
    minStock: number;
    unit: string;
    images: string[];
    category: { id: string; name: string } | null;
    subCategory: { id: string; name: string } | null;
  };
  selectionMode: boolean;
  selected: boolean;
  onEdit: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onQr: (p: { name: string; id: string; price: string; code: number | null }) => void;
  onDelete: (id: string, name: string) => void;
}

const ProductCard = memo(function ProductCard({ product, selectionMode, selected, onEdit, onToggleSelect, onQr, onDelete }: ProductCardProps) {
  const hasImage = product.images && product.images.length > 0 && product.images[0];
  const stockColor = product.stock === 0 ? 'bg-danger-600' : product.stock <= product.minStock ? 'bg-warning-600' : 'bg-success-600';
  const priceNum = Number(product.price);
  const noPrice = !Number.isFinite(priceNum) || priceNum <= 0;

  const handleClick = () => {
    if (selectionMode) onToggleSelect(product.id);
    else onEdit(product.id);
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl bg-surface cursor-pointer transition-all duration-150',
        'hover:shadow-card-hover hover:-translate-y-0.5',
        product.stock === 0 && 'opacity-50',
        selected && 'ring-2 ring-primary-500 ring-offset-1',
      )}
      style={{ border: '1px solid var(--color-border-subtle)', contentVisibility: 'auto', containIntrinsicSize: '0 280px' }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      {selectionMode && (
        <div className="absolute top-2 right-2 z-10 rounded-md bg-white/90 p-0.5 shadow-sm">
          {selected ? (
            <CheckSquare className="h-5 w-5 text-primary-600" />
          ) : (
            <Square className="h-5 w-5 text-text-muted" />
          )}
        </div>
      )}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-tertiary/50">
        {hasImage ? (
          <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-10 w-10 text-text-muted/15" />
          </div>
        )}
        {product.code != null && (
          <span className="absolute top-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-bold text-white tabular-nums shadow-sm">
            #{product.code}
          </span>
        )}
        <span className={cn('absolute bottom-2 left-2 rounded-md px-2 py-0.5 text-[11px] font-bold text-white shadow-sm', stockColor)}>
          {product.stock} ta
        </span>
      </div>

      <div className="flex flex-1 flex-col px-2 sm:px-3 pt-2 pb-2">
        <h3 className="text-[12px] sm:text-[13px] font-semibold text-text-primary leading-snug line-clamp-2">
          {product.name}
        </h3>
        <p className="mt-0.5 text-[10px] sm:text-[11px] text-text-muted truncate">
          {product.category?.name || ''}{product.subCategory?.name ? ` / ${product.subCategory.name}` : ''}
        </p>
        {noPrice ? (
          <p className="mt-1 inline-flex w-fit items-center gap-1 rounded-md bg-warning-50 px-1.5 py-0.5 text-[11px] sm:text-xs font-semibold text-warning-700">
            <Tag className="h-3 w-3" />
            Narxsiz
          </p>
        ) : (
          <p className="mt-1 text-sm sm:text-base font-bold text-primary-600 tabular-nums">
            {formatCurrency(priceNum)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 px-2 pb-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onQr({ name: product.name, id: product.id, price: product.price, code: product.code })}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-surface-tertiary hover:text-text-primary transition-colors"
          style={{ minHeight: 'auto', minWidth: 'auto' }}
          title="QR code"
        >
          <QrCode className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onEdit(product.id)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-primary-50 hover:text-primary-600 transition-colors"
          style={{ minHeight: 'auto', minWidth: 'auto' }}
          title="Tahrirlash"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(product.id, product.name)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-danger-50 hover:text-danger-600 transition-colors"
          style={{ minHeight: 'auto', minWidth: 'auto' }}
          title="O'chirish"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
});

/* ─── Main Page ─── */

export function ProductsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Record<string, unknown> | null>(null);
  const [qrProduct, setQrProduct] = useState<{ name: string; id: string; price: string; code: number | null } | null>(null);
  const catScrollRef = useRef<HTMLDivElement>(null);
  const subScrollRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteProducts({
    search, categoryId, subCategoryId, stockStatus: stockFilter, priceStatus: priceFilter, limit: 200,
  });
  const { data: statsData, isLoading: statsLoading } = useProductStats();
  const { data: catData } = useCategories();
  const deleteMut = useDeleteProduct();

  const products = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
  const totalCount = data?.pages[0]?.pagination.total ?? 0;
  const stats = statsData?.data;
  const categories = catData?.data ?? [];

  // Scroll bo'lgandagina keyingi sahifani yuklash (IntersectionObserver)
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

  const subCategories = useMemo(() => {
    if (!categoryId) return [];
    const cat = categories.find((c) => c.id === categoryId);
    return ((cat as Record<string, unknown>)?.subCategories as Array<{ id: string; name: string }>) ?? [];
  }, [categoryId, categories]);

  // Stable callbacks — card qayta renderlanmaydi
  const productsRef = useRef(products);
  productsRef.current = products;

  const handleEdit = useCallback((id: string) => {
    const p = productsRef.current.find((x) => x.id === id);
    setEditProduct(p ? (p as unknown as Record<string, unknown>) : null);
    setModalOpen(true);
  }, []);

  const handleQr = useCallback((p: { name: string; id: string; price: string; code: number | null }) => {
    setQrProduct(p);
  }, []);

  const handleDelete = useCallback((id: string, name: string) => {
    if (confirm(`"${name}" ni o'chirmoqchimisiz?`)) {
      deleteMut.mutate(id);
    }
  }, [deleteMut]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAllVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const p of productsRef.current) next.add(p.id);
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{t('nav.products')}</h1>
          <p className="text-sm text-text-muted mt-0.5">Mahsulot boshqaruvi</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all',
              selectionMode ? 'bg-primary-600 text-white shadow-sm' : 'bg-surface text-text-secondary hover:bg-surface-secondary',
            )}
            style={!selectionMode ? { border: '1px solid var(--color-border)' } : undefined}
            title={selectionMode ? "Chiqish" : "Tanlash rejimi"}
          >
            {selectionMode ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
            {selectionMode ? 'Chiqish' : 'Tanlash'}
          </button>
          <button onClick={() => { setEditProduct(null); setModalOpen(true); }} className="btn btn-primary btn-md">
            <Plus className="h-4 w-4" />
            {t('common.create')}
          </button>
        </div>
      </div>

      {/* Selection action bar */}
      {selectionMode && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-primary-50 px-3 py-2" style={{ border: '1px solid var(--color-primary-200, #c7d2fe)' }}>
          <span className="text-sm font-semibold text-primary-700">
            {selectedIds.size} ta tanlandi
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <button
              onClick={handleSelectAllVisible}
              className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface-secondary"
              style={{ border: '1px solid var(--color-border)', minHeight: 'auto' }}
            >
              <CheckSquare className="h-3 w-3" />
              Ko'ringanlarini belgilash
            </button>
            <button
              onClick={handleClearSelection}
              disabled={selectedIds.size === 0}
              className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface-secondary disabled:opacity-40"
              style={{ border: '1px solid var(--color-border)', minHeight: 'auto' }}
            >
              <Square className="h-3 w-3" />
              Tozalash
            </button>
            <button
              onClick={() => setBulkOpen(true)}
              disabled={selectedIds.size === 0}
              className="inline-flex items-center gap-1 rounded-md bg-primary-600 px-3 py-1 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-40"
              style={{ minHeight: 'auto' }}
            >
              <PencilIcon className="h-3 w-3" />
              Birga tahrirlash
            </button>
          </div>
        </div>
      )}

      {/* Stat filters */}
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
              onClick={() => { setStockFilter(''); setPriceFilter(''); }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                !stockFilter && !priceFilter ? 'bg-primary-600 text-white shadow-sm' : 'bg-surface text-text-secondary hover:bg-surface-secondary',
              )}
              style={stockFilter || priceFilter ? { border: '1px solid var(--color-border)' } : undefined}
            >
              <Package className="h-3.5 w-3.5" />
              Jami <span className="font-bold tabular-nums">{stats.total}</span>
            </button>
            <button
              onClick={() => setStockFilter(stockFilter === 'LOW_STOCK' ? '' : 'LOW_STOCK')}
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
              onClick={() => setStockFilter(stockFilter === 'OUT_OF_STOCK' ? '' : 'OUT_OF_STOCK')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                stockFilter === 'OUT_OF_STOCK' ? 'bg-danger-600 text-white shadow-sm' : 'bg-surface text-text-secondary hover:bg-surface-secondary',
              )}
              style={stockFilter !== 'OUT_OF_STOCK' ? { border: '1px solid var(--color-border)' } : undefined}
            >
              <TrendingDown className="h-3.5 w-3.5" />
              Tugagan <span className="font-bold tabular-nums">{stats.outOfStock}</span>
            </button>
            <button
              onClick={() => setPriceFilter(priceFilter === 'NO_PRICE' ? '' : 'NO_PRICE')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                priceFilter === 'NO_PRICE' ? 'bg-warning-600 text-white shadow-sm' : 'bg-surface text-text-secondary hover:bg-surface-secondary',
              )}
              style={priceFilter !== 'NO_PRICE' ? { border: '1px solid var(--color-border)' } : undefined}
            >
              <Tag className="h-3.5 w-3.5" />
              Narxsiz <span className="font-bold tabular-nums">{stats.noPrice ?? 0}</span>
            </button>
            <button
              onClick={() => setPriceFilter(priceFilter === 'WITH_PRICE' ? '' : 'WITH_PRICE')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                priceFilter === 'WITH_PRICE' ? 'bg-success-600 text-white shadow-sm' : 'bg-surface text-text-secondary hover:bg-surface-secondary',
              )}
              style={priceFilter !== 'WITH_PRICE' ? { border: '1px solid var(--color-border)' } : undefined}
            >
              <Tag className="h-3.5 w-3.5" />
              Narxli <span className="font-bold tabular-nums">{(stats.total ?? 0) - (stats.noPrice ?? 0)}</span>
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
        <SearchInput value={search} onChange={setSearch} placeholder="Mahsulot qidirish..." className="w-full" />
      </div>

      {/* Categories */}
      <div className="relative mb-1">
        <button onClick={() => catScrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })} className="absolute left-0 top-0 z-10 flex h-full w-7 items-center justify-center bg-gradient-to-r from-surface-secondary to-transparent text-text-muted hover:text-text-primary" style={{ minHeight: 'auto', minWidth: 'auto' }} tabIndex={-1}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button onClick={() => catScrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })} className="absolute right-0 top-0 z-10 flex h-full w-7 items-center justify-center bg-gradient-to-l from-surface-secondary to-transparent text-text-muted hover:text-text-primary" style={{ minHeight: 'auto', minWidth: 'auto' }} tabIndex={-1}>
          <ChevronRight className="h-4 w-4" />
        </button>
        <div ref={catScrollRef} className="flex gap-1.5 px-8 py-1.5 overflow-x-auto no-scrollbar" onWheel={(e) => { if (catScrollRef.current && e.deltaY !== 0) { e.preventDefault(); catScrollRef.current.scrollBy({ left: e.deltaY * 2, behavior: 'auto' }); } }}>
          <button onClick={() => { setCategoryId(''); setSubCategoryId(''); setStockFilter(''); setPriceFilter(''); }} className={cn('shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all', !categoryId ? 'bg-sidebar text-white shadow-sm' : 'bg-surface-tertiary/70 text-text-secondary hover:bg-surface-tertiary')} style={{ minHeight: '32px', minWidth: 'auto' }}>
            Barchasi
          </button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => { setCategoryId(categoryId === cat.id ? '' : cat.id); setSubCategoryId(''); }} className={cn('shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all', categoryId === cat.id ? 'bg-sidebar text-white shadow-sm' : 'bg-surface-tertiary/70 text-text-secondary hover:bg-surface-tertiary')} style={{ minHeight: '32px', minWidth: 'auto' }}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-categories */}
      {subCategories.length > 0 && (
        <div className="relative mb-3">
          <button onClick={() => subScrollRef.current?.scrollBy({ left: -150, behavior: 'smooth' })} className="absolute left-0 top-0 z-10 flex h-full w-6 items-center justify-center bg-gradient-to-r from-surface-secondary to-transparent text-text-muted hover:text-text-primary" style={{ minHeight: 'auto', minWidth: 'auto' }} tabIndex={-1}>
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button onClick={() => subScrollRef.current?.scrollBy({ left: 150, behavior: 'smooth' })} className="absolute right-0 top-0 z-10 flex h-full w-6 items-center justify-center bg-gradient-to-l from-surface-secondary to-transparent text-text-muted hover:text-text-primary" style={{ minHeight: 'auto', minWidth: 'auto' }} tabIndex={-1}>
            <ChevronRight className="h-3 w-3" />
          </button>
          <div ref={subScrollRef} className="flex gap-1.5 px-7 py-1 overflow-x-auto no-scrollbar" onWheel={(e) => { if (subScrollRef.current && e.deltaY !== 0) { e.preventDefault(); subScrollRef.current.scrollBy({ left: e.deltaY * 2, behavior: 'auto' }); } }}>
            <button onClick={() => setSubCategoryId('')} className={cn('shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all', !subCategoryId ? 'bg-primary-100 text-primary-700' : 'bg-surface-tertiary/50 text-text-muted')} style={{ minHeight: '26px', minWidth: 'auto' }}>
              Barchasi
            </button>
            {subCategories.map((sub) => (
              <button key={sub.id} onClick={() => setSubCategoryId(subCategoryId === sub.id ? '' : sub.id)} className={cn('shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all', subCategoryId === sub.id ? 'bg-primary-100 text-primary-700' : 'bg-surface-tertiary/50 text-text-muted')} style={{ minHeight: '26px', minWidth: 'auto' }}>
                {sub.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product Grid */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
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
          <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                selectionMode={selectionMode}
                selected={selectedIds.has(product.id)}
                onEdit={handleEdit}
                onToggleSelect={handleToggleSelect}
                onQr={handleQr}
                onDelete={handleDelete}
              />
            ))}
          </div>

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
          </>
        )}
      </div>

      {/* Modals — grid dan tashqarida, qayta render qilmaydi */}
      <ProductModal open={modalOpen} onClose={() => { setModalOpen(false); setEditProduct(null); }} product={editProduct as import('./ProductModal').ProductData | null} />

      <BulkEditModal
        open={bulkOpen}
        selectedIds={Array.from(selectedIds)}
        onClose={() => setBulkOpen(false)}
        onApplied={exitSelectionMode}
      />

      {qrProduct && (() => {
        const priceText = formatCurrency(Number(qrProduct.price));
        // Narx uzunligiga qarab font-size — sig'gancha katta
        const priceLen = priceText.length;
        const priceFontPreview = priceLen > 12 ? 'text-[26px]' : priceLen > 9 ? 'text-[30px]' : 'text-[36px]';
        const priceFontPrint = priceLen > 12 ? '24px' : priceLen > 9 ? '28px' : '34px';
        // Nom uzunligiga qarab font-size
        const nameLen = qrProduct.name.length;
        const nameFontPrint = nameLen > 30 ? '8px' : nameLen > 20 ? '10px' : '12px';
        const nameFontPreview = nameLen > 30 ? 'text-[10px]' : nameLen > 20 ? 'text-[12px]' : 'text-[14px]';

        function doPrint() {
          const win = window.open('', '_blank');
          if (!win) return;
          const code = qrProduct!.code != null ? `<p style="font-size:10px;font-weight:bold;color:#333;margin:0 0 0.5mm 0">#${qrProduct!.code}</p>` : '';
          win.document.write(`<html><head><style>
            @page{size:60mm 40mm;margin:0}
            *{margin:0;padding:0;box-sizing:border-box}
            body{font-family:Arial,Helvetica,sans-serif;width:60mm;height:40mm;background:#e8f540;padding:1.5mm 2mm;display:flex;flex-direction:column}
            .top{display:flex;align-items:flex-start;gap:2mm;flex-shrink:0}
            .qr{width:13mm;height:13mm;background:#fff;padding:0.5mm;border-radius:1mm;flex-shrink:0}
            .qr img{width:100%;height:100%}
            .info{flex:1;min-width:0;overflow:hidden}
            .name{font-size:${nameFontPrint};font-weight:700;color:#111;line-height:1.2;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
            .bottom{flex:1;display:flex;align-items:center;justify-content:center;border-top:1.5px dashed #555;margin-top:1mm}
            .price{font-size:${priceFontPrint};font-weight:900;color:#111;letter-spacing:-0.5px}
          </style></head><body>
            <div class="top">
              <div class="qr"><img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(String(qrProduct!.code ?? qrProduct!.id))}"/></div>
              <div class="info">${code}<p class="name">${qrProduct!.name}</p></div>
            </div>
            <div class="bottom"><p class="price">${priceText}</p></div>
            <script>
              const img=document.querySelector('.qr img');
              if(img.complete){setTimeout(()=>{window.print();window.close()},200)}
              else{img.onload=()=>{window.print();window.close()}}
            <\/script>
          </body></html>`);
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setQrProduct(null)} data-no-swipe>
            <div className="absolute inset-0 bg-black/40 animate-fade-in" />
            <div className="relative z-10 bg-surface rounded-2xl p-5 shadow-modal max-w-[340px] w-full mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
              {/* Preview */}
              <div className="bg-[#e8f540] rounded-xl p-3 mb-4" style={{ border: '2px solid #333' }}>
                <div className="flex items-start gap-2.5 mb-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(String(qrProduct.code ?? qrProduct.id))}`}
                    alt="QR"
                    className="w-[56px] h-[56px] rounded shrink-0"
                    style={{ background: '#fff', padding: '2px' }}
                  />
                  <div className="min-w-0 flex-1">
                    {qrProduct.code != null && (
                      <p className="text-[10px] font-bold text-gray-600 tabular-nums">#{qrProduct.code}</p>
                    )}
                    <p className={`${nameFontPreview} font-bold text-gray-900 leading-tight line-clamp-2`}>{qrProduct.name}</p>
                  </div>
                </div>
                <div className="text-center" style={{ borderTop: '1.5px dashed #555', paddingTop: '6px' }}>
                  <p className={`${priceFontPreview} font-black text-gray-900 tabular-nums leading-none tracking-tight`}>
                    {priceText}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={doPrint} className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors" style={{ minHeight: 'auto' }}>
                  Chop etish
                </button>
                <button onClick={() => setQrProduct(null)} className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold text-text-secondary hover:bg-surface-secondary transition-colors" style={{ minHeight: 'auto', border: '1px solid var(--color-border)' }}>
                  Yopish
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
