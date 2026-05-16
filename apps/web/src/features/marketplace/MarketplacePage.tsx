import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import ky from 'ky';
import {
  Search, Phone, MapPin, Clock, ChevronRight, ChevronLeft,
  Package, X, Home, ShoppingBag, ClipboardList, User,
  Truck, Shield, CreditCard, Headphones,
  Plus, Minus, Trash2, Check, ArrowLeft, XCircle,
} from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import { useMarketplaceStore } from '@/stores/marketplace';

// Public API client — no auth needed
const papi = ky.create({ prefixUrl: '/api/v1', timeout: 30000 });

type Tab = 'home' | 'cart' | 'orders' | 'profile';

interface Category { id: string; name: string; _count: { products: number } }
interface Product {
  id: string; name: string; price: string; stock: number;
  unit: string; images: string[]; showPrice: boolean;
  category: { id: string; name: string };
}
interface ProductDetail extends Product { description: string | null }
interface OrderItem { id: number; productName: string; quantity: number; totalUzs: string }
interface Order {
  id: number; customerName: string; customerPhone: string;
  address?: string; notes?: string; status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  totalUzs: string; createdAt: string; items: OrderItem[];
}

// ===================== MAIN PAGE =====================
export function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const cartCount = useMarketplaceStore((s) => s.getCartCount());

  const productsQuery = useQuery({
    queryKey: ['mp-products', search, selectedCategory, page],
    queryFn: () =>
      papi.get('marketplace/products', {
        searchParams: {
          ...(search && { search }),
          ...(selectedCategory && { categoryId: selectedCategory }),
          page,
          limit: 24,
        },
      }).json<{ success: boolean; data: { products: Product[]; total: number } }>(),
    enabled: activeTab === 'home',
  });

  const categoriesQuery = useQuery({
    queryKey: ['mp-categories'],
    queryFn: () =>
      papi.get('marketplace/categories').json<{ success: boolean; data: Category[] }>(),
  });

  const settingsQuery = useQuery({
    queryKey: ['mp-settings'],
    queryFn: () =>
      papi.get('marketplace/settings').json<{ success: boolean; data: Record<string, string> }>(),
  });

  const products = productsQuery.data?.data.products ?? [];
  const total = productsQuery.data?.data.total ?? 0;
  const categories = categoriesQuery.data?.data ?? [];
  const settings = settingsQuery.data?.data ?? {};
  const totalPages = Math.ceil(total / 24);
  const companyName = settings['companyName'] || 'SovdaJON';
  const companyPhone = settings['companyPhone'];

  useEffect(() => {
    document.title = `${companyName} — Katalog`;
  }, [companyName]);

  if (selectedProductId !== null) {
    return (
      <ProductDetailPage
        productId={selectedProductId}
        onBack={() => setSelectedProductId(null)}
        companyName={companyName}
        companyPhone={companyPhone}
        onGoToCart={() => { setSelectedProductId(null); setActiveTab('cart'); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* HEADER */}
      <header className="bg-white sticky top-0 z-50 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-4 h-14 lg:h-16">
            {/* Logo */}
            <div className="flex items-center gap-2.5 shrink-0">
              <img src="/logo.png" alt="SovdaJON" className="h-9 w-9 rounded-lg object-cover shadow-sm" />
              <span className="text-lg font-bold text-gray-900 tracking-tight hidden sm:block">{companyName}</span>
            </div>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1 ml-4">
              {([
                { id: 'home' as Tab, label: 'Katalog', icon: Home },
                { id: 'orders' as Tab, label: 'Buyurtmalar', icon: ClipboardList },
                { id: 'profile' as Tab, label: 'Biz haqimizda', icon: User },
              ] as const).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Desktop search */}
            <div className="flex-1 hidden lg:block max-w-xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Mahsulot qidirish..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); setActiveTab('home'); }}
                  className="w-full pl-9 pr-9 py-2 bg-gray-100 rounded-lg text-sm outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20 border border-transparent focus:border-primary-300 transition-all"
                />
                {search && (
                  <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 lg:hidden" />

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {companyPhone && (
                <a href={`tel:${companyPhone}`} className="hidden sm:flex items-center gap-1.5 text-xs text-gray-600 hover:text-primary-600 font-medium transition-colors">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{companyPhone}</span>
                </a>
              )}
              <button
                onClick={() => setActiveTab('cart')}
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium relative transition-colors text-gray-600 hover:text-primary-600 hover:bg-gray-50"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Savatcha</span>
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 left-5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile search */}
          <div className="pb-3 lg:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Mahsulot qidirish..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); setActiveTab('home'); }}
                className="w-full pl-9 pr-9 py-2.5 bg-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20 border border-transparent focus:border-primary-300 transition-all"
              />
              {search && (
                <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* TAB CONTENT */}
      {activeTab === 'home' && (
        <>
          {/* Categories bar */}
          <nav className="bg-white border-b border-gray-200 sticky top-[105px] lg:top-[64px] z-40">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center gap-2 py-2.5 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => { setSelectedCategory(undefined); setPage(1); }}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    !selectedCategory ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Barchasi
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedCategory === cat.id ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat.name}
                    <span className="ml-1 opacity-60">{cat._count.products}</span>
                  </button>
                ))}
              </div>
            </div>
          </nav>

          {/* Main content */}
          <main className="max-w-7xl mx-auto px-4 py-4 lg:py-6">
            {!search && !selectedCategory && (
              <BannerCarousel onProductClick={(id) => setSelectedProductId(id)} />
            )}

            {/* Breadcrumb + count */}
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="flex items-center gap-1.5 text-xs lg:text-sm text-gray-400">
                <span>Katalog</span>
                {selectedCategory && categories.find((c) => c.id === selectedCategory) && (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-gray-700 font-medium">
                      {categories.find((c) => c.id === selectedCategory)?.name}
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs lg:text-sm text-gray-400">{total} ta mahsulot</p>
            </div>

            {/* Product Grid */}
            {productsQuery.isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
                {Array.from({ length: 15 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-white rounded-xl overflow-hidden">
                    <div className="aspect-square bg-gray-100" />
                    <div className="p-3 space-y-2">
                      <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                      <div className="h-3.5 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Mahsulot topilmadi</p>
                {search && (
                  <button onClick={() => { setSearch(''); setPage(1); }} className="mt-2 text-xs text-primary-600 font-medium">
                    Qidiruvni tozalash
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProductId(product.id)}
                    className="group text-left bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-primary-200 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="aspect-square bg-gray-50 overflow-hidden">
                      {product.images.length > 0 ? (
                        <img
                          src={product.images[0]!}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-10 h-10 text-gray-200" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 lg:p-4 space-y-1">
                      <p className="text-[10px] lg:text-xs text-gray-400 uppercase tracking-wider">{product.category.name}</p>
                      <h3 className="text-sm lg:text-base font-medium text-gray-800 leading-snug line-clamp-2">{product.name}</h3>
                      {product.showPrice ? (
                        <p className="text-sm lg:text-base font-bold text-gray-900">{formatCurrency(Number(product.price))}</p>
                      ) : (
                        <p className="text-xs lg:text-sm text-primary-600 font-semibold">Narxi kelishiladi</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors"
                >
                  Oldingi
                </button>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const n = i + 1;
                  if (n === 1 || n === totalPages || (n >= page - 1 && n <= page + 1)) {
                    return (
                      <button
                        key={i}
                        onClick={() => setPage(n)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                          page === n ? 'bg-primary-600 text-white' : 'text-gray-500 bg-white border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {n}
                      </button>
                    );
                  }
                  if (n === page - 2 || n === page + 2) {
                    return <span key={i} className="text-gray-300 px-0.5 text-xs">...</span>;
                  }
                  return null;
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors"
                >
                  Keyingi
                </button>
              </div>
            )}

            {/* Features */}
            {!search && !selectedCategory && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mt-8">
                {[
                  { icon: Truck, title: 'Bepul yetkazish', desc: "Shahar bo'ylab" },
                  { icon: Shield, title: 'Kafolat', desc: '1 yillik' },
                  { icon: CreditCard, title: 'Nasiya', desc: '12 oygacha' },
                  { icon: Headphones, title: "Qo'llab-quvvatlash", desc: 'Har doim aloqada' },
                ].map((f, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 lg:p-5 text-center border border-gray-100 hover:shadow-sm transition-shadow">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-primary-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <f.icon className="w-5 h-5 lg:w-6 lg:h-6 text-primary-600" />
                    </div>
                    <h3 className="text-xs lg:text-sm font-semibold text-gray-800">{f.title}</h3>
                    <p className="text-[10px] lg:text-xs text-gray-400 mt-0.5">{f.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 lg:mt-12 pt-6 border-t border-gray-200 text-center space-y-2 pb-6">
              <div className="flex items-center justify-center gap-2">
                <img src="/logo.png" alt="" className="w-7 h-7 rounded-lg object-cover" />
                <span className="text-sm font-bold text-gray-800">{companyName}</span>
              </div>
              <p className="text-xs text-gray-400">Sifatli mahsulot va professional xizmat</p>
              <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                {settings['companyAddress'] && (
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{settings['companyAddress']}</span>
                )}
                {settings['companyWorkHours'] && (
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{settings['companyWorkHours']}</span>
                )}
              </div>
              <p className="text-[10px] text-gray-300 pt-2">{companyName} &copy; {new Date().getFullYear()}</p>
            </div>
          </main>
        </>
      )}

      {activeTab === 'cart' && (
        <CartPage
          companyName={companyName}
          companyPhone={companyPhone}
          onGoHome={() => setActiveTab('home')}
          onOrderSuccess={() => setActiveTab('orders')}
        />
      )}

      {activeTab === 'orders' && <OrdersPage />}

      {activeTab === 'profile' && (
        <ProfilePage
          companyName={companyName}
          companyPhone={companyPhone}
          address={settings['companyAddress']}
          workHours={settings['companyWorkHours']}
        />
      )}

      {/* Bottom mobile nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 lg:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-around h-16">
          {([
            { id: 'home' as Tab, icon: Home, label: 'Bosh sahifa' },
            { id: 'cart' as Tab, icon: ShoppingBag, label: 'Savatcha', badge: cartCount },
            { id: 'orders' as Tab, icon: ClipboardList, label: 'Buyurtmalar' },
            { id: 'profile' as Tab, icon: User, label: 'Profil' },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 relative transition-colors ${
                activeTab === tab.id ? 'text-primary-600' : 'text-gray-400'
              }`}
            >
              <div className="relative">
                <tab.icon className="w-5 h-5" />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
      <div className="h-16 lg:hidden" />
    </div>
  );
}

// ===================== BANNER CAROUSEL =====================
const BANNER_IMAGES = [
  { src: '/reklama.webp', name: 'reklama.webp' },
  { src: '/reklama1.webp', name: 'reklama1.webp' },
  { src: '/reklama2.webp', name: 'reklama2.webp' },
  { src: '/reklama3.webp', name: 'reklama3.webp' },
];

function BannerCarousel({ onProductClick }: { onProductClick: (id: string) => void }) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartRef = useRef(0);
  const total = BANNER_IMAGES.length;

  const bannerLinksQuery = useQuery({
    queryKey: ['mp-banner-links'],
    queryFn: () =>
      papi.get('marketplace/banner-links').json<{ success: boolean; data: Record<string, string> }>(),
    staleTime: 60000,
  });
  const bannerLinks = bannerLinksQuery.data?.data ?? {};

  const next = useCallback(() => setCurrent((p) => (p + 1) % total), [total]);
  const prev = useCallback(() => setCurrent((p) => (p - 1 + total) % total), [total]);

  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setInterval(next, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, isPaused]);

  function handleClick(name: string) {
    const pid = bannerLinks[name];
    if (pid) onProductClick(pid);
  }

  return (
    <div className="mb-5 lg:mb-6">
      {/* Desktop: 1 large + 2 small */}
      <div className="hidden lg:grid grid-cols-[1fr_320px] gap-3 h-[280px] xl:h-[320px]">
        <div
          className="relative rounded-2xl overflow-hidden bg-gray-200 group/main cursor-pointer"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onClick={() => handleClick(BANNER_IMAGES[current]!.name)}
        >
          {BANNER_IMAGES.map((b, i) => (
            <img key={i} src={b.src} alt="" draggable={false}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{ opacity: current === i ? 1 : 0, zIndex: current === i ? 1 : 0 }}
              loading={i === 0 ? 'eager' : 'lazy'}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ))}
          <button onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/80 backdrop-blur-sm hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover/main:opacity-100 transition-all shadow-md">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/80 backdrop-blur-sm hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover/main:opacity-100 transition-all shadow-md">
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
            {BANNER_IMAGES.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                className={`rounded-full transition-all duration-300 ${current === i ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50'}`}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {[(current + 1) % total, (current + 2) % total].map((idx) => (
            <div key={idx}
              className="relative flex-1 rounded-2xl overflow-hidden bg-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => { setCurrent(idx); handleClick(BANNER_IMAGES[idx]!.name); }}
            >
              <img src={BANNER_IMAGES[idx]!.src} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: full-width carousel */}
      <div
        className="lg:hidden relative rounded-2xl overflow-hidden bg-gray-200 aspect-[16/7]"
        onTouchStart={(e) => { touchStartRef.current = e.touches[0]!.clientX; setIsPaused(true); }}
        onTouchEnd={(e) => {
          const diff = touchStartRef.current - e.changedTouches[0]!.clientX;
          if (Math.abs(diff) > 50) { diff > 0 ? next() : prev(); }
          setIsPaused(false);
        }}
        onClick={() => handleClick(BANNER_IMAGES[current]!.name)}
      >
        {BANNER_IMAGES.map((b, i) => (
          <img key={i} src={b.src} alt="" draggable={false}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            style={{ opacity: current === i ? 1 : 0, zIndex: current === i ? 1 : 0 }}
            loading={i === 0 ? 'eager' : 'lazy'}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ))}
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
          {BANNER_IMAGES.map((_, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
              className={`rounded-full transition-all duration-300 ${current === i ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ===================== PRODUCT DETAIL =====================
function ProductDetailPage({
  productId, onBack, companyName, companyPhone, onGoToCart,
}: {
  productId: string; onBack: () => void;
  companyName: string; companyPhone?: string;
  onGoToCart: () => void;
}) {
  const [currentImage, setCurrentImage] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const { cart, addToCart, updateQuantity } = useMarketplaceStore();
  const cartItem = cart.find((c) => c.productId === productId);

  const query = useQuery({
    queryKey: ['mp-product', productId],
    queryFn: () =>
      papi.get(`marketplace/products/${productId}`).json<{ success: boolean; data: ProductDetail }>(),
  });
  const product = query.data?.data;

  if (query.isLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-white h-14 lg:h-16 border-b border-gray-200" />
        <div className="max-w-7xl mx-auto px-4 py-6 animate-pulse">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8">
            <div className="aspect-square bg-white rounded-xl mb-4" />
            <div className="space-y-4">
              <div className="h-3 bg-gray-200 rounded w-20" />
              <div className="h-7 bg-gray-200 rounded w-3/4" />
              <div className="h-8 bg-gray-200 rounded w-1/3" />
              <div className="h-12 bg-gray-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-white h-14 border-b border-gray-200" />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <Package className="w-14 h-14 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 mb-3">Mahsulot topilmadi</p>
            <button onClick={onBack} className="text-sm text-primary-600 font-medium">Katalogga qaytish</button>
          </div>
        </div>
      </div>
    );
  }

  const images = product.images ?? [];
  const firstImage = images.length > 0 ? images[0]! : null;

  function handleAddToCart() {
    addToCart({ productId: product!.id, name: product!.name, image: firstImage, priceUzs: Number(product!.price) });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white sticky top-0 z-50 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 lg:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <span className="text-sm lg:text-base font-semibold text-gray-800 truncate max-w-[200px] lg:max-w-none">{product.name}</span>
          </div>
          {companyPhone && (
            <a href={`tel:${companyPhone}`} className="text-xs text-primary-600 font-medium flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{companyPhone}</span>
            </a>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 lg:py-8">
        <div className="lg:grid lg:grid-cols-[1fr_420px] xl:grid-cols-2 lg:gap-8">
          {/* Image gallery */}
          <div>
            <div className="aspect-square bg-white rounded-2xl overflow-hidden relative group border border-gray-200 mb-3">
              {images.length > 0 ? (
                <>
                  <img src={images[currentImage]!} alt={product.name}
                    className="w-full h-full object-contain p-4"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  {images.length > 1 && (
                    <>
                      <button onClick={() => setCurrentImage((c) => (c > 0 ? c - 1 : images.length - 1))}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 shadow-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronLeft className="w-5 h-5 text-gray-700" />
                      </button>
                      <button onClick={() => setCurrentImage((c) => (c < images.length - 1 ? c + 1 : 0))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 shadow-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="w-5 h-5 text-gray-700" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {images.map((_, idx) => (
                          <button key={idx} onClick={() => setCurrentImage(idx)}
                            className={`rounded-full transition-all ${idx === currentImage ? 'bg-primary-600 w-5 h-2' : 'bg-gray-300 w-2 h-2'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-20 h-20 text-gray-200" />
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
                {images.map((img, idx) => (
                  <button key={idx} onClick={() => setCurrentImage(idx)}
                    className={`w-16 h-16 lg:w-20 lg:h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${idx === currentImage ? 'border-primary-600' : 'border-gray-200'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 lg:p-6 space-y-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{product.category.name}</p>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900 leading-snug">{product.name}</h1>
              </div>
              {product.showPrice ? (
                <p className="text-2xl lg:text-3xl font-bold text-gray-900">{formatCurrency(Number(product.price))}</p>
              ) : (
                <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
                  <p className="text-primary-700 font-semibold text-sm">Narxi kelishiladi</p>
                  {companyPhone && (
                    <a href={`tel:${companyPhone}`}
                      className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors">
                      <Phone className="w-4 h-4" />{companyPhone}
                    </a>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                {product.stock > 0 ? (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                    <Check className="w-4 h-4" />Omborda mavjud
                  </span>
                ) : (
                  <span className="text-sm text-red-500 font-medium">Hozirda mavjud emas</span>
                )}
              </div>

              {/* Cart actions */}
              <div className="pt-2 space-y-3">
                {product.showPrice && cartItem ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-gray-100 rounded-xl overflow-hidden">
                      <button onClick={() => updateQuantity(productId, cartItem.quantity - 1)}
                        className="w-11 h-11 flex items-center justify-center hover:bg-gray-200 transition-colors">
                        <Minus className="w-4 h-4 text-gray-600" />
                      </button>
                      <span className="w-12 text-center text-sm font-bold">{cartItem.quantity}</span>
                      <button onClick={() => updateQuantity(productId, cartItem.quantity + 1)}
                        className="w-11 h-11 flex items-center justify-center hover:bg-gray-200 transition-colors">
                        <Plus className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    <button onClick={onGoToCart}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-600 text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition-colors">
                      <ShoppingBag className="w-4 h-4" />Savatchaga o'tish
                    </button>
                  </div>
                ) : product.showPrice ? (
                  <button onClick={handleAddToCart}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all ${
                      addedToCart ? 'bg-emerald-500 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}>
                    {addedToCart ? <><Check className="w-4 h-4" />Qo'shildi!</> : <><ShoppingBag className="w-4 h-4" />Savatga qo'shish — {formatCurrency(Number(product.price))}</>}
                  </button>
                ) : companyPhone ? (
                  <a href={`tel:${companyPhone}`}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary-600 text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition-colors">
                    <Phone className="w-4 h-4" />Qo'ng'iroq qilish
                  </a>
                ) : null}

                {product.showPrice && (
                  <button onClick={() => {
                    if (!cartItem) addToCart({ productId: product.id, name: product.name, image: firstImage, priceUzs: Number(product.price) });
                    onGoToCart();
                  }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border-2 border-primary-600 text-primary-600 hover:bg-primary-50 transition-colors">
                    Buyurtma berish
                  </button>
                )}
              </div>
            </div>

            {product.description && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 lg:p-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Tavsif</h3>
                <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 p-5 lg:p-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Xususiyatlari</h3>
              <div className="divide-y divide-gray-100">
                <div className="flex justify-between py-2.5 text-sm">
                  <span className="text-gray-400">Kategoriya</span>
                  <span className="font-medium text-gray-700">{product.category.name}</span>
                </div>
                <div className="flex justify-between py-2.5 text-sm">
                  <span className="text-gray-400">O'lchov birligi</span>
                  <span className="font-medium text-gray-700">{product.unit}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-50 lg:hidden">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          {product.showPrice && cartItem ? (
            <>
              <div className="flex items-center bg-gray-100 rounded-xl overflow-hidden">
                <button onClick={() => updateQuantity(productId, cartItem.quantity - 1)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-200">
                  <Minus className="w-4 h-4 text-gray-600" />
                </button>
                <span className="w-10 text-center text-sm font-semibold">{cartItem.quantity}</span>
                <button onClick={() => updateQuantity(productId, cartItem.quantity + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-200">
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <button onClick={onGoToCart} className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-600 text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition-colors">
                <ShoppingBag className="w-4 h-4" />Savatchaga o'tish
              </button>
            </>
          ) : product.showPrice ? (
            <button onClick={handleAddToCart}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${addedToCart ? 'bg-emerald-500 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
              {addedToCart ? <><Check className="w-4 h-4" />Qo'shildi</> : <><ShoppingBag className="w-4 h-4" />Savatga qo'shish — {formatCurrency(Number(product.price))}</>}
            </button>
          ) : companyPhone ? (
            <a href={`tel:${companyPhone}`} className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-600 text-white rounded-xl font-semibold text-sm">
              <Phone className="w-4 h-4" />Qo'ng'iroq qilish
            </a>
          ) : null}
        </div>
      </div>
      <div className="h-20 lg:hidden" />
    </div>
  );
}

// ===================== CART PAGE =====================
function CartPage({
  companyName, companyPhone, onGoHome, onOrderSuccess,
}: {
  companyName: string; companyPhone?: string;
  onGoHome: () => void; onOrderSuccess: () => void;
}) {
  const { cart, removeFromCart, updateQuantity, clearCart, getCartTotal } = useMarketplaceStore();
  const [showCheckout, setShowCheckout] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const createOrder = useMutation({
    mutationFn: () =>
      papi.post('marketplace/orders', {
        json: {
          customerName: name,
          customerPhone: phone,
          address: address || undefined,
          notes: notes || undefined,
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        },
      }).json<{ success: boolean; data: { id: number } }>(),
    onSuccess: (data) => {
      setOrderId(data.data.id);
      setOrderSuccess(true);
      clearCart();
    },
  });

  const total = getCartTotal();

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center py-24 px-4">
        <div className="text-center max-w-md bg-white rounded-2xl border border-gray-200 p-8 lg:p-12 w-full">
          <div className="w-16 h-16 lg:w-20 lg:h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 lg:w-10 lg:h-10 text-emerald-600" />
          </div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">Buyurtma qabul qilindi!</h2>
          <p className="text-sm text-gray-500 mb-1">Buyurtma raqami: <span className="font-semibold text-gray-800">#{orderId}</span></p>
          <p className="text-xs text-gray-400 mb-6">Tez orada operatorimiz siz bilan bog'lanadi</p>
          <div className="space-y-2">
            <button onClick={onOrderSuccess} className="w-full py-3 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
              Buyurtmalarni ko'rish
            </button>
            <button onClick={onGoHome} className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
              Xarid davom ettirish
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showCheckout) {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 h-14 lg:h-16 flex items-center gap-2">
            <button onClick={() => setShowCheckout(false)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <span className="text-sm lg:text-base font-semibold text-gray-800">Buyurtma berish</span>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-4 lg:py-8">
          <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-6">
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 lg:p-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-800">Ma'lumotlaringiz</h3>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Ism *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ismingiz"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Telefon raqam *</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 000 00 00"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Manzil</label>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Yetkazib berish manzili"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Izoh</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Qo'shimcha izoh..." rows={3}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none transition-all"
                  />
                </div>
              </div>
              {createOrder.error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
                  Xatolik yuz berdi. Qaytadan urinib ko'ring.
                </div>
              )}
            </div>

            <div className="mt-4 lg:mt-0">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 lg:p-6 lg:sticky lg:top-24">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Buyurtma</h3>
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span className="text-gray-600 line-clamp-1 flex-1 mr-3">{item.name} <span className="text-gray-400">x{item.quantity}</span></span>
                      <span className="font-medium text-gray-800 shrink-0">{formatCurrency(item.priceUzs * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
                  <span className="text-sm font-semibold text-gray-800">Jami:</span>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(total)}</span>
                </div>
                <button
                  onClick={() => createOrder.mutate()}
                  disabled={!name.trim() || !phone.trim() || createOrder.isPending}
                  className="w-full mt-5 py-3.5 bg-primary-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-primary-700 transition-colors"
                >
                  {createOrder.isPending ? 'Yuborilmoqda...' : `Buyurtma berish — ${formatCurrency(total)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-50 lg:hidden">
          <button onClick={() => createOrder.mutate()} disabled={!name.trim() || !phone.trim() || createOrder.isPending}
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-primary-700 transition-colors">
            {createOrder.isPending ? 'Yuborilmoqda...' : `Buyurtma berish — ${formatCurrency(total)}`}
          </button>
        </div>
        <div className="h-20 lg:hidden" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 lg:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary-600" />
            <span className="text-sm lg:text-base font-semibold text-gray-800">Savatcha</span>
            {cart.length > 0 && <span className="text-xs text-gray-400">({cart.length} ta)</span>}
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-red-500 font-medium flex items-center gap-1 hover:text-red-600">
              <Trash2 className="w-3 h-3" />Tozalash
            </button>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4 lg:py-8">
        {cart.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-14 h-14 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-1">Savatcha bo'sh</p>
            <p className="text-xs text-gray-300 mb-4">Mahsulotlarni savatga qo'shing</p>
            <button onClick={onGoHome} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
              Xarid qilish
            </button>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6">
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.productId} className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-4">
                  <div className="w-20 h-20 lg:w-24 lg:h-24 bg-gray-50 rounded-xl overflow-hidden shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-200" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm lg:text-base font-medium text-gray-800 line-clamp-2 leading-snug">{item.name}</h3>
                    <p className="text-sm lg:text-base font-bold text-gray-900 mt-1">{formatCurrency(item.priceUzs * item.quantity)}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center bg-gray-100 rounded-xl overflow-hidden">
                        <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="w-9 h-9 flex items-center justify-center hover:bg-gray-200 transition-colors">
                          <Minus className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                        <span className="w-9 text-center text-xs font-semibold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="w-9 h-9 flex items-center justify-center hover:bg-gray-200 transition-colors">
                          <Plus className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(item.productId)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden lg:block mt-0">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-24">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Buyurtma xulosasi</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Mahsulotlar ({cart.length} ta)</span>
                    <span className="font-medium text-gray-700">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Yetkazish</span>
                    <span className="font-medium text-emerald-600">Bepul</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
                  <span className="text-base font-semibold text-gray-800">Jami:</span>
                  <span className="text-xl font-bold text-gray-900">{formatCurrency(total)}</span>
                </div>
                <button onClick={() => setShowCheckout(true)}
                  className="w-full mt-5 py-3.5 bg-primary-600 text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition-colors">
                  Buyurtma berish
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40 lg:hidden">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{cart.length} ta mahsulot</span>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(total)}</span>
            </div>
            <button onClick={() => setShowCheckout(true)}
              className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition-colors">
              Buyurtma berish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== ORDERS PAGE =====================
function OrdersPage() {
  const [checkId, setCheckId] = useState('');
  const [searchId, setSearchId] = useState<number | null>(null);

  const orderQuery = useQuery({
    queryKey: ['mp-order-status', searchId],
    queryFn: () =>
      papi.get(`marketplace/orders/${searchId}`).json<{ success: boolean; data: Order }>(),
    enabled: searchId !== null,
    retry: false,
  });
  const order = orderQuery.data?.data;

  const statusConfig = {
    PENDING: { label: 'Kutilmoqda', color: 'text-amber-600 bg-amber-50' },
    CONFIRMED: { label: 'Tasdiqlangan', color: 'text-emerald-600 bg-emerald-50' },
    CANCELLED: { label: 'Bekor qilingan', color: 'text-red-500 bg-red-50' },
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary-600" />
          <span className="text-sm font-semibold text-gray-800">Buyurtmalar</span>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Buyurtma tekshirish</h3>
          <div className="flex gap-2">
            <input
              type="number" value={checkId} onChange={(e) => setCheckId(e.target.value)}
              placeholder="Buyurtma raqami" onKeyDown={(e) => e.key === 'Enter' && setSearchId(parseInt(checkId))}
              className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
            <button
              onClick={() => { const id = parseInt(checkId); if (!isNaN(id)) setSearchId(id); }}
              disabled={!checkId.trim()}
              className="px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              Tekshirish
            </button>
          </div>
        </div>

        {orderQuery.isLoading && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
            <div className="h-3 bg-gray-100 rounded w-2/3 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        )}

        {orderQuery.isError && (
          <div className="bg-white rounded-xl border border-red-100 p-4 text-center">
            <XCircle className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Buyurtma topilmadi</p>
          </div>
        )}

        {order && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-900">Buyurtma #{order.id}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusConfig[order.status].color}`}>
                  {statusConfig[order.status].label}
                </span>
              </div>
              <div className="text-xs text-gray-400 space-y-0.5">
                <p>Mijoz: <span className="text-gray-600">{order.customerName}</span></p>
                <p>Telefon: <span className="text-gray-600">{order.customerPhone}</span></p>
                {order.address && <p>Manzil: <span className="text-gray-600">{order.address}</span></p>}
                <p>Sana: <span className="text-gray-600">{new Date(order.createdAt).toLocaleString('uz')}</span></p>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.productName} x{item.quantity}</span>
                  <span className="font-medium text-gray-800">{formatCurrency(Number(item.totalUzs))}</span>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between">
                <span className="text-sm font-semibold text-gray-800">Jami:</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(Number(order.totalUzs))}</span>
              </div>
            </div>
            {order.notes && (
              <div className="px-4 pb-4">
                <p className="text-xs text-gray-400">Izoh: <span className="text-gray-500">{order.notes}</span></p>
              </div>
            )}
          </div>
        )}

        {!order && !orderQuery.isLoading && !orderQuery.isError && (
          <div className="text-center py-16">
            <ClipboardList className="w-14 h-14 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 mb-1">Buyurtma raqamini kiriting</p>
            <p className="text-xs text-gray-300">Buyurtma holatini tekshirish uchun</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== PROFILE PAGE =====================
function ProfilePage({
  companyName, companyPhone, address, workHours,
}: {
  companyName: string; companyPhone?: string;
  address?: string; workHours?: string;
}) {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-2">
          <User className="w-5 h-5 text-primary-600" />
          <span className="text-sm font-semibold text-gray-800">Biz haqimizda</span>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
          <img src="/logo.png" alt={companyName} className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 shadow-md" />
          <h2 className="text-xl font-bold text-gray-900">{companyName}</h2>
          <p className="text-sm text-gray-400 mt-1">Sifatli mahsulot va professional xizmat</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {companyPhone && (
            <a href={`tel:${companyPhone}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Telefon</p>
                <p className="text-sm font-medium text-gray-800">{companyPhone}</p>
              </div>
            </a>
          )}
          {address && (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Manzil</p>
                <p className="text-sm font-medium text-gray-800">{address}</p>
              </div>
            </div>
          )}
          {workHours && (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Ish vaqti</p>
                <p className="text-sm font-medium text-gray-800">{workHours}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
