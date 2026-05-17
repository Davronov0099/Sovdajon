import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  ArrowLeft,
  Search,
  X,
  Loader2,
  LocateFixed,
  MapPin,
  Save,
  Phone,
  CheckCircle2,
  RotateCcw,
  Crosshair,
} from 'lucide-react';
import type {
  Map as LeafletMap,
  Marker as LeafletMarker,
  TileLayer as LeafletTileLayer,
  Circle as LeafletCircle,
  CircleMarker as LeafletCircleMarker,
} from 'leaflet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { extractApiError } from '@/lib/apiError';
import { useCustomer, useUpdateCustomer } from '@/hooks/useCustomers';

type LatLng = { lat: number; lng: number };
type MapMode = 'street' | 'satellite';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const DEFAULT_CENTER: LatLng = { lat: 41.2995, lng: 69.2401 };

const STREET_TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const STREET_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const SATELLITE_TILE = 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
const SATELLITE_ATTR = '© Google Maps';

function parseCoords(note: string | null | undefined): LatLng | null {
  if (!note) return null;
  const match = note.match(/__coords:([\d.]+),([\d.]+)/);
  if (!match || !match[1] || !match[2]) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

function stripCoords(note: string | null | undefined): string {
  if (!note) return '';
  return note.replace(/\n?__coords:[\d.,]+/g, '').trim();
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=uz,ru`,
    );
    const data: { display_name?: string } = await res.json();
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export function CustomerLocationPage() {
  const { customerId } = useParams({ from: '/_auth/customers_/$customerId_/location' });
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data, isLoading } = useCustomer(customerId);
  const updateMut = useUpdateCustomer();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customer = (data as any)?.data as any;

  const originalCoords = useMemo(() => parseCoords(customer?.note), [customer?.note]);
  const originalNote = useMemo(() => stripCoords(customer?.note), [customer?.note]);

  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const baseTileRef = useRef<LeafletTileLayer | null>(null);
  const pinMarkerRef = useRef<LeafletMarker | null>(null);
  const originalMarkerRef = useRef<LeafletMarker | null>(null);
  const userDotRef = useRef<LeafletCircleMarker | null>(null);
  const userAccuracyRef = useRef<LeafletCircle | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>('street');
  const [picked, setPicked] = useState<LatLng | null>(null);
  const [pickedAddress, setPickedAddress] = useState<string>('');
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const hasChanged = useMemo(() => {
    if (!picked) return false;
    if (!originalCoords) return true;
    const dLat = Math.abs(picked.lat - originalCoords.lat);
    const dLng = Math.abs(picked.lng - originalCoords.lng);
    return dLat > 1e-6 || dLng > 1e-6;
  }, [picked, originalCoords]);

  // Build pin marker (red drop)
  const drawPin = useCallback(async (map: LeafletMap, latlng: LatLng) => {
    const L = await import('leaflet');
    if (pinMarkerRef.current) pinMarkerRef.current.remove();
    const icon = L.divIcon({
      className: '',
      html: `<div style="position:relative;width:38px;height:46px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.35))">
        <svg width="38" height="46" viewBox="0 0 38 46" fill="none">
          <path d="M19 0C8.51 0 0 8.51 0 19c0 14.25 19 27 19 27s19-12.75 19-27C38 8.51 29.49 0 19 0z" fill="#4f46e5"/>
          <circle cx="19" cy="19" r="9.5" fill="white"/>
          <circle cx="19" cy="19" r="5.5" fill="#4f46e5"/>
        </svg>
      </div>`,
      iconSize: [38, 46],
      iconAnchor: [19, 46],
      popupAnchor: [0, -46],
    });
    pinMarkerRef.current = L.marker([latlng.lat, latlng.lng], { icon }).addTo(map);
  }, []);

  // Faded marker for original location
  const drawOriginalMarker = useCallback(async (map: LeafletMap, latlng: LatLng) => {
    const L = await import('leaflet');
    if (originalMarkerRef.current) originalMarkerRef.current.remove();
    const icon = L.divIcon({
      className: '',
      html: `<div style="position:relative;width:30px;height:36px;opacity:0.55;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25))">
        <svg width="30" height="36" viewBox="0 0 38 46" fill="none">
          <path d="M19 0C8.51 0 0 8.51 0 19c0 14.25 19 27 19 27s19-12.75 19-27C38 8.51 29.49 0 19 0z" fill="#94a3b8"/>
          <circle cx="19" cy="19" r="6.5" fill="white"/>
        </svg>
      </div>`,
      iconSize: [30, 36],
      iconAnchor: [15, 36],
    });
    originalMarkerRef.current = L.marker([latlng.lat, latlng.lng], { icon, interactive: false })
      .bindTooltip('Joriy joylashuv', { direction: 'top', offset: [0, -28] })
      .addTo(map);
  }, []);

  // Init map once
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    let cancelled = false;

    async function init() {
      const L = await import('leaflet');
      if (cancelled || !mapElRef.current) return;

      const startCenter = originalCoords ?? DEFAULT_CENTER;
      const startZoom = originalCoords ? 16 : 13;

      const map = L.map(mapElRef.current, {
        center: [startCenter.lat, startCenter.lng],
        zoom: startZoom,
        zoomControl: true,
        attributionControl: true,
        doubleClickZoom: false,
      });

      baseTileRef.current = L.tileLayer(STREET_TILE, {
        attribution: STREET_ATTR,
        maxZoom: 21,
        maxNativeZoom: 19,
      }).addTo(map);

      let clickTimer: ReturnType<typeof setTimeout> | null = null;

      map.on('click', (e) => {
        if (clickTimer) return;
        clickTimer = setTimeout(async () => {
          clickTimer = null;
          const latlng: LatLng = { lat: e.latlng.lat, lng: e.latlng.lng };
          setPicked(latlng);
          await drawPin(map, latlng);
          setGeocoding(true);
          setPickedAddress('');
          const address = await reverseGeocode(latlng.lat, latlng.lng);
          setPickedAddress(address);
          setGeocoding(false);
        }, 260);
      });

      map.on('dblclick', (e) => {
        if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
        map.setView(e.latlng, map.getZoom() + 2, { animate: true });
      });

      mapRef.current = map;
      setMapReady(true);
    }

    void init();
    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      pinMarkerRef.current = null;
      originalMarkerRef.current = null;
      userDotRef.current = null;
      userAccuracyRef.current = null;
    };
  }, [drawPin, originalCoords]);

  // When customer loads, place the existing location and prefill pick
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (!originalCoords) return;
    const map = mapRef.current;
    void drawOriginalMarker(map, originalCoords);
    if (!picked) {
      setPicked(originalCoords);
      setPickedAddress(customer?.address ?? '');
      void drawPin(map, originalCoords);
      map.setView([originalCoords.lat, originalCoords.lng], 16, { animate: true });
    }
  }, [mapReady, originalCoords, drawOriginalMarker, drawPin, picked, customer?.address]);

  const switchMapMode = useCallback(async () => {
    if (!mapRef.current) return;
    const next: MapMode = mapMode === 'street' ? 'satellite' : 'street';
    const L = await import('leaflet');
    if (baseTileRef.current) { baseTileRef.current.remove(); baseTileRef.current = null; }
    baseTileRef.current = (next === 'satellite'
      ? L.tileLayer(SATELLITE_TILE, { attribution: SATELLITE_ATTR, subdomains: ['0', '1', '2', '3'], maxZoom: 21, maxNativeZoom: 20 })
      : L.tileLayer(STREET_TILE, { attribution: STREET_ATTR, maxZoom: 21, maxNativeZoom: 19 })
    ).addTo(mapRef.current);
    setMapMode(next);
  }, [mapMode]);

  const locateMe = useCallback(() => {
    if (!window.isSecureContext) {
      toast("Joylashuv faqat HTTPS yoki localhost da ishlaydi", 'error');
      return;
    }
    if (!navigator.geolocation) {
      toast("Brauzer joylashuvni qo'llab-quvvatlamaydi", 'error');
      return;
    }
    if (!mapRef.current) return;
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const map = mapRef.current;
        if (!map) { setLocating(false); return; }
        const L = await import('leaflet');

        userDotRef.current?.remove();
        userAccuracyRef.current?.remove();

        userAccuracyRef.current = L.circle([lat, lng], {
          radius: accuracy,
          color: '#4285F4',
          fillColor: '#4285F4',
          fillOpacity: 0.08,
          weight: 1,
          interactive: false,
        }).addTo(map);

        userDotRef.current = L.circleMarker([lat, lng], {
          radius: 9,
          color: '#fff',
          weight: 3,
          fillColor: '#4285F4',
          fillOpacity: 1,
          interactive: false,
        }).addTo(map);

        map.setView([lat, lng], 17, { animate: true });
        setLocating(false);
        toast("Joylashuv topildi — kerakli joyni bosing", 'info');
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) toast("Joylashuv ruxsati rad etilgan", 'error');
        else if (err.code === err.TIMEOUT) toast("Joylashuvni aniqlash vaqti tugadi", 'warning');
        else toast("Joylashuvni aniqlab bo'lmadi", 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, [toast]);

  const searchLocation = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const params = new URLSearchParams({
        format: 'json',
        q: `${searchQuery.trim()}, O'zbekiston`,
        countrycodes: 'uz',
        limit: '6',
        addressdetails: '0',
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: { 'Accept-Language': 'uz,ru,en' },
      });
      const result: NominatimResult[] = await res.json();
      setSearchResults(result);
      setSearchOpen(true);
    } catch { /* ignore */ } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const selectResult = useCallback((r: NominatimResult) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    mapRef.current?.setView([lat, lng], 16, { animate: true });
    setSearchResults([]);
    setSearchOpen(false);
    setSearchQuery(r.display_name.split(',')[0] ?? r.display_name);
  }, []);

  const resetToOriginal = useCallback(() => {
    if (!originalCoords || !mapRef.current) return;
    setPicked(originalCoords);
    setPickedAddress(customer?.address ?? '');
    void drawPin(mapRef.current, originalCoords);
    mapRef.current.setView([originalCoords.lat, originalCoords.lng], 16, { animate: true });
  }, [originalCoords, drawPin, customer?.address]);

  const centerOnPicked = useCallback(() => {
    if (!picked || !mapRef.current) return;
    mapRef.current.setView([picked.lat, picked.lng], 17, { animate: true });
  }, [picked]);

  const handleSave = useCallback(async () => {
    if (!picked || !customer) return;
    const coordsLine = `__coords:${picked.lat.toFixed(6)},${picked.lng.toFixed(6)}`;
    const newNote = originalNote
      ? `${originalNote}\n${coordsLine}`
      : coordsLine;
    try {
      await updateMut.mutateAsync({
        id: customerId,
        name: customer.name,
        phone: customer.phone,
        address: pickedAddress || customer.address || undefined,
        note: newNote,
      });
      toast('Joylashuv saqlandi', 'success');
      navigate({ to: '/customers/$customerId', params: { customerId } });
    } catch (err) {
      const msg = await extractApiError(err, 'Joylashuvni saqlashda xatolik');
      toast(msg, 'error', { duration: 6000 });
    }
  }, [picked, customer, originalNote, updateMut, customerId, pickedAddress, toast, navigate]);

  return (
    <div className="flex h-[calc(100vh-var(--header-height,56px))] flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex shrink-0 items-center gap-3 px-4 py-2.5"
        style={{ borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-surface)' }}
      >
        <button
          onClick={() => navigate({ to: '/customers/$customerId', params: { customerId } })}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-secondary transition-colors"
          style={{ minHeight: 'auto', minWidth: 'auto' }}
          title="Ortga"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : customer ? (
            <>
              <h1 className="truncate text-sm font-bold text-text-primary">
                {customer.name} — Joylashuv
              </h1>
              <p className="flex items-center gap-1 truncate text-[11px] text-text-muted">
                <Phone className="h-2.5 w-2.5" />{customer.phone}
              </p>
            </>
          ) : (
            <h1 className="text-sm font-bold text-text-primary">Mijoz topilmadi</h1>
          )}
        </div>
        {originalCoords && hasChanged && (
          <button
            onClick={resetToOriginal}
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-surface-secondary px-2.5 py-1.5 text-[11px] font-medium text-text-secondary hover:bg-surface-tertiary transition-colors"
            style={{ minHeight: 'auto', minWidth: 'auto' }}
            title="Joriy joylashuvga qaytarish"
          >
            <RotateCcw className="h-3 w-3" />
            Qaytarish
          </button>
        )}
      </div>

      {/* MAP */}
      <div className="relative flex-1 overflow-hidden">
        <div ref={mapElRef} className="h-full w-full" style={{ background: '#e8eff4' }} />

        {!mapReady && (
          <div className="absolute inset-0 z-[400] flex items-center justify-center bg-surface-secondary">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              <p className="text-sm text-text-muted">Xarita yuklanmoqda...</p>
            </div>
          </div>
        )}

        {/* Search bar */}
        <div className="absolute left-3 top-3 z-[500]" style={{ width: 'min(360px, calc(100% - 64px))' }}>
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted/70" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
                  placeholder="Qishloq, shahar, ko'cha..."
                  className="h-9 w-full rounded-xl border border-white/60 bg-white/80 pl-9 pr-8 text-[13px] shadow-md backdrop-blur-md focus:bg-white focus:outline-2 focus:outline-primary-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchOpen(false); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    style={{ minHeight: 'auto', minWidth: 'auto' }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <button
                onClick={searchLocation}
                disabled={searching || !searchQuery.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600/90 text-white shadow-md backdrop-blur hover:bg-primary-700 disabled:opacity-50 transition-colors"
                style={{ minHeight: 'auto', minWidth: 'auto' }}
                title="Qidirish"
              >
                {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              </button>
            </div>

            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-11 z-[600] w-full overflow-hidden rounded-xl border border-border bg-surface shadow-dropdown">
                {searchResults.map((r) => (
                  <button
                    key={r.place_id}
                    onClick={() => selectResult(r)}
                    className="flex w-full items-center gap-2.5 border-b border-border/50 px-3 py-2.5 text-left last:border-0 hover:bg-surface-secondary transition-colors"
                    style={{ minHeight: 'auto' }}
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                    <span className="line-clamp-1 text-[13px] text-text-secondary">{r.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right controls */}
        <div className="absolute right-3 top-3 z-[500] flex flex-col gap-2">
          <button
            onClick={locateMe}
            disabled={locating}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 shadow-md backdrop-blur transition-colors hover:bg-white"
            style={{ border: '1.5px solid rgba(0,0,0,0.12)', minHeight: 'auto', minWidth: 'auto' }}
            title="Joylashuvimni topish"
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin text-primary-600" /> : <LocateFixed className="h-4 w-4 text-gray-700" />}
          </button>

          {picked && (
            <button
              onClick={centerOnPicked}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 shadow-md backdrop-blur transition-colors hover:bg-white"
              style={{ border: '1.5px solid rgba(0,0,0,0.12)', minHeight: 'auto', minWidth: 'auto' }}
              title="Tanlangan nuqtaga"
            >
              <Crosshair className="h-4 w-4 text-primary-600" />
            </button>
          )}

          <button
            onClick={switchMapMode}
            title={mapMode === 'satellite' ? "Yo'l xaritasi" : "Sun'iy yo'ldosh"}
            className="group relative overflow-hidden rounded-xl shadow-md transition-all hover:scale-105"
            style={{
              width: 44, height: 44,
              border: mapMode === 'satellite' ? '2.5px solid #4f46e5' : '2px solid rgba(0,0,0,0.18)',
              minHeight: 'auto', minWidth: 'auto',
            }}
          >
            <img
              src="https://mt0.google.com/vt/lyrs=y&x=371&y=200&z=9"
              alt="satellite"
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
            <div className={cn(
              'absolute inset-0 flex flex-col items-center justify-end pb-0.5 transition-all',
              mapMode === 'satellite' ? 'bg-black/0' : 'bg-black/30 group-hover:bg-black/20',
            )}>
              <span className="text-[9px] font-bold text-white drop-shadow" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                {mapMode === 'satellite' ? "Yo'l" : 'Sat'}
              </span>
            </div>
          </button>
        </div>

        {/* Bottom hint when no pick yet */}
        {mapReady && !picked && !isLoading && (
          <div
            className="pointer-events-none absolute bottom-6 left-1/2 z-[500] -translate-x-1/2 rounded-2xl px-5 py-2.5 shadow-xl"
            style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <p className="flex items-center gap-2.5 whitespace-nowrap text-[12px] font-semibold text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-500">
                <MapPin className="h-3 w-3 text-white" />
              </span>
              Xaritani bosib joylashuvni belgilang
            </p>
          </div>
        )}

        {/* Bottom selected location card */}
        {picked && (
          <div
            className="absolute bottom-4 left-1/2 z-[500] w-[min(440px,calc(100%-24px))] -translate-x-1/2 overflow-hidden rounded-2xl shadow-2xl animate-fade-in"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)' }}
          >
            {/* Header strip */}
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: hasChanged ? 'rgb(79 70 229 / 0.08)' : 'rgb(34 197 94 / 0.08)', borderBottom: '1px solid var(--color-border-subtle)' }}>
              {hasChanged ? (
                <>
                  <MapPin className="h-3.5 w-3.5 text-primary-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary-700">
                    {originalCoords ? "Yangi joylashuv tanlandi" : "Joylashuv tanlandi"}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-success-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-success-700">
                    Joriy joylashuv
                  </span>
                </>
              )}
              <span className="ml-auto rounded-md bg-surface px-2 py-0.5 text-[10px] font-mono text-text-muted tabular-nums">
                {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}
              </span>
            </div>

            {/* Body */}
            <div className="px-4 py-3">
              <div className="flex items-start gap-2.5">
                <div className={cn(
                  'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                  hasChanged ? 'bg-primary-100' : 'bg-success-100',
                )}>
                  <MapPin className={cn('h-3.5 w-3.5', hasChanged ? 'text-primary-700' : 'text-success-700')} />
                </div>
                <div className="min-w-0 flex-1">
                  {geocoding ? (
                    <div className="flex items-center gap-1.5 text-[12px] text-text-muted">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Manzil aniqlanmoqda...
                    </div>
                  ) : (
                    <p className="line-clamp-2 text-[12px] leading-snug text-text-secondary">
                      {pickedAddress || "Manzil noma'lum"}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {originalCoords && hasChanged && (
                  <button
                    onClick={resetToOriginal}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-surface-secondary px-3 py-2 text-[12px] font-medium text-text-secondary hover:bg-surface-tertiary transition-colors"
                    style={{ minHeight: 'auto', minWidth: 'auto' }}
                    title="Joriy joylashuvga qaytarish"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Qaytarish</span>
                  </button>
                )}
                <Button
                  onClick={handleSave}
                  loading={updateMut.isPending}
                  disabled={!hasChanged || geocoding || updateMut.isPending}
                  className="flex-1"
                >
                  <Save className="h-4 w-4" />
                  {hasChanged ? 'Joylashuvni saqlash' : 'Saqlangan'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
