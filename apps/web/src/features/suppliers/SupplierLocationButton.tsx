import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, LocateFixed, Loader2, Search, X, Check, Eye, Satellite, Map as MapIcon } from 'lucide-react';
import type { Map as LeafletMap, Marker as LeafletMarker, TileLayer as LeafletTileLayer } from 'leaflet';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useUpdateSupplier } from '@/hooks/useSuppliers';
import { cn } from '@/lib/cn';

type LatLng = { lat: number; lng: number };

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

type MapMode = 'street' | 'satellite';
const DEFAULT_CENTER: LatLng = { lat: 41.2995, lng: 69.2401 };
const STREET_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const STREET_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const SAT_URL = 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
const SAT_ATTR = '© Google Maps';

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=uz,ru`);
    const data: { display_name?: string } = await res.json();
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

interface Props {
  supplierId: string;
  /** Joriy saqlangan koordinatalar (null = kiritilmagan) */
  latitude: number | null;
  longitude: number | null;
  /** Mavjud manzil — ko'rish rejimida ko'rsatish uchun */
  address?: string | null;
}

export function SupplierLocationButton({ supplierId, latitude, longitude, address }: Props) {
  const { toast } = useToast();
  const updateMut = useUpdateSupplier();
  const hasLocation = latitude != null && longitude != null;

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('edit');
  const [mapMode, setMapMode] = useState<MapMode>('street');
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<LatLng | null>(null);
  const [pickedAddress, setPickedAddress] = useState<string>('');
  const [geocoding, setGeocoding] = useState(false);

  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileRef = useRef<LeafletTileLayer | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);

  function openModal() {
    if (hasLocation) {
      setMode('view');
      setPicked({ lat: latitude!, lng: longitude! });
      setPickedAddress(address ?? '');
    } else {
      setMode('edit');
      setPicked(null);
      setPickedAddress('');
    }
    setQuery('');
    setResults([]);
    setOpen(true);
  }

  /* ── Map init ── */
  useEffect(() => {
    if (!open || !mapElRef.current || mapRef.current) return;
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let invalidateTimer: ReturnType<typeof setTimeout> | null = null;

    async function init() {
      const L = await import('leaflet');
      if (cancelled || !mapElRef.current) return;
      const initial = picked ?? DEFAULT_CENTER;
      const map = L.map(mapElRef.current, {
        center: [initial.lat, initial.lng],
        zoom: picked ? 16 : 12,
        zoomControl: true,
      });
      tileRef.current = L.tileLayer(STREET_URL, {
        attribution: STREET_ATTR,
        maxZoom: 21,
        maxNativeZoom: 19,
      }).addTo(map);
      mapRef.current = map;

      // CRITICAL: Modal-da xarita init bo'lganda container o'lchami hali aniq
      // bo'lmasligi mumkin — invalidateSize'siz tile'lar bo'sh qoladi.
      // Bir necha bor chaqiramiz turli vaqtlarda (modal animatsiyasi tugashini kutib)
      const invalidate = () => {
        if (mapRef.current && !cancelled) mapRef.current.invalidateSize();
      };
      [50, 150, 300, 600].forEach((ms) => {
        invalidateTimer = setTimeout(invalidate, ms);
      });

      // Container o'lchami o'zgarganda ham invalidate qilamiz
      if (mapElRef.current && typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => {
          if (mapRef.current && !cancelled) mapRef.current.invalidateSize();
        });
        ro.observe(mapElRef.current);
      }

      setMapReady(true);

      // View mode — drop marker for saved location
      if (picked) {
        await drawMarker(picked);
      }

      // Edit mode — clicking the map picks a location
      if (mode === 'edit') {
        map.on('click', async (e) => {
          const latlng: LatLng = { lat: e.latlng.lat, lng: e.latlng.lng };
          await drawMarker(latlng);
          setPicked(latlng);
          setGeocoding(true);
          const addr = await reverseGeocode(latlng.lat, latlng.lng);
          setGeocoding(false);
          setPickedAddress(addr);
        });
      }
    }
    void init();

    return () => {
      cancelled = true;
      if (invalidateTimer) clearTimeout(invalidateTimer);
      ro?.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      tileRef.current = null;
      markerRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ── Tile mode switch (street ↔ satellite) ── */
  const switchTiles = useCallback(async (next: MapMode) => {
    const map = mapRef.current;
    if (!map) return;
    const L = await import('leaflet');
    if (tileRef.current) { tileRef.current.remove(); tileRef.current = null; }
    if (next === 'satellite') {
      tileRef.current = L.tileLayer(SAT_URL, {
        attribution: SAT_ATTR,
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 21,
        maxNativeZoom: 20,
      }).addTo(map);
    } else {
      tileRef.current = L.tileLayer(STREET_URL, {
        attribution: STREET_ATTR,
        maxZoom: 21,
        maxNativeZoom: 19,
      }).addTo(map);
    }
    setMapMode(next);
  }, []);

  const drawMarker = useCallback(async (latlng: LatLng) => {
    const map = mapRef.current;
    if (!map) return;
    const L = await import('leaflet');
    if (markerRef.current) markerRef.current.remove();
    const icon = L.divIcon({
      className: '',
      html: `<div style="filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4))">
        <svg width="34" height="42" viewBox="0 0 34 42" fill="none">
          <path d="M17 0C7.6 0 0 7.6 0 17c0 12.75 17 25 17 25s17-12.25 17-25C34 7.6 26.4 0 17 0z" fill="#ef4444"/>
          <circle cx="17" cy="17" r="8" fill="white"/><circle cx="17" cy="17" r="5" fill="#ef4444"/>
        </svg></div>`,
      iconSize: [34, 42],
      iconAnchor: [17, 42],
    });
    markerRef.current = L.marker([latlng.lat, latlng.lng], { icon }).addTo(map);
    map.setView([latlng.lat, latlng.lng], 16, { animate: true });
  }, []);

  /* ── Jonli qidiruv (real-time) ── */
  useEffect(() => {
    if (!open || mode !== 'edit') return;
    const q = query.trim();
    if (q.length < 1) { setResults([]); setSearching(false); return; }

    setSearching(true); // Loader darhol ko'rinadi
    const handle = setTimeout(async () => {
      // Avvalgi so'rovni bekor qilamiz (stale natijalar oldini olish)
      searchAbortRef.current?.abort();
      const ctrl = new AbortController();
      searchAbortRef.current = ctrl;
      try {
        const params = new URLSearchParams({
          format: 'json',
          q: `${q}, O'zbekiston`,
          countrycodes: 'uz',
          limit: '8',
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          headers: { 'Accept-Language': 'uz,ru,en' },
          signal: ctrl.signal,
        });
        const data: NominatimResult[] = await res.json();
        if (!ctrl.signal.aborted) {
          setResults(Array.isArray(data) ? data : []);
          setSearching(false);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setResults([]);
        setSearching(false);
      }
    }, 180); // 400 -> 180ms (deyarli darhol)
    return () => clearTimeout(handle);
  }, [query, open, mode]);

  const selectResult = useCallback(async (r: NominatimResult) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    await drawMarker({ lat, lng });
    setPicked({ lat, lng });
    setPickedAddress(r.display_name);
    setResults([]);
    setQuery(r.display_name.split(',')[0] ?? r.display_name);
  }, [drawMarker]);

  /* ── Joriy joylashuv (GPS) ── */
  function useCurrentLocation() {
    if (!window.isSecureContext) { toast('Joylashuv faqat HTTPS da ishlaydi', 'error'); return; }
    if (!navigator.geolocation) { toast("Brauzer joylashuvni qo'llab-quvvatlamaydi", 'error'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        await drawMarker(latlng);
        setPicked(latlng);
        setGeocoding(true);
        const addr = await reverseGeocode(latlng.lat, latlng.lng);
        setGeocoding(false);
        setPickedAddress(addr);
        setLocating(false);
        toast('Joylashuv aniqlandi', 'success');
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) toast('Joylashuv ruxsati rad etilgan', 'error');
        else if (err.code === err.TIMEOUT) toast('Joylashuvni aniqlash vaqti tugadi', 'warning');
        else toast("Joylashuvni aniqlab bo'lmadi", 'error');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }

  async function saveLocation() {
    if (!picked) return;
    try {
      await updateMut.mutateAsync({
        id: supplierId,
        latitude: picked.lat,
        longitude: picked.lng,
        // Agar yangi manzil aniqlangan bo'lsa, address ham yangilanadi (yangi)
        ...(pickedAddress && !address ? { address: pickedAddress } : {}),
      });
      toast('Joylashuv saqlandi', 'success');
      setOpen(false);
    } catch {
      toast('Saqlashda xatolik', 'error');
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] sm:text-sm font-semibold transition-colors',
          hasLocation
            ? 'bg-primary-50 text-primary-700 hover:bg-primary-100'
            : 'bg-warning-50 text-warning-700 hover:bg-warning-100',
        )}
        style={{ minHeight: 'auto', minWidth: 'auto' }}
        title={hasLocation ? "Joylashuvni xaritada ko'rish" : 'Ta\'minotchining joylashuvini kiritish'}
      >
        {hasLocation ? <Eye className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
        <span className="hidden sm:inline">{hasLocation ? "Joylashuvni ko'rish" : 'Joylashuvni kiritish'}</span>
        <span className="sm:hidden">{hasLocation ? "Ko'rish" : 'Joylashuv'}</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={mode === 'view' ? "Joylashuv" : 'Joylashuvni tanlang'} size="lg">
        <div className="space-y-3">
          {mode === 'edit' && (
            <>
              {/* Search + GPS */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    placeholder="Manzilni qidirish — taklif chiqadi..."
                    className="w-full rounded-lg border border-border bg-surface pl-9 pr-9 py-2.5 text-sm focus:outline-2 focus:outline-primary-500"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => { setQuery(''); setResults([]); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                      style={{ minHeight: 'auto', minWidth: 'auto' }}
                    >
                      {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    </button>
                  )}
                  {results.length > 0 && (
                    <div className="absolute z-[1000] mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-dropdown">
                      <div className="max-h-52 overflow-auto">
                        {results.map((r) => (
                          <button
                            key={r.place_id}
                            type="button"
                            onClick={() => selectResult(r)}
                            className="flex w-full items-center gap-2 border-b border-border/40 px-3 py-2.5 text-left last:border-0 hover:bg-surface-secondary"
                            style={{ minHeight: 'auto' }}
                          >
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                            <span className="line-clamp-2 text-[13px] text-text-secondary">{r.display_name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={locating}
                  className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2.5 text-[12px] sm:text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                  style={{ minHeight: 'auto', minWidth: 'auto' }}
                  title="Joriy GPS joylashuvini olish"
                >
                  {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                  <span className="hidden sm:inline">Joriy joylashuv</span>
                </button>
              </div>
            </>
          )}

          {/* Map */}
          <div className="relative h-[360px] w-full overflow-hidden rounded-xl" style={{ border: '1px solid var(--color-border-subtle)' }}>
            <div ref={mapElRef} className="h-full w-full" style={{ background: '#e8eff4' }} />

            {/* Street ↔ Satellite toggle */}
            {mapReady && (
              <div className="absolute right-3 top-3 z-[600] flex overflow-hidden rounded-lg shadow-md" style={{ border: '1px solid rgba(0,0,0,0.12)' }}>
                <button
                  type="button"
                  onClick={() => mapMode !== 'street' && switchTiles('street')}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
                    mapMode === 'street' ? 'bg-primary-600 text-white' : 'bg-surface/95 text-text-primary hover:bg-surface',
                  )}
                  style={{ minHeight: 'auto', minWidth: 'auto' }}
                  title="Yo'l xaritasi"
                >
                  <MapIcon className="h-3.5 w-3.5" /> Yo'l
                </button>
                <button
                  type="button"
                  onClick={() => mapMode !== 'satellite' && switchTiles('satellite')}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
                    mapMode === 'satellite' ? 'bg-primary-600 text-white' : 'bg-surface/95 text-text-primary hover:bg-surface',
                  )}
                  style={{ minHeight: 'auto', minWidth: 'auto' }}
                  title="Sun'iy yo'ldosh ko'rinishi"
                >
                  <Satellite className="h-3.5 w-3.5" /> Sat
                </button>
              </div>
            )}

            {!mapReady && (
              <div className="absolute inset-0 z-[500] flex items-center justify-center bg-surface-secondary">
                <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
              </div>
            )}
            {geocoding && (
              <div className="absolute left-1/2 top-3 z-[600] -translate-x-1/2 rounded-lg bg-surface/95 px-3 py-1.5 text-xs text-text-secondary shadow-card">
                <Loader2 className="inline h-3.5 w-3.5 animate-spin text-primary-600 mr-1.5" />
                Manzil aniqlanmoqda...
              </div>
            )}
            {mode === 'edit' && mapReady && !picked && (
              <div className="pointer-events-none absolute bottom-3 left-1/2 z-[500] -translate-x-1/2 rounded-xl px-4 py-2 text-[12px] font-semibold text-white shadow-xl"
                style={{ background: 'rgba(15,23,42,0.82)' }}>
                Xaritada nuqtani bosing yoki qidiring
              </div>
            )}
          </div>

          {/* Selected info */}
          {picked && (
            <div className="rounded-lg bg-primary-50 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                <div className="min-w-0 flex-1">
                  {pickedAddress && <p className="text-[12px] text-primary-700 line-clamp-2">{pickedAddress}</p>}
                  <p className="mt-0.5 text-[10px] text-primary-600 tabular-nums">
                    {picked.lat.toFixed(6)}, {picked.lng.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between gap-2 pt-1">
            {mode === 'view' && hasLocation && (
              <button
                type="button"
                onClick={() => { setMode('edit'); setResults([]); }}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
                style={{ minHeight: 'auto' }}
              >
                O'zgartirish
              </button>
            )}
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
                style={{ minHeight: 'auto' }}
              >
                Yopish
              </button>
              {mode === 'edit' && (
                <button
                  type="button"
                  onClick={saveLocation}
                  disabled={!picked || updateMut.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                  style={{ minHeight: 'auto' }}
                >
                  {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Saqlash
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
