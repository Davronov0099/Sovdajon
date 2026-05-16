import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Eye, EyeOff, DollarSign, ToggleLeft, ToggleRight,
  Clock, Check, XCircle, ChevronDown, Image, Trash2, ExternalLink,
} from 'lucide-react';
import { api } from '@/services/api';
import { formatCurrency } from '@sardorbek/shared';
const toast = {
  success: (msg: string) => console.log('[ok]', msg),
  error: (msg: string) => console.error('[err]', msg),
};

type TabId = 'products' | 'banners' | 'orders';

interface ProductItem {
  id: string; name: string; price: string;
  isMarketplaceVisible: boolean; showPrice: boolean;
  images: string[];
  category: { name: string };
}
interface OrderItem { id: number; productName: string; quantity: number; totalUzs: string }
interface Order {
  id: number; customerName: string; customerPhone: string;
  address?: string; notes?: string; status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  totalUzs: string; createdAt: string; items: OrderItem[];
}

export function MarketplaceSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('products');

  const ordersQuery = useQuery({
    queryKey: ['admin-mp-orders'],
    queryFn: () => api.get('marketplace/admin/orders').json<{ success: boolean; data: Order[] }>(),
    enabled: activeTab === 'orders',
  });
  const pendingCount = ordersQuery.data?.data.filter((o) => o.status === 'PENDING').length ?? 0;

  return (
    <div className="page-enter">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Marketplace</h1>
          <p className="text-sm text-sidebar-text mt-0.5">Mahsulotlar, reklama va buyurtmalarni boshqarish</p>
        </div>
        <a
          href="/marketplace"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 bg-primary-500/20 text-primary-300 text-sm font-medium rounded-lg hover:bg-primary-500/30 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Marketplaceni ko'rish
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-sidebar rounded-lg mb-6 w-fit">
        {([
          { id: 'products' as TabId, label: 'Mahsulotlar' },
          { id: 'banners' as TabId, label: 'Reklama' },
          { id: 'orders' as TabId, label: `Buyurtmalar${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'text-sidebar-text hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="page-body">
        {activeTab === 'products' && <ProductsTab />}
        {activeTab === 'banners' && <BannersTab />}
        {activeTab === 'orders' && <OrdersTab />}
      </div>
    </div>
  );
}

// ==================== PRODUCTS TAB ====================
function ProductsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const productsQuery = useQuery({
    queryKey: ['admin-mp-products'],
    queryFn: () =>
      api.get('products', { searchParams: { limit: 2000 } })
        .json<{ success: boolean; data: ProductItem[]; pagination: unknown }>(),
  });

  const products = productsQuery.data?.data ?? [];
  const filtered = search
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  const toggleVisibility = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) =>
      api.patch(`products/${id}`, { json: { isMarketplaceVisible: val } }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-mp-products'] }); toast.success('Yangilandi'); },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const toggleShowPrice = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) =>
      api.patch(`products/${id}`, { json: { showPrice: val } }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-mp-products'] }); toast.success('Yangilandi'); },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const visibleCount = products.filter((p) => p.isMarketplaceVisible).length;

  return (
    <div>
      {/* Search + stats */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Mahsulot qidirish..."
            className="w-full pl-3 pr-8 py-2 bg-sidebar border border-sidebar-border rounded-lg text-sm text-white placeholder-sidebar-text outline-none focus:border-primary-500 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sidebar-text hover:text-white">
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <span className="text-xs text-sidebar-text whitespace-nowrap">{visibleCount} / {products.length} ko'rinadi</span>
      </div>

      {/* Table */}
      <div className="bg-sidebar rounded-xl border border-sidebar-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sidebar-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-sidebar-text uppercase tracking-wider">Mahsulot</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-sidebar-text uppercase tracking-wider">Guruh</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-sidebar-text uppercase tracking-wider">Narx</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-sidebar-text uppercase tracking-wider">Ko'rinsin</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-sidebar-text uppercase tracking-wider">Narx ko'rsatilsin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sidebar-border">
              {productsQuery.isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 bg-sidebar-hover rounded w-3/4" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-sidebar-hover rounded w-20" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-sidebar-hover rounded w-24" /></td>
                    <td className="px-4 py-3 text-center"><div className="h-8 w-8 bg-sidebar-hover rounded-lg mx-auto" /></td>
                    <td className="px-4 py-3 text-center"><div className="h-8 w-8 bg-sidebar-hover rounded-lg mx-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-sidebar-text">Mahsulot topilmadi</td>
                </tr>
              ) : (
                filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-sidebar-hover/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-sidebar-hover rounded-lg overflow-hidden shrink-0">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Image className="w-4 h-4 text-sidebar-text" />
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-white">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-sidebar-hover text-sidebar-text text-xs rounded-full">{product.category.name}</span>
                    </td>
                    <td className="px-4 py-3 text-sidebar-text">{formatCurrency(Number(product.price))}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleVisibility.mutate({ id: product.id, val: !product.isMarketplaceVisible })}
                        className={`p-2 rounded-lg transition-colors ${
                          product.isMarketplaceVisible ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-sidebar-hover text-sidebar-text hover:bg-sidebar-active'
                        }`}
                      >
                        {product.isMarketplaceVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleShowPrice.mutate({ id: product.id, val: !product.showPrice })}
                        className={`p-2 rounded-lg transition-colors ${
                          product.showPrice ? 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30' : 'bg-sidebar-hover text-sidebar-text hover:bg-sidebar-active'
                        }`}
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk actions */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={async () => {
            const toShow = products.filter((p) => !p.isMarketplaceVisible);
            for (const p of toShow) await toggleVisibility.mutateAsync({ id: p.id, val: true });
          }}
          className="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1.5"
        >
          <ToggleRight className="w-3.5 h-3.5" />
          Barchasini ko'rsatish
        </button>
        <button
          onClick={async () => {
            const toHide = products.filter((p) => p.isMarketplaceVisible);
            for (const p of toHide) await toggleVisibility.mutateAsync({ id: p.id, val: false });
          }}
          className="px-3 py-1.5 bg-sidebar-hover text-sidebar-text text-xs font-medium rounded-lg hover:bg-sidebar-active transition-colors flex items-center gap-1.5"
        >
          <ToggleLeft className="w-3.5 h-3.5" />
          Barchasini yashirish
        </button>
      </div>
    </div>
  );
}

// ==================== BANNERS TAB ====================
const BANNER_FILES = ['reklama.webp', 'reklama1.webp', 'reklama2.webp', 'reklama3.webp'];

function BannersTab() {
  const qc = useQueryClient();
  const [selectingBanner, setSelectingBanner] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');

  const bannerLinksQuery = useQuery({
    queryKey: ['admin-mp-banner-links'],
    queryFn: () =>
      api.get('marketplace/banner-links').json<{ success: boolean; data: Record<string, string> }>(),
  });

  const productsQuery = useQuery({
    queryKey: ['admin-mp-products-for-banners'],
    queryFn: () =>
      api.get('products', { searchParams: { limit: 2000 } })
        .json<{ success: boolean; data: ProductItem[] }>(),
    enabled: selectingBanner !== null,
  });

  const setBannerLink = useMutation({
    mutationFn: (data: { bannerName: string; productId: string | null }) =>
      api.put('marketplace/admin/banner-links', { json: data }).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-mp-banner-links'] });
      setSelectingBanner(null);
      setProductSearch('');
      toast.success('Banner yangilandi');
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const bannerLinks = bannerLinksQuery.data?.data ?? {};
  const allProducts = productsQuery.data?.data ?? [];
  const filteredProducts = productSearch
    ? allProducts.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : allProducts;

  function getLinkedName(name: string) {
    const pid = bannerLinks[name];
    if (!pid) return undefined;
    return allProducts.find((p) => p.id === pid)?.name ?? `#${pid}`;
  }

  return (
    <div>
      <p className="text-sm text-sidebar-text mb-4">
        Har bir bannerga mahsulot biriktirsangiz, foydalanuvchi bosganda o'sha mahsulotga o'tadi.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {BANNER_FILES.map((name, i) => {
          const linkedName = getLinkedName(name);
          const linkedId = bannerLinks[name];

          return (
            <div key={name} className="bg-sidebar border border-sidebar-border rounded-xl overflow-hidden">
              <div className="aspect-[16/7] bg-sidebar-hover relative">
                <img src={`/${name}`} alt={`Banner ${i + 1}`} className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <div className="px-3 py-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-sidebar-text" />
                  <span className="text-xs text-white font-medium">Banner {i + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  {linkedId ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs text-emerald-400 font-medium truncate flex-1">{linkedName}</span>
                      <button onClick={() => setBannerLink.mutate({ bannerName: name, productId: null })}
                        className="text-red-400 hover:text-red-300 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-sidebar-text flex-1">Mahsulot biriktirilmagan</span>
                  )}
                  <button onClick={() => setSelectingBanner(name)}
                    className="text-xs text-primary-400 font-medium hover:text-primary-300 shrink-0">
                    {linkedId ? "O'zgartirish" : 'Mahsulot tanlash'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <p className="text-xs text-amber-400">
          Tavsiya: Banner rasmlarini <code className="bg-amber-500/20 px-1 rounded">apps/web/public/</code> papkasiga qo'ying (reklama.webp, reklama1.webp, reklama2.webp, reklama3.webp).
        </p>
      </div>

      {/* Product selection modal */}
      {selectingBanner && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={() => { setSelectingBanner(null); setProductSearch(''); }}>
          <div className="bg-sidebar border border-sidebar-border rounded-xl shadow-2xl w-full sm:w-[500px] max-h-[80vh] mx-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-sidebar-border flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-white text-sm">Mahsulot tanlash — Banner {BANNER_FILES.indexOf(selectingBanner) + 1}</h3>
              <button onClick={() => { setSelectingBanner(null); setProductSearch(''); }} className="text-sidebar-text hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 py-2 border-b border-sidebar-border shrink-0">
              <input
                type="text" placeholder="Mahsulot qidirish..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} autoFocus
                className="w-full px-3 py-2 bg-sidebar-hover border border-sidebar-border rounded-lg text-sm text-white placeholder-sidebar-text outline-none focus:border-primary-500"
              />
            </div>
            <div className="overflow-y-auto flex-1">
              {productsQuery.isLoading ? (
                <div className="p-4 text-center text-sm text-sidebar-text">Yuklanmoqda...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-sm text-sidebar-text">Topilmadi</div>
              ) : (
                filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setBannerLink.mutate({ bannerName: selectingBanner, productId: product.id })}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-sidebar-hover transition-colors text-left border-b border-sidebar-border/50"
                  >
                    <div className="w-10 h-10 bg-sidebar-hover rounded-lg overflow-hidden shrink-0">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-4 h-4 text-sidebar-text" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{product.name}</p>
                      <p className="text-xs text-sidebar-text">{product.category.name}</p>
                    </div>
                    <span className="text-xs text-sidebar-text shrink-0">{formatCurrency(Number(product.price))}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== ORDERS TAB ====================
function OrdersTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  const ordersQuery = useQuery({
    queryKey: ['admin-mp-orders'],
    queryFn: () => api.get('marketplace/admin/orders').json<{ success: boolean; data: Order[] }>(),
  });

  const updateStatus = useMutation({
    mutationFn: (data: { id: number; status: 'CONFIRMED' | 'CANCELLED' }) =>
      api.patch(`marketplace/admin/orders/${data.id}/status`, { json: { status: data.status } }).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-mp-orders'] });
      toast.success('Status yangilandi');
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  });

  const orders = ordersQuery.data?.data ?? [];
  const filtered = statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter);

  const statusConfig = {
    PENDING: { label: 'Kutilmoqda', color: 'bg-amber-500/20 text-amber-400', icon: Clock },
    CONFIRMED: { label: 'Tasdiqlangan', color: 'bg-emerald-500/20 text-emerald-400', icon: Check },
    CANCELLED: { label: 'Bekor qilingan', color: 'bg-red-500/20 text-red-400', icon: XCircle },
  };

  const counts = {
    all: orders.length,
    PENDING: orders.filter((o) => o.status === 'PENDING').length,
    CONFIRMED: orders.filter((o) => o.status === 'CONFIRMED').length,
    CANCELLED: orders.filter((o) => o.status === 'CANCELLED').length,
  };

  return (
    <div>
      {/* Filter pills */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {([
          { id: 'all', label: 'Barchasi' },
          { id: 'PENDING', label: 'Kutilmoqda' },
          { id: 'CONFIRMED', label: 'Tasdiqlangan' },
          { id: 'CANCELLED', label: 'Bekor qilingan' },
        ]).map((f) => (
          <button key={f.id} onClick={() => setStatusFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === f.id ? 'bg-primary-600 text-white' : 'bg-sidebar-hover text-sidebar-text hover:text-white'
            }`}>
            {f.label}
            <span className="ml-1.5 opacity-60">{counts[f.id as keyof typeof counts]}</span>
          </button>
        ))}
      </div>

      {ordersQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-sidebar border border-sidebar-border rounded-lg p-4">
              <div className="h-4 bg-sidebar-hover rounded w-1/4 mb-2" />
              <div className="h-3 bg-sidebar-hover rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sidebar-text text-sm">Buyurtmalar topilmadi</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const config = statusConfig[order.status]!;
            const StatusIcon = config.icon;
            const isExpanded = expandedOrder === order.id;

            return (
              <div key={order.id} className="bg-sidebar border border-sidebar-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-sidebar-hover transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-white">#{order.id}</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${config.color}`}>
                        <StatusIcon className="w-3 h-3" />{config.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-sidebar-text">
                      <span>{order.customerName}</span>
                      <span>{order.customerPhone}</span>
                      <span>{new Date(order.createdAt).toLocaleString('uz')}</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-white shrink-0">{formatCurrency(Number(order.totalUzs))}</span>
                  <ChevronDown className={`w-4 h-4 text-sidebar-text transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-sidebar-border">
                    <div className="mt-3 space-y-1.5">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-sidebar-text">{item.productName} <span className="opacity-60">x{item.quantity}</span></span>
                          <span className="font-medium text-white">{formatCurrency(Number(item.totalUzs))}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-sidebar-border space-y-1 text-xs text-sidebar-text">
                      {order.address && <p>Manzil: <span className="text-white">{order.address}</span></p>}
                      {order.notes && <p>Izoh: <span className="text-white">{order.notes}</span></p>}
                    </div>
                    {order.status === 'PENDING' && (
                      <div className="mt-3 pt-3 border-t border-sidebar-border flex items-center gap-2">
                        <button
                          onClick={() => updateStatus.mutate({ id: order.id, status: 'CONFIRMED' })}
                          disabled={updateStatus.isPending}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />Tasdiqlash
                        </button>
                        <button
                          onClick={() => updateStatus.mutate({ id: order.id, status: 'CANCELLED' })}
                          disabled={updateStatus.isPending}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-500/20 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />Bekor qilish
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
