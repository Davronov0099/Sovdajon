import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Camera, CameraOff, Keyboard, Search, Minus, Plus, X,
  ShoppingBag, Send, User, Check, Loader2, ScanBarcode, Package,
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
  discount: number;
}

interface ProductLookupResult {
  id: string;
  name: string;
  price: string | number;
  costPrice: string | number;
  stock: number;
}

/* ─── BarcodeDetector type (native API) ─── */
interface DetectedBarcode {
  rawValue: string;
  format: string;
  boundingBox: DOMRectReadOnly;
  cornerPoints: { x: number; y: number }[];
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

/* ═══════════════════════════════════════════════════
   HelperPage — Barcode skaner + savatcha + kassaga yuborish
   ═══════════════════════════════════════════════════ */
export function HelperPage() {
  const { play } = useSound();
  const { toast } = useToast();

  // Cart state (local, helper-specific)
  const [cart, setCart] = useState<HelperCartItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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
  const lastScannedRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const manualInputRef = useRef<HTMLInputElement>(null);

  // BarcodeDetector support check
  const [detectorSupported, setDetectorSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.BarcodeDetector) {
      setDetectorSupported(true);
    }
  }, []);

  /* ─── Camera start/stop ─── */
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      // Create detector
      if (window.BarcodeDetector) {
        detectorRef.current = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'code_93', 'upc_a', 'upc_e', 'qr_code'],
        });
      }
    } catch (err) {
      console.error('Camera error:', err);
      toast("Kamerani ochib bo'lmadi. Ruxsat berilganini tekshiring.", 'error');
      setManualMode(true);
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    detectorRef.current = null;
    setScanning(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  /* ─── Product lookup by barcode ─── */
  const lookupBarcode = useCallback(async (barcode: string) => {
    if (!barcode.trim()) return;

    // Debounce same barcode within 2 seconds
    const now = Date.now();
    if (barcode === lastScannedRef.current && now - lastScannedTimeRef.current < 2000) {
      return;
    }
    lastScannedRef.current = barcode;
    lastScannedTimeRef.current = now;

    setLookupLoading(true);
    try {
      const res = await api.get(`products/code/${encodeURIComponent(Number(barcode.trim()))}`).json<{
        success: boolean;
        data: ProductLookupResult;
      }>();

      if (res.success && res.data) {
        const product = res.data;
        play('add-to-cart');

        setCart((prev) => {
          const existing = prev.find((item) => item.productId === product.id);
          if (existing) {
            return prev.map((item) =>
              item.productId === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item,
            );
          }
          return [
            ...prev,
            {
              productId: product.id,
              name: product.name,
              price: Number(product.price),
              costPrice: Number(product.costPrice),
              quantity: 1,
              discount: 0,
            },
          ];
        });

        toast(`${product.name} qo'shildi`, 'success');
      }
    } catch (err) {
      play('error');
      console.error('Barcode lookup error:', err);
      toast(`Shtrix kod topilmadi: ${barcode}`, 'error');
    } finally {
      setLookupLoading(false);
    }
  }, [play, toast]);

  /* ─── Barcode scanning loop ─── */
  useEffect(() => {
    if (!scanning || !detectorRef.current || !videoRef.current) return;

    const detector = detectorRef.current;
    const video = videoRef.current;

    scanIntervalRef.current = setInterval(async () => {
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

      try {
        const barcodes = await detector.detect(video);
        if (barcodes.length > 0 && barcodes[0]) {
          const code = barcodes[0].rawValue;
          if (code) {
            play('scan');
            lookupBarcode(code);
          }
        }
      } catch {
        // Ignore detection errors
      }
    }, 500);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [scanning, lookupBarcode, play]);

  /* ─── Manual barcode submit ─── */
  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (manualBarcode.trim()) {
      lookupBarcode(manualBarcode.trim());
      setManualBarcode('');
      manualInputRef.current?.focus();
    }
  }

  /* ─── Add product from search ─── */
  function addProduct(product: { id: string; name: string; price: number | string; costPrice: number | string; stock: number }) {
    play('add-to-cart');
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        { productId: product.id, name: product.name, price: Number(product.price), costPrice: Number(product.costPrice), quantity: 1, discount: 0 },
        ...prev,
      ];
    });
    setProductSearch('');
  }

  /* ─── Cart operations ─── */
  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item,
        ),
    );
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
    play('delete');
  }

  function clearCart() {
    setCart([]);
    play('delete');
  }

  /* ─── Submit order to admin ─── */
  async function handleSubmit() {
    if (cart.length === 0) return;
    setSubmitting(true);

    try {
      await api.post('orders', {
        json: {
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
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
    } catch (err) {
      play('error');
      console.error('Submit error:', err);
      toast("Buyurtma yuborishda xatolik", 'error');
    } finally {
      setSubmitting(false);
    }
  }

  /* ─── Calculated values ─── */
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity * (1 - item.discount / 100), 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] flex-col overflow-hidden bg-surface-secondary">
      {/* ═══ Top: Search + Scanner ═══ */}
      <div className="shrink-0 bg-surface" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <h1 className="text-base font-bold text-text-primary">Buyurtma</h1>
          </div>
          <div className="flex items-center gap-1.5">
            {detectorSupported && (
              <button
                onClick={() => { if (scanning) stopCamera(); else { setManualMode(false); startCamera(); } }}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
                  scanning ? 'bg-danger-50 text-danger-600' : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary',
                )}
                style={{ minHeight: 'auto', minWidth: 'auto' }}
              >
                {scanning ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
                {scanning ? "Stop" : 'Skaner'}
              </button>
            )}
            <button
              onClick={() => { if (scanning) stopCamera(); setManualMode(!manualMode); setTimeout(() => manualInputRef.current?.focus(), 100); }}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
                manualMode ? 'bg-primary-100 text-primary-700' : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary',
              )}
              style={{ minHeight: 'auto', minWidth: 'auto' }}
            >
              <Keyboard className="h-3.5 w-3.5" />
              Kod
            </button>
          </div>
        </div>

        {/* Product search */}
        <div className="relative px-4 pb-3">
          <Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Mahsulot nomi yoki kodi..."
            className="input !bg-surface-secondary w-full"
            style={{ paddingLeft: '40px' }}
          />
        </div>

        {/* Search results dropdown */}
        {productSearch.trim().length > 0 && searchProducts.length > 0 && (
          <div className="mx-4 mb-3 max-h-48 overflow-auto rounded-xl border border-border bg-surface shadow-md">
            {searchProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => addProduct(p)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-surface-secondary active:bg-surface-tertiary transition-colors"
                style={{ minHeight: 'auto', borderBottom: '1px solid var(--color-border-subtle)' }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-text-primary leading-snug truncate">{p.name}</p>
                  <p className="text-[11px] text-text-muted">
                    {p.code != null && <span className="font-bold">#{p.code} · </span>}
                    {p.stock} ta · {formatCurrency(Number(p.price))}
                  </p>
                </div>
                <Plus className="h-4 w-4 shrink-0 text-primary-600" />
              </button>
            ))}
          </div>
        )}

        {/* Camera view */}
        {scanning && (
          <div className="relative mx-4 mb-3 overflow-hidden rounded-xl bg-black" style={{ aspectRatio: '16/9', maxHeight: '200px' }}>
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative h-[60%] w-[70%]">
                <div className="absolute left-0 top-0 h-5 w-5 border-l-[3px] border-t-[3px] border-primary-400 rounded-tl-md" />
                <div className="absolute right-0 top-0 h-5 w-5 border-r-[3px] border-t-[3px] border-primary-400 rounded-tr-md" />
                <div className="absolute bottom-0 left-0 h-5 w-5 border-b-[3px] border-l-[3px] border-primary-400 rounded-bl-md" />
                <div className="absolute bottom-0 right-0 h-5 w-5 border-b-[3px] border-r-[3px] border-primary-400 rounded-br-md" />
                <div className="absolute left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-primary-400 to-transparent animate-scan-line" />
              </div>
            </div>
            {lookupLoading && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-[11px] text-white backdrop-blur-sm">
                <Loader2 className="h-3 w-3 animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* Manual code input */}
        {manualMode && (
          <form onSubmit={handleManualSubmit} className="mx-4 mb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <ScanBarcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                ref={manualInputRef}
                type="text"
                inputMode="numeric"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="Kodni kiriting..."
                className="input !bg-surface-secondary"
                style={{ paddingLeft: '40px' }}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!manualBarcode.trim() || lookupLoading}
              className={cn(
                'flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition-all',
                manualBarcode.trim() && !lookupLoading ? 'bg-primary-600 hover:bg-primary-700' : 'bg-gray-300 cursor-not-allowed',
              )}
              style={{ minHeight: 'auto', minWidth: 'auto' }}
            >
              {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </button>
          </form>
        )}
      </div>

      {/* ═══ Middle: Cart Items ═══ */}
      <div className="flex-1 overflow-auto">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-text-muted px-6">
            <ShoppingBag className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">Savatcha bo'sh</p>
            <p className="mt-1 text-xs text-center">Mahsulotni qidiring yoki skanerlang</p>
          </div>
        ) : (
          <div className="px-3 py-2">
            {/* Cart header */}
            <div className="flex items-center justify-between px-1 pb-2">
              <p className="text-[13px] font-bold text-text-primary">
                Savatcha
                <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              </p>
              <button
                onClick={clearCart}
                className="text-[11px] font-medium text-danger-600 hover:text-danger-700 transition-colors"
                style={{ minHeight: 'auto', minWidth: 'auto' }}
              >
                Tozalash
              </button>
            </div>

            {/* Items */}
            <div className="space-y-1">
              {cart.map((item) => {
                const lineTotal = item.price * item.quantity * (1 - item.discount / 100);
                return (
                  <div
                    key={item.productId}
                    className="rounded-xl bg-surface px-3 py-2.5 transition-colors"
                    style={{ border: '1px solid var(--color-border-subtle)' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold text-text-primary leading-snug line-clamp-2 flex-1 min-w-0">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[13px] font-bold text-text-primary tabular-nums whitespace-nowrap">
                          {formatCurrency(lineTotal)}
                        </span>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="rounded-md p-0.5 text-danger-400 hover:bg-danger-50 hover:text-danger-600 transition-all"
                          style={{ minHeight: 'auto', minWidth: 'auto' }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <p className="text-xs text-text-muted tabular-nums">
                        {formatCurrency(item.price)} x {item.quantity}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-muted hover:bg-surface-tertiary hover:text-text-primary transition-colors"
                          style={{ minHeight: 'auto', minWidth: 'auto' }}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="flex h-7 min-w-[32px] items-center justify-center rounded-lg border border-border bg-surface-secondary/80 text-xs font-bold text-text-primary tabular-nums px-2">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-muted hover:bg-surface-tertiary hover:text-text-primary transition-colors"
                          style={{ minHeight: 'auto', minWidth: 'auto' }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Bottom: Customer + Submit ═══ */}
      {cart.length > 0 && (
        <div className="shrink-0 bg-surface p-4 space-y-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          {/* Customer selector */}
          <div>
            <p className="text-[12px] font-semibold text-text-secondary mb-1.5">Mijoz (ixtiyoriy)</p>
            {selectedCustomer ? (
              <div className="flex items-center justify-between rounded-lg bg-surface-secondary px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                    <User className="h-3 w-3" />
                  </div>
                  <span className="text-[13px] font-medium text-text-primary">{selectedCustomer.name}</span>
                </div>
                <button
                  onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}
                  className="text-[11px] font-medium text-danger-600 hover:text-danger-700"
                  style={{ minHeight: 'auto', minWidth: 'auto' }}
                >
                  Bekor
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Mijoz qidirish..."
                  className="input !text-[13px] !py-2"
                />
                {searchResults?.data && searchResults.data.length > 0 && (
                  <div className="max-h-28 overflow-auto rounded-lg border border-border">
                    {searchResults.data.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer({ id: c.id, name: c.name });
                          setCustomerSearch('');
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] hover:bg-surface-secondary transition-colors"
                        style={{ minHeight: 'auto' }}
                      >
                        <span className="font-medium text-text-primary">{c.name}</span>
                        <span className="text-text-muted">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Total */}
          <div className="flex justify-between items-baseline pt-2" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
            <span className="text-sm font-semibold text-text-primary">Jami</span>
            <span className="text-xl font-bold text-text-primary tabular-nums">{formatCurrency(total)}</span>
          </div>

          {/* Submit button */}
          {success ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-success-50 py-3 text-success-700">
              <Check className="h-5 w-5" />
              <span className="text-sm font-bold">Buyurtma yuborildi!</span>
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || cart.length === 0}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-bold text-white transition-all',
                !submitting && cart.length > 0
                  ? 'bg-success-600 hover:bg-success-700 active:scale-[0.98] shadow-sm'
                  : 'bg-gray-300 cursor-not-allowed',
              )}
              style={{ minHeight: 'auto' }}
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Buyurtma yuborish
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
