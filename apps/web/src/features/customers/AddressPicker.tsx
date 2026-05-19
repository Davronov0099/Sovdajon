import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, LocateFixed, Loader2, Search, X, Check } from 'lucide-react';
import type { Map as LeafletMap, Marker as LeafletMarker, TileLayer as LeafletTileLayer } from 'leaflet';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';

type LatLng = { lat: number; lng: number };

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const DEFAULT_CENTER: LatLng = { lat: 41.2995, lng: 69.2401 };
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

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

interface AddressPickerProps {
  /** Joriy manzil matni */
  value: string;
  /** Manzil tanlanganda chaqiriladi */
  onChange: (address: string) => void;
  label?: string;
  id?: string;
}

export function AddressPicker({ value, onChange, label = 'Manzil', id = 'address' }: AddressPickerProps) {
  const { toast } = useToast();
  const [mapOpen, setMapOpen] = useState(false);
  const [locating, setLocating] = useState(false);

  // Map modal state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [tempAddress, setTempAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);

  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileRef = useRef<LeafletTileLayer | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const [mapReady, setMapReady] = useState(false);

  /* ── Joriy joylashuv (xarita ochmasdan) ── */
  const useCurrentLocation = useCallback(() => {
    if (!window.isSecureContext) {
      toast('Joylashuv faqat HTTPS da ishlaydi', 'error');
      return;
    }
    if (!navigator.geolocation) {
      toast("Brauzer joylashuvni qo'llab-quvvatlamaydi", 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const addr = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        onChange(addr);
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
  }, [onChange, toast]);

  /* ── Xarita init ── */
  useEffect(() => {
    if (!mapOpen || !mapElRef.current || mapRef.current) return;
    let cancelled = false;

    async function init() {
      const L = await import('leaflet');
      if (cancelled || !mapElRef.current) return;
      const map = L.map(mapElRef.current, {
        center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
        zoom: 13,
        zoomControl: true,
        attributionControl: true,
      });
      tileRef.current = L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);

      map.on('click', async (e) => {
        const latlng: LatLng = { lat: e.latlng.lat, lng: e.latlng.lng };
        await placeMarker(latlng);
        setGeocoding(true);
        const addr = await reverseGeocode(latlng.lat, latlng.lng);
        setGeocoding(false);
        setTempAddress(addr);
      });

      mapRef.current = map;
      setMapReady(true);
    }
    void init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
      setMapReady(false);
    };
  }, [mapOpen]);

  const placeMarker = useCallback(async (latlng: LatLng) => {
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
  }, []);

  /* ── Jonli qidiruv (debounce, Enter shart emas) ── */
  useEffect(() => {
    if (!mapOpen) return;
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({
          format: 'json',
          q: `${q}, O'zbekiston`,
          countrycodes: 'uz',
          limit: '6',
          addressdetails: '0',
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          headers: { 'Accept-Language': 'uz,ru,en' },
        });
        const data: NominatimResult[] = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [query, mapOpen]);

  const selectResult = useCallback(async (r: NominatimResult) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    mapRef.current?.setView([lat, lng], 16);
    await placeMarker({ lat, lng });
    setTempAddress(r.display_name);
    setResults([]);
    setQuery(r.display_name.split(',')[0] ?? r.display_name);
  }, [placeMarker]);

  function openMap() {
    setTempAddress(value);
    setQuery('');
    setResults([]);
    setMapOpen(true);
  }

  function confirmAddress() {
    if (tempAddress.trim()) onChange(tempAddress.trim());
    setMapOpen(false);
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-text-primary">
        {label} <span className="text-[11px] font-normal text-text-muted">(ixtiyoriy)</span>
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          id={id}
          onClick={openMap}
          className="flex min-h-[44px] flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-left text-sm hover:border-primary-400 transition-colors"
        >
          <MapPin className="h-4 w-4 shrink-0 text-text-muted" />
          <span className={cn('truncate', value ? 'text-text-primary' : 'text-text-muted/60')}>
            {value || 'Manzilni tanlang (xaritadan)'}
          </span>
        </button>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          title="Joriy joylashuvni aniqlash"
          className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-50"
          style={{ minHeight: 'auto', minWidth: 'auto' }}
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
        </button>
      </div>

      {/* Map modal */}
      <Modal open={mapOpen} onClose={() => setMapOpen(false)} title="Manzilni tanlang" size="lg">
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
              placeholder="Manzil nomini yozing — taklif chiqadi..."
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

          {/* Map */}
          <div className="relative h-[320px] w-full overflow-hidden rounded-xl" style={{ border: '1px solid var(--color-border-subtle)' }}>
            <div ref={mapElRef} className="h-full w-full" style={{ background: '#e8eff4' }} />
            {!mapReady && (
              <div className="absolute inset-0 z-[500] flex items-center justify-center bg-surface-secondary">
                <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
              </div>
            )}
            {geocoding && (
              <div className="absolute left-1/2 top-3 z-[600] -translate-x-1/2 rounded-lg bg-surface/95 px-3 py-1.5 text-xs text-text-secondary shadow-card backdrop-blur">
                <Loader2 className="inline h-3.5 w-3.5 animate-spin text-primary-600 mr-1.5" />
                Manzil aniqlanmoqda...
              </div>
            )}
            {mapReady && !markerRef.current && (
              <div className="pointer-events-none absolute bottom-3 left-1/2 z-[500] -translate-x-1/2 rounded-xl px-4 py-2 text-[12px] font-semibold text-white shadow-xl"
                style={{ background: 'rgba(15,23,42,0.82)', backdropFilter: 'blur(8px)' }}>
                Xaritada manzilni bosing yoki qidiring
              </div>
            )}
          </div>

          {/* Selected */}
          {tempAddress && (
            <div className="flex items-start gap-2 rounded-lg bg-primary-50 px-3 py-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
              <p className="text-[12px] text-primary-700 line-clamp-2">{tempAddress}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setMapOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
              style={{ minHeight: 'auto' }}
            >
              Bekor qilish
            </button>
            <button
              type="button"
              onClick={confirmAddress}
              disabled={!tempAddress.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              style={{ minHeight: 'auto' }}
            >
              <Check className="h-4 w-4" /> Tasdiqlash
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
