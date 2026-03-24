import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search, Minus, Plus, X,
  ShoppingBag, Send, User, Check, Loader2, ScanBarcode, Package, Trash2,
} from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import { api } from '@/services/api';
import { useInfiniteProducts } from '@/hooks/useProducts';
import { useCustomerSearch } from '@/hooks/useCustomers';
import { useSound } from '@/hooks/useSound';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';

/* ─── Types ─── */
interface HelperCartItem {
  productId: string;
  name: string;
  price: number;
  costPrice: number;
  quantity: number;
  stock: number;
}

interface ProductLookupResult {
  id: string;
  name: string;
  price: string | number;
  costPrice: string | number;
  stock: number;
  code: number | null;
  images: string[];
}

/* ─── BarcodeDetector type ─── */
interface DetectedBarcode {
  rawValue: string;
  format: string;
}

interface BarcodeDetectorInstance {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats: string[] }): BarcodeDetectorInstance;
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

/* ═════════════════════════════════════════
   HelperPage — Professional buyurtma tizimi
   ═════════════════════════════════════════ */
export function HelperPage() {
  const { play } = useSound();
  const { toast } = useToast();

  // Cart
  const [cart, setCart] = useState<HelperCartItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scannerManualCode, setScannerManualCode] = useState('');
  const [scanLookupLoading, setScanLookupLoading] = useState(false);
  const [lastFoundName, setLastFoundName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Quantity modal
  const [qtyModal, setQtyModal] = useState<ProductLookupResult | null>(null);
  const [qtyValue, setQtyValue] = useState(1);

  // Customer
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);
  const { data: searchResults } = useCustomerSearch(customerSearch);

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const { data: productData } = useInfiniteProducts({ search: productSearch, limit: 20 });
  const searchProducts = useMemo(() => productData?.pages.flatMap((p) => p.data) ?? [], [productData]);

  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastScannedRef = useRef('');
  const lastScannedTimeRef = useRef(0);
  const scannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.BarcodeDetector) {
      detectorRef.current = null; // will be created when camera starts
    }
  }, []);

  /* ─── Camera ─── */
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setScanning(true);
      if (window.BarcodeDetector) {
        detectorRef.current = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'code_93', 'upc_a', 'upc_e', 'qr_code'],
        });
      }
    } catch {
      toast("Kamerani ochib bo'lmadi", 'error');
      setScanning(false);
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    detectorRef.current = null;
  }, []);

  function closeScannerModal() {
    stopCamera();
    setScanning(false);
    setScannerManualCode('');
    setLastFoundName('');
  }

  useEffect(() => () => stopCamera(), [stopCamera]);

  /* ─── Product lookup — modal chiqaradi ─── */
  const lookupCode = useCallback(async (code: string) => {
    if (!code.trim()) return;
    const now = Date.now();
    if (code === lastScannedRef.current && now - lastScannedTimeRef.current < 2000) return;
    lastScannedRef.current = code;
    lastScannedTimeRef.current = now;

    setScanLookupLoading(true);
    try {
      const res = await api.get(`products/code/${encodeURIComponent(Number(code.trim()))}`).json<{
        success: boolean;
        data: ProductLookupResult;
      }>();
      if (res.success && res.data) {
        play('scan');
        setLastFoundName(res.data.name);
        const existing = cart.find((i) => i.productId === res.data.id);
        setQtyValue(existing ? existing.quantity + 1 : 1);
        setQtyModal(res.data);
      }
    } catch {
      play('error');
      toast(`Kod topilmadi: ${code}`, 'error');
    } finally {
      setScanLookupLoading(false);
    }
  }, [play, toast, cart]);

  /* ─── Scan loop ─── */
  useEffect(() => {
    if (!scanning || !detectorRef.current || !videoRef.current) return;
    const detector = detectorRef.current;
    const video = videoRef.current;
    scanIntervalRef.current = setInterval(async () => {
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
      try {
        const barcodes = await detector.detect(video);
        if (barcodes.length > 0 && barcodes[0]?.rawValue) {
          lookupCode(barcodes[0].rawValue);
        }
      } catch { /* ignore */ }
    }, 500);
    return () => { if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; } };
  }, [scanning, lookupCode]);

  /* ─── Quantity modal → savatga qo'shish ─── */
  function confirmAddToCart() {
    if (!qtyModal || qtyValue < 1) return;
    const p = qtyModal;
    play('add-to-cart');
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) {
        return prev.map((i) => i.productId === p.id ? { ...i, quantity: qtyValue } : i);
      }
      return [
        { productId: p.id, name: p.name, price: Number(p.price), costPrice: Number(p.costPrice), quantity: qtyValue, stock: p.stock },
        ...prev,
      ];
    });
    toast(`${p.name} — ${qtyValue} ta qo'shildi`, 'success');
    setQtyModal(null);
    setQtyValue(1);
  }

  /* ─── Add from search ─── */
  function addFromSearch(p: typeof searchProducts[0]) {
    const existing = cart.find((i) => i.productId === p.id);
    setQtyValue(existing ? existing.quantity + 1 : 1);
    setQtyModal({
      id: p.id,
      name: p.name,
      price: p.price,
      costPrice: p.costPrice,
      stock: p.stock,
      code: p.code ?? null,
      images: p.images ?? [],
    });
    setProductSearch('');
  }

  /* ─── Cart ops ─── */
  function updateQuantity(productId: string, delta: number) {
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  }
  function removeItem(productId: string) { setCart((prev) => prev.filter((i) => i.productId !== productId)); play('delete'); }
  function clearCart() { setCart([]); play('delete'); }

  /* ─── Submit ─── */
  async function handleSubmit() {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      await api.post('orders', {
        json: {
          items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.price })),
          customerId: selectedCustomer?.id ?? undefined,
        },
      }).json();
      play('success');
      toast('Buyurtma kassaga yuborildi!', 'success');
      setCart([]);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      play('error');
      toast("Buyurtma yuborishda xatolik", 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] flex-col overflow-hidden bg-surface-secondary">

      {/* ═══ Top: Scanner + Search ═══ */}
      <div className="shrink-0 bg-surface" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-text-primary leading-none">Buyurtma</h1>
              {itemCount > 0 && (
                <p className="text-[11px] text-text-muted mt-0.5">{itemCount} ta mahsulot · {formatCurrency(total)}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => { setScanning(true); startCamera(); }}
            className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-sm hover:bg-primary-700 active:scale-[0.95] transition-all"
            style={{ minHeight: 'auto', minWidth: 'auto' }}
          >
            <ScanBarcode className="h-4.5 w-4.5" />
            Skanerlash
          </button>
        </div>

        {/* Product search */}
        <div className="relative px-4 pb-3">
          <Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Mahsulot nomi yoki kodi bilan qidirish..."
            className="input !bg-surface-secondary w-full"
            style={{ paddingLeft: '40px', fontSize: '16px' }}
          />
          {productSearch && (
            <button
              onClick={() => setProductSearch('')}
              className="absolute right-7 top-1/2 -translate-y-1/2 p-1 text-text-muted"
              style={{ minHeight: 'auto', minWidth: 'auto' }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search results */}
        {productSearch.trim().length > 0 && searchProducts.length > 0 && (
          <div className="mx-4 mb-3 max-h-52 overflow-auto rounded-xl bg-surface shadow-lg" style={{ border: '1px solid var(--color-border)' }}>
            {searchProducts.map((p, i) => (
              <button
                key={p.id}
                onClick={() => addFromSearch(p)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-secondary active:bg-surface-tertiary transition-colors"
                style={{ minHeight: 'auto', borderBottom: i < searchProducts.length - 1 ? '1px solid var(--color-border-subtle)' : undefined }}
              >
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" loading="lazy" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-tertiary shrink-0"><Package className="h-4 w-4 text-text-muted/30" /></div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-text-primary leading-snug truncate">{p.name}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {p.code != null && <span className="font-bold text-primary-600">#{p.code}</span>}
                    {p.code != null && ' · '}{p.stock} ta · <span className="font-semibold text-text-primary">{formatCurrency(Number(p.price))}</span>
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600 shrink-0">
                  <Plus className="h-4 w-4" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Middle: Cart ═══ */}
      <div className="flex-1 overflow-auto">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-text-muted px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-tertiary/50 mb-4">
              <ShoppingBag className="h-8 w-8 opacity-20" />
            </div>
            <p className="text-sm font-semibold text-text-secondary">Savatcha bo'sh</p>
            <p className="mt-1 text-xs text-center">Mahsulotni skanerlang yoki qidiruvdan toping</p>
          </div>
        ) : (
          <div className="px-3 py-2 space-y-1.5">
            {/* Cart header */}
            <div className="flex items-center justify-between px-1 pb-1.5">
              <p className="text-[13px] font-bold text-text-primary">
                Savatcha
                <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              </p>
              <button onClick={clearCart} className="flex items-center gap-1 text-[11px] font-medium text-danger-600 hover:text-danger-700" style={{ minHeight: 'auto', minWidth: 'auto' }}>
                <Trash2 className="h-3 w-3" />
                Tozalash
              </button>
            </div>

            {cart.map((item) => (
              <div key={item.productId} className="rounded-xl bg-surface px-3 py-2.5" style={{ border: '1px solid var(--color-border-subtle)' }}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-semibold text-text-primary leading-snug line-clamp-2 flex-1 min-w-0">
                    {item.name}
                  </p>
                  <button onClick={() => removeItem(item.productId)} className="rounded-md p-1 text-text-muted hover:bg-danger-50 hover:text-danger-600 transition-all shrink-0" style={{ minHeight: 'auto', minWidth: 'auto' }}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQuantity(item.productId, -1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-secondary text-text-muted hover:bg-surface-tertiary active:scale-[0.95] transition-all" style={{ minHeight: 'auto', minWidth: 'auto' }}>
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="flex h-8 min-w-[36px] items-center justify-center rounded-lg bg-surface-secondary text-sm font-bold text-text-primary tabular-nums px-2">
                      {item.quantity}
                    </span>
                    <button onClick={() => updateQuantity(item.productId, 1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-secondary text-text-muted hover:bg-surface-tertiary active:scale-[0.95] transition-all" style={{ minHeight: 'auto', minWidth: 'auto' }}>
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-text-primary tabular-nums">{formatCurrency(item.price * item.quantity)}</p>
                    <p className="text-[10px] text-text-muted tabular-nums">{formatCurrency(item.price)} × {item.quantity}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Bottom: Customer + Submit ═══ */}
      {cart.length > 0 && (
        <div className="shrink-0 bg-surface p-4 space-y-3" style={{ borderTop: '1px solid var(--color-border-subtle)', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' }}>
          {/* Customer */}
          <div>
            {selectedCustomer ? (
              <div className="flex items-center justify-between rounded-xl bg-primary-50/50 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[13px] font-semibold text-text-primary">{selectedCustomer.name}</span>
                </div>
                <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }} className="text-[11px] font-medium text-danger-600" style={{ minHeight: 'auto', minWidth: 'auto' }}>
                  Bekor
                </button>
              </div>
            ) : (
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Mijoz qidirish (ixtiyoriy)..."
                  className="input !text-[13px] w-full"
                  style={{ paddingLeft: '36px', fontSize: '16px' }}
                />
                {searchResults?.data && searchResults.data.length > 0 && customerSearch && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-36 overflow-auto rounded-xl bg-surface shadow-lg" style={{ border: '1px solid var(--color-border)' }}>
                    {searchResults.data.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedCustomer({ id: c.id, name: c.name }); setCustomerSearch(''); }}
                        className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-surface-secondary transition-colors"
                        style={{ minHeight: 'auto' }}
                      >
                        <span className="text-[13px] font-medium text-text-primary">{c.name}</span>
                        <span className="text-[11px] text-text-muted">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Total + Submit */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[11px] text-text-muted">Jami summa</p>
              <p className="text-xl font-bold text-text-primary tabular-nums leading-tight">{formatCurrency(total)}</p>
            </div>
            {success ? (
              <div className="flex items-center gap-2 rounded-xl bg-success-50 px-5 py-3 text-success-700">
                <Check className="h-5 w-5" />
                <span className="text-sm font-bold">Yuborildi!</span>
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-6 py-3 text-[14px] font-bold text-white transition-all active:scale-[0.97]',
                  !submitting ? 'bg-success-600 hover:bg-success-700 shadow-md' : 'bg-gray-300',
                )}
                style={{ minHeight: 'auto' }}
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-4 w-4" />Yuborish</>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ Scanner Modal — fullscreen ═══ */}
      {scanning && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm z-10">
            <div className="min-w-0 flex-1">
              {lastFoundName ? (
                <div className="flex items-center gap-2 animate-fade-in">
                  <Check className="h-4 w-4 text-success-400 shrink-0" />
                  <p className="text-[13px] font-semibold text-success-400 truncate">{lastFoundName} qo'shildi</p>
                </div>
              ) : (
                <p className="text-[13px] text-white/60">QR yoki shtrix kodni ko'rsating</p>
              )}
            </div>
            <button
              onClick={closeScannerModal}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-[0.93] transition-all shrink-0 ml-3"
              style={{ minHeight: 'auto', minWidth: 'auto' }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Camera view — markazda */}
          <div className="flex-1 relative">
            <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted autoPlay />
            {/* Scanner frame */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative" style={{ width: '65%', maxWidth: '280px', aspectRatio: '1' }}>
                <div className="absolute left-0 top-0 h-8 w-8 border-l-[3px] border-t-[3px] border-white rounded-tl-xl" />
                <div className="absolute right-0 top-0 h-8 w-8 border-r-[3px] border-t-[3px] border-white rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 h-8 w-8 border-b-[3px] border-l-[3px] border-white rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 h-8 w-8 border-b-[3px] border-r-[3px] border-white rounded-br-xl" />
                {/* Animated scan line */}
                <div className="absolute left-3 right-3 h-[2px] bg-gradient-to-r from-transparent via-primary-400 to-transparent" style={{ animation: 'scanLine 2s ease-in-out infinite', top: '50%' }} />
              </div>
            </div>
            {/* Loading overlay */}
            {scanLookupLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="flex items-center gap-2 rounded-full bg-black/70 px-5 py-2.5 text-white backdrop-blur-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-[13px] font-medium">Qidirilmoqda...</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom — manual code input */}
          <div className="shrink-0 bg-black/80 backdrop-blur-sm px-4 py-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (scannerManualCode.trim()) {
                  lookupCode(scannerManualCode.trim());
                  setScannerManualCode('');
                  scannerInputRef.current?.focus();
                }
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <ScanBarcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40 pointer-events-none" />
                <input
                  ref={scannerInputRef}
                  type="text"
                  inputMode="numeric"
                  value={scannerManualCode}
                  onChange={(e) => setScannerManualCode(e.target.value)}
                  placeholder="Kodni qo'lda kiriting..."
                  className="w-full rounded-xl bg-white/10 text-white placeholder-white/40 px-4 py-3 focus:outline-2 focus:outline-primary-500"
                  style={{ paddingLeft: '40px', fontSize: '16px', border: '1px solid rgba(255,255,255,0.15)' }}
                />
              </div>
              <button
                type="submit"
                disabled={!scannerManualCode.trim() || scanLookupLoading}
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-xl transition-all shrink-0',
                  scannerManualCode.trim() && !scanLookupLoading
                    ? 'bg-primary-600 text-white active:scale-[0.93]'
                    : 'bg-white/10 text-white/30',
                )}
                style={{ minHeight: 'auto', minWidth: 'auto' }}
              >
                {scanLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-5 w-5" />}
              </button>
            </form>
            {/* Savatcha holati */}
            {itemCount > 0 && (
              <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-[12px] text-white/50">{itemCount} ta mahsulot savatda</p>
                <button
                  onClick={closeScannerModal}
                  className="text-[13px] font-semibold text-primary-400 hover:text-primary-300"
                  style={{ minHeight: 'auto', minWidth: 'auto' }}
                >
                  Savatga qaytish →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Quantity Modal ═══ */}
      {qtyModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setQtyModal(null)}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div
            className="relative z-10 w-full max-w-sm mx-auto bg-surface rounded-t-2xl sm:rounded-2xl p-5 animate-slide-up sm:animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Product info */}
            <div className="flex items-start gap-3 mb-5">
              {qtyModal.images?.[0] ? (
                <img src={qtyModal.images[0]} alt="" className="h-14 w-14 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface-tertiary shrink-0">
                  <Package className="h-6 w-6 text-text-muted/30" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-text-primary leading-snug line-clamp-2">{qtyModal.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {qtyModal.code != null && <span className="text-[11px] font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">#{qtyModal.code}</span>}
                  <span className="text-[12px] text-text-muted">{qtyModal.stock} ta mavjud</span>
                </div>
                <p className="text-base font-bold text-primary-600 tabular-nums mt-1">{formatCurrency(Number(qtyModal.price))}</p>
              </div>
            </div>

            {/* Quantity selector — input + tugmalar */}
            <div className="mb-4">
              <div className="flex items-center justify-center gap-3 mb-3">
                <button
                  onClick={() => setQtyValue(Math.max(1, qtyValue - 1))}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-tertiary text-text-primary hover:bg-danger-50 hover:text-danger-600 active:scale-[0.93] transition-all"
                  style={{ minHeight: 'auto', minWidth: 'auto' }}
                >
                  <Minus className="h-6 w-6" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={qtyValue}
                  onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) setQtyValue(v); else if (e.target.value === '') setQtyValue(1); }}
                  onFocus={(e) => e.target.select()}
                  className="h-16 w-28 rounded-2xl bg-surface-secondary text-center text-3xl font-black text-text-primary tabular-nums focus:outline-2 focus:outline-primary-500"
                  style={{ border: '2px solid var(--color-border)', fontSize: '28px', caretColor: 'var(--color-primary-600)' }}
                  autoFocus
                />
                <button
                  onClick={() => setQtyValue(qtyValue + 1)}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-tertiary text-text-primary hover:bg-success-50 hover:text-success-600 active:scale-[0.93] transition-all"
                  style={{ minHeight: 'auto', minWidth: 'auto' }}
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>
              {/* Tez tanlash */}
              <div className="flex items-center justify-center gap-2">
                {[1, 5, 10, 20, 50, 100].map((n) => (
                  <button
                    key={n}
                    onClick={() => setQtyValue(n)}
                    className={cn(
                      'rounded-lg px-2.5 py-1.5 text-[12px] font-bold tabular-nums transition-all active:scale-[0.93]',
                      qtyValue === n
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary',
                    )}
                    style={{ minHeight: 'auto', minWidth: 'auto' }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Total for this item */}
            <div className="flex items-center justify-between rounded-xl bg-surface-secondary px-4 py-3 mb-4">
              <span className="text-[13px] text-text-muted">Summa</span>
              <span className="text-xl font-bold text-text-primary tabular-nums">{formatCurrency(Number(qtyModal.price) * qtyValue)}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setQtyModal(null)}
                className="flex-1 rounded-xl py-3 text-[14px] font-semibold text-text-secondary hover:bg-surface-secondary transition-colors"
                style={{ minHeight: 'auto', border: '1px solid var(--color-border)' }}
              >
                Bekor
              </button>
              <button
                onClick={confirmAddToCart}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-bold text-white bg-primary-600 hover:bg-primary-700 active:scale-[0.97] transition-all shadow-sm"
                style={{ minHeight: 'auto' }}
              >
                <Plus className="h-4 w-4" />
                Qo'shish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
