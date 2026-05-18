import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Search,
  MapPin,
  LocateFixed,
  Loader2,
  Users,
  Circle,
  Layers,
  X,
  Bookmark,
  BookmarkCheck,
  Trash2,
  Navigation,
} from 'lucide-react';
import type { Map as LeafletMap, Circle as LeafletCircle, CircleMarker as LeafletCircleMarker, Marker as LeafletMarker } from 'leaflet';
import { cn } from '@/lib/cn';
import { safeUUID } from '@/lib/uuid';
import { useInfiniteCustomers } from '@/hooks/useCustomers';

type LatLng = { lat: number; lng: number };
type ActivePanel = 'settings' | 'saved' | null;

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

interface SavedPin {
  id: string;
  lat: number;
  lng: number;
  address: string;
  savedAt: string;
}

const DEFAULT_CENTER: LatLng = { lat: 41.2995, lng: 69.2401 };
const SAVED_PINS_KEY = 'map_saved_pins';

const TILE_LAYERS = [
  {
    key: 'standard',
    label: "Standart yo'llar",
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  {
    key: 'cycle',
    label: "Batafsil yo'llar",
    url: 'https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png',
    attribution: '© <a href="https://cycling.waymarkedtrails.org">Waymarked Trails</a>',
  },
  {
    key: 'humanitarian',
    label: "Qishloq yo'llari",
    url: 'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, Tiles courtesy of Humanitarian OpenStreetMap Team',
  },
] as const;

function formatKm(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function parseCustomerCoords(note: string | null): LatLng | null {
  if (!note) return null;
  const match = note.match(/__coords:([\d.]+),([\d.]+)/);
  if (!match || !match[1] || !match[2]) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

function stripCoords(note: string | null): string {
  if (!note) return '';
  return note.replace(/\n?__coords:[\d.,]+/g, '').trim();
}

function loadSavedPins(): SavedPin[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_PINS_KEY) ?? '[]') as SavedPin[];
  } catch {
    return [];
  }
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

export function CustomerMapPage() {
  const navigate = useNavigate();
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const circleRef = useRef<LeafletCircle | null>(null);
  const customerMarkersRef = useRef<LeafletCircleMarker[]>([]);
  const locationMarkerRef = useRef<LeafletMarker | null>(null);
  const savedPinMarkersRef = useRef<LeafletMarker[]>([]);

  const [center, setCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [radiusKm, setRadiusKm] = useState<number>(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [tileKey, setTileKey] = useState<'standard' | 'cycle' | 'humanitarian'>('standard');
  const [mapReady, setMapReady] = useState(false);
  const [showCustomers, setShowCustomers] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const [savedPins, setSavedPins] = useState<SavedPin[]>(loadSavedPins);
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [geocodingPin, setGeocodingPin] = useState(false);

  const { data } = useInfiniteCustomers({ limit: 200 });
  const customers = data?.pages.flatMap((p) => p.data) ?? [];
  const customersWithCoords = customers.filter((c) => parseCustomerCoords(c.note));
  const tileLayer = TILE_LAYERS.find((t) => t.key === tileKey) ?? TILE_LAYERS[0];

  const togglePanel = (panel: ActivePanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  const savePin = useCallback((pin: { lat: number; lng: number; address: string }) => {
    const newPin: SavedPin = {
      id: safeUUID(),
      lat: pin.lat,
      lng: pin.lng,
      address: pin.address,
      savedAt: new Date().toISOString(),
    };
    setSavedPins((prev) => {
      const updated = [newPin, ...prev];
      localStorage.setItem(SAVED_PINS_KEY, JSON.stringify(updated));
      return updated;
    });
    setPendingPin(null);
    setActivePanel('saved');
  }, []);

  const deletePin = useCallback((id: string) => {
    setSavedPins((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      localStorage.setItem(SAVED_PINS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateCircle = useCallback(async (map: LeafletMap, pos: LatLng, radiusM: number) => {
    const L = await import('leaflet');
    if (circleRef.current) {
      circleRef.current.setLatLng([pos.lat, pos.lng]);
      circleRef.current.setRadius(radiusM);
    } else {
      circleRef.current = L.circle([pos.lat, pos.lng], {
        radius: radiusM,
        color: '#4f46e5',
        fillColor: '#4f46e5',
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '6 4',
      }).addTo(map);
    }
  }, []);

  const updateCustomerMarkers = useCallback(async (map: LeafletMap) => {
    const L = await import('leaflet');
    customerMarkersRef.current.forEach((m) => m.remove());
    customerMarkersRef.current = [];
    if (!showCustomers) return;
    customersWithCoords.forEach((c) => {
      const coords = parseCustomerCoords(c.note);
      if (!coords) return;
      const marker = L.circleMarker([coords.lat, coords.lng], {
        radius: 8,
        color: '#fff',
        weight: 2,
        fillColor: '#4f46e5',
        fillOpacity: 0.9,
      })
        .bindPopup(
          `<div style="min-width:160px">
            <strong style="font-size:13px">${c.name}</strong>
            <br/><span style="font-size:11px;color:#6b7280">${c.phone}</span>
            ${stripCoords(c.note) ? `<br/><span style="font-size:11px;color:#6b7280">${stripCoords(c.note)}</span>` : ''}
          </div>`,
        )
        .addTo(map);
      customerMarkersRef.current.push(marker);
    });
  }, [showCustomers, customersWithCoords]);

  const updateSavedPinMarkers = useCallback(async (map: LeafletMap, pins: SavedPin[]) => {
    const L = await import('leaflet');
    savedPinMarkersRef.current.forEach((m) => m.remove());
    savedPinMarkersRef.current = [];
    pins.forEach((pin) => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:32px;height:38px;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.35))">
          <svg width="32" height="38" viewBox="0 0 32 38" fill="none">
            <path d="M16 0C7.16 0 0 7.16 0 16c0 11.5 16 22 16 22s16-10.5 16-22C32 7.16 24.84 0 16 0z" fill="#f59e0b"/>
            <polygon points="16,7 18.5,13 25,13 19.8,16.8 21.8,23 16,19.5 10.2,23 12.2,16.8 7,13 13.5,13" fill="white"/>
          </svg>
        </div>`,
        iconSize: [32, 38],
        iconAnchor: [16, 38],
        popupAnchor: [0, -38],
      });
      const marker = L.marker([pin.lat, pin.lng], { icon })
        .bindPopup(
          `<div style="min-width:180px;padding:2px 0">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="font-size:14px">⭐</span>
              <strong style="font-size:12px;color:#92400e">Saqlangan joy</strong>
            </div>
            <p style="font-size:11px;color:#374151;line-height:1.4">${pin.address}</p>
            <p style="font-size:10px;color:#9ca3af;margin-top:4px">${new Date(pin.savedAt).toLocaleDateString('uz-UZ')}</p>
          </div>`,
        )
        .addTo(map);
      savedPinMarkersRef.current.push(marker);
    });
  }, []);

  // Init map
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    let cancelled = false;

    async function init() {
      const L = await import('leaflet');
      if (cancelled || !mapElRef.current) return;

      const map = L.map(mapElRef.current, {
        center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
        zoom: 13,
        zoomControl: true,
        doubleClickZoom: false,
      });

      L.tileLayer(TILE_LAYERS[0].url, {
        attribution: TILE_LAYERS[0].attribution,
        maxZoom: 21,
        maxNativeZoom: 19,
      }).addTo(map);

      let clickTimer: ReturnType<typeof setTimeout> | null = null;

      map.on('click', (e) => {
        if (clickTimer) return;
        clickTimer = setTimeout(async () => {
          clickTimer = null;
          const lat = e.latlng.lat;
          const lng = e.latlng.lng;
          setCenter({ lat, lng });
          setGeocodingPin(true);
          setPendingPin({ lat, lng, address: '' });
          const address = await reverseGeocode(lat, lng);
          setGeocodingPin(false);
          setPendingPin({ lat, lng, address });
        }, 280);
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
    };
  }, []);

  // Tile layer
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;
    async function updateTile() {
      const L = await import('leaflet');
      map.eachLayer((layer) => { if ((layer as { _url?: string })._url) map.removeLayer(layer); });
      L.tileLayer(tileLayer.url, { attribution: tileLayer.attribution, maxZoom: 21, maxNativeZoom: 19 }).addTo(map);
    }
    void updateTile();
  }, [tileKey, tileLayer, mapReady]);

  // Circle + pan
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;
    map.panTo([center.lat, center.lng]);
    void updateCircle(map, center, radiusKm * 1000);
  }, [center, radiusKm, mapReady, updateCircle]);

  // Customer markers
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    void updateCustomerMarkers(mapRef.current);
  }, [showCustomers, mapReady, updateCustomerMarkers]);

  // Saved pin markers
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    void updateSavedPinMarkers(mapRef.current, savedPins);
  }, [mapReady, savedPins, updateSavedPinMarkers]);

  // Location dot marker
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    async function update() {
      const L = await import('leaflet');
      const map = mapRef.current!;
      if (locationMarkerRef.current) locationMarkerRef.current.remove();
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;background:#ef4444;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      locationMarkerRef.current = L.marker([center.lat, center.lng], { icon })
        .bindTooltip(`${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`, { permanent: false })
        .addTo(map);
    }
    void update();
  }, [center, mapReady]);

  const fetchSuggestions = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    searchAbortRef.current?.abort();
    const ctrl = new AbortController();
    searchAbortRef.current = ctrl;
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
        signal: ctrl.signal,
      });
      const data: NominatimResult[] = await res.json();
      if (ctrl.signal.aborted) return;
      setSearchResults(data);
      setSearchOpen(data.length > 0);
    } catch { /* ignore */ } finally {
      if (searchAbortRef.current === ctrl) searchAbortRef.current = null;
      setSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback((val: string) => {
    setSearchQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!val.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    searchDebounceRef.current = setTimeout(() => { void fetchSuggestions(val); }, 350);
  }, [fetchSuggestions]);

  useEffect(() => () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchAbortRef.current?.abort();
  }, []);

  const selectSearchResult = useCallback((result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchAbortRef.current?.abort();
    setCenter({ lat, lng });
    mapRef.current?.setView([lat, lng], 14);
    setSearchResults([]);
    setSearchOpen(false);
    setSearchQuery(result.display_name.split(',')[0] ?? result.display_name);
  }, []);

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(latlng);
        mapRef.current?.setView([latlng.lat, latlng.lng], 15);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  return (
    <div className="relative h-[calc(100vh-var(--header-height,56px))] overflow-hidden">
      {/* Full-screen map */}
      <div ref={mapElRef} className="absolute inset-0" style={{ background: '#e8eff4' }} />

      {!mapReady && (
        <div className="absolute inset-0 z-[400] flex items-center justify-center bg-surface-secondary">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            <p className="text-sm text-text-muted">Xarita yuklanmoqda...</p>
          </div>
        </div>
      )}

      {/* ── TOP-LEFT: back + tab buttons ── */}
      <div className="absolute left-3 top-3 z-[500] flex items-center gap-2">
        {/* Back */}
        <button
          onClick={() => navigate({ to: '/customers' })}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 shadow-md backdrop-blur hover:bg-white transition-colors"
          style={{ border: '1.5px solid rgba(0,0,0,0.10)', minHeight: 'auto', minWidth: 'auto' }}
          title="Ortga"
        >
          <ArrowLeft className="h-4 w-4 text-gray-700" />
        </button>

        {/* Tab pill */}
        <div
          className="flex overflow-hidden rounded-xl shadow-md backdrop-blur"
          style={{ background: 'rgba(255,255,255,0.95)', border: '1.5px solid rgba(0,0,0,0.10)' }}
        >
          <button
            onClick={() => togglePanel('settings')}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold transition-colors',
              activePanel === 'settings'
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:bg-gray-100',
            )}
            style={{ minHeight: 'auto', minWidth: 'auto' }}
          >
            <Layers className="h-3.5 w-3.5" />
            Sozlamalar
          </button>
          <div style={{ width: 1, background: 'rgba(0,0,0,0.08)' }} />
          <button
            onClick={() => togglePanel('saved')}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold transition-colors',
              activePanel === 'saved'
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:bg-gray-100',
            )}
            style={{ minHeight: 'auto', minWidth: 'auto' }}
          >
            <BookmarkCheck className="h-3.5 w-3.5" />
            Saqlangan
            {savedPins.length > 0 && (
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none',
                activePanel === 'saved' ? 'bg-white/30 text-white' : 'bg-primary-100 text-primary-700',
              )}>
                {savedPins.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── PANEL OVERLAY (left side) ── */}
      {activePanel && (
        <div
          className="absolute left-3 z-[500] flex flex-col overflow-hidden rounded-2xl shadow-xl"
          style={{
            top: 56,
            width: 'min(320px, calc(100vw - 24px))',
            maxHeight: 'calc(100% - 68px)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-subtle)',
          }}
        >
          {/* Panel header */}
          <div
            className="flex shrink-0 items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
          >
            <div className="flex items-center gap-2">
              {activePanel === 'settings'
                ? <Layers className="h-4 w-4 text-primary-600" />
                : <BookmarkCheck className="h-4 w-4 text-amber-500" />
              }
              <span className="text-sm font-bold text-text-primary">
                {activePanel === 'settings' ? 'Sozlamalar' : `Saqlangan joylar (${savedPins.length})`}
              </span>
            </div>
            <button
              onClick={() => setActivePanel(null)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-surface-secondary transition-colors"
              style={{ minHeight: 'auto', minWidth: 'auto' }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto">
            {activePanel === 'settings' ? (
              <div className="space-y-4 p-4">
                {/* Radius */}
                <div className="rounded-xl bg-surface-secondary p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Circle className="h-4 w-4 text-primary-600" />
                      <span className="text-[12px] font-bold text-text-primary">Ko'rish radiusi</span>
                    </div>
                    <span className="rounded-lg bg-primary-50 px-2.5 py-1 text-[11px] font-bold text-primary-700 tabular-nums">
                      {formatKm(radiusKm * 1000)}
                    </span>
                  </div>
                  <input
                    type="range" min={0.1} max={100} step={0.1} value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="w-full accent-primary-600"
                  />
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    {[0.5, 1, 5, 20].map((km) => (
                      <button
                        key={km}
                        onClick={() => setRadiusKm(km)}
                        className={cn(
                          'rounded-lg py-1.5 text-[11px] font-bold transition-colors',
                          radiusKm === km ? 'bg-primary-600 text-white' : 'bg-surface text-text-muted hover:bg-surface-tertiary',
                        )}
                        style={{ minHeight: 'auto', minWidth: 'auto' }}
                      >
                        {km < 1 ? `${km * 1000}m` : `${km}km`}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number" min={0.1} max={100} step={0.1} value={radiusKm}
                      onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0 && v <= 100) setRadiusKm(v); }}
                      className="input w-20 !py-1.5 text-center text-sm tabular-nums"
                    />
                    <span className="text-[11px] text-text-muted">km kiritish</span>
                  </div>
                </div>

                {/* Tile layers */}
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    <Layers className="h-3.5 w-3.5" /> Xarita turi
                  </p>
                  <div className="space-y-1.5">
                    {TILE_LAYERS.map((tl) => (
                      <button
                        key={tl.key}
                        onClick={() => setTileKey(tl.key as typeof tileKey)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[12px] font-medium transition-all',
                          tileKey === tl.key
                            ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-300'
                            : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary',
                        )}
                        style={{ minHeight: 'auto' }}
                      >
                        <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', tileKey === tl.key ? 'bg-primary-600' : 'bg-border')} />
                        {tl.label}
                      </button>
                    ))}
                  </div>
                </div>

{/* Customers toggle */}
                {customersWithCoords.length > 0 && (
                  <div className="flex items-center justify-between rounded-xl bg-surface-secondary px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary-600" />
                      <span className="text-[12px] font-medium text-text-secondary">
                        Mijozlar ({customersWithCoords.length} ta)
                      </span>
                    </div>
                    <button
                      onClick={() => setShowCustomers((v) => !v)}
                      className={cn('relative h-5 w-9 rounded-full transition-colors', showCustomers ? 'bg-primary-600' : 'bg-border')}
                      style={{ minHeight: 'auto', minWidth: 'auto' }}
                    >
                      <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', showCustomers ? 'translate-x-4' : 'translate-x-0.5')} />
                    </button>
                  </div>
                )}

                {/* Coords info */}
                <div className="rounded-xl bg-surface-secondary px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-danger-500" />
                    <p className="text-[12px] font-bold text-text-primary tabular-nums">
                      {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
                    </p>
                  </div>
                  <p className="mt-1 text-[11px] text-text-muted">
                    Radius: {formatKm(radiusKm * 1000)} · Xaritani bosib markaz o'zgartiring
                  </p>
                </div>
              </div>
            ) : (
              /* Saved tab */
              savedPins.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-text-muted">
                  <Bookmark className="mb-3 h-10 w-10 opacity-20" />
                  <p className="text-sm font-medium text-center">Saqlangan joy yo'q</p>
                  <p className="mt-1 text-[11px] text-center leading-relaxed text-text-muted">
                    Xaritada biror joyni bosing, so'ng "Ha, saqlash" tugmasini bosing
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {savedPins.map((pin) => (
                    <div key={pin.id} className="flex items-start gap-2.5 px-4 py-3 hover:bg-surface-secondary transition-colors">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100">
                        <span className="text-[12px]">⭐</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[12px] font-medium text-text-primary leading-snug">
                          {pin.address}
                        </p>
                        <p className="mt-0.5 text-[10px] text-text-muted tabular-nums">
                          {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                        </p>
                        <p className="text-[10px] text-text-muted">
                          {new Date(pin.savedAt).toLocaleDateString('uz-UZ')}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          onClick={() => {
                            mapRef.current?.setView([pin.lat, pin.lng], 16, { animate: true });
                            setActivePanel(null);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                          style={{ minHeight: 'auto', minWidth: 'auto' }}
                          title="Xaritada ko'rish"
                        >
                          <Navigation className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deletePin(pin.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-danger-50 text-danger-500 hover:bg-danger-100 transition-colors"
                          style={{ minHeight: 'auto', minWidth: 'auto' }}
                          title="O'chirish"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ── TOP-CENTER FLOATING SEARCH ── */}
      <div
        className="absolute left-1/2 top-3 z-[500] -translate-x-1/2"
        style={{ width: 'min(380px, calc(100vw - 220px))' }}
      >
        <div className="relative">
          <div
            className="flex items-center gap-1 rounded-xl bg-white/95 shadow-md backdrop-blur"
            style={{ border: '1.5px solid rgba(0,0,0,0.10)' }}
          >
            <Search className="ml-3 h-3.5 w-3.5 shrink-0 text-text-muted" />
            <input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              onKeyDown={(e) => { if (e.key === 'Enter' && searchResults[0]) selectSearchResult(searchResults[0]); }}
              placeholder="Qishloq, tuman, shahar qidirish..."
              autoComplete="off"
              className="w-full bg-transparent py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              style={{ border: 'none', minHeight: 'auto' }}
            />
            {searching && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-text-muted" />}
            {searchQuery && !searching && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchOpen(false); }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-secondary"
                style={{ minHeight: 'auto', minWidth: 'auto' }}
                title="Tozalash"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="mr-1 h-7 w-px shrink-0 bg-border" />
            <div
              className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white"
              title="Avtomatik qidiruv"
              style={{ minHeight: 'auto', minWidth: 'auto' }}
            >
              <Search className="h-3.5 w-3.5" />
            </div>
          </div>

          {searchOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-[510] mt-1.5 overflow-hidden rounded-xl border border-border bg-surface shadow-dropdown">
              {searchResults.map((r) => (
                <button
                  key={r.place_id}
                  onMouseDown={() => selectSearchResult(r)}
                  className="flex w-full items-center gap-2 border-b border-border/40 px-3 py-2.5 text-left last:border-0 hover:bg-surface-secondary"
                  style={{ minHeight: 'auto' }}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary-600" />
                  <span className="line-clamp-1 text-[12px] text-text-secondary">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT CONTROLS ── */}
      <div className="absolute right-3 top-3 z-[500] flex flex-col gap-2">
        <button
          onClick={locateMe}
          disabled={locating}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 shadow-md backdrop-blur transition-colors hover:bg-white"
          style={{ border: '1.5px solid rgba(0,0,0,0.10)', minHeight: 'auto', minWidth: 'auto' }}
          title="Joylashuvimni topish"
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin text-primary-600" /> : <LocateFixed className="h-4 w-4 text-gray-600" />}
        </button>
      </div>

      {/* ── SAVE CONFIRMATION POPUP ── */}
      {(pendingPin || geocodingPin) && (
        <div
          className="absolute bottom-6 left-1/2 z-[600] -translate-x-1/2 rounded-2xl px-4 py-3 shadow-xl"
          style={{
            background: 'rgba(15,23,42,0.92)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.12)',
            maxWidth: 'calc(100% - 32px)',
            minWidth: 260,
          }}
        >
          {geocodingPin ? (
            <div className="flex items-center gap-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-amber-400 shrink-0" />
              <p className="text-[12px] text-white/80">Manzil aniqlanmoqda...</p>
            </div>
          ) : pendingPin && (
            <div>
              <div className="mb-2.5 flex items-start gap-2">
                <span className="text-[14px] shrink-0">⭐</span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-amber-400">Bu manzilni saqlaysizmi?</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-white/70 leading-snug">
                    {pendingPin.address}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => savePin(pendingPin)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2 text-[12px] font-bold text-white hover:bg-amber-400 transition-colors"
                  style={{ minHeight: 'auto' }}
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  Ha, saqlash
                </button>
                <button
                  onClick={() => setPendingPin(null)}
                  className="flex flex-1 items-center justify-center rounded-xl bg-white/10 py-2 text-[12px] font-medium text-white/80 hover:bg-white/20 transition-colors"
                  style={{ minHeight: 'auto' }}
                >
                  Yo'q
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
