import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Check,
  CircleDot,
  ExternalLink,
  Loader2,
  LocateFixed,
  Map,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type {
  Map as LeafletMap,
  Circle as LeafletCircle,
  Marker as LeafletMarker,
  TileLayer as LeafletTileLayer,
} from 'leaflet';
import { cn } from '@/lib/cn';

type LatLng = { lat: number; lng: number };
type MapMode = 'street' | 'satellite';

interface PlaceLead {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  location: LatLng;
  distance: number;
  osmType: string;
}

type ZoneStatus = 'planned' | 'scouted';

interface SavedZone {
  id: string;
  name: string;
  center: LatLng;
  radius: number;
  status: ZoneStatus;
  createdAt: string;
}

const STORAGE_KEY = 'sardorbek-prospecting-zones';
const DEFAULT_CENTER: LatLng = { lat: 40.0302, lng: 64.8517 };
const DEFAULT_RADIUS = 1000;

const STREET_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const STREET_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const SAT_URL = 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
const SAT_ATTR = '© Google Maps';

const PLACE_TYPES = [
  { key: 'restaurant', label: 'Restoran', tags: [{ k: 'amenity', v: 'restaurant' }] },
  { key: 'cafe', label: 'Kafe', tags: [{ k: 'amenity', v: 'cafe' }] },
  { key: 'bakery', label: 'Nonvoyxona', tags: [{ k: 'shop', v: 'bakery' }, { k: 'amenity', v: 'bakery' }] },
  { key: 'fast_food', label: 'Fast food', tags: [{ k: 'amenity', v: 'fast_food' }] },
  { key: 'shop', label: "Do'kon", tags: [{ k: 'shop', v: 'convenience' }, { k: 'shop', v: 'supermarket' }, { k: 'shop', v: 'grocery' }] },
  { key: 'pharmacy', label: 'Dorixona', tags: [{ k: 'amenity', v: 'pharmacy' }] },
  { key: 'school', label: "O'quv", tags: [{ k: 'amenity', v: 'school' }, { k: 'amenity', v: 'university' }, { k: 'amenity', v: 'college' }] },
  { key: 'hospital', label: 'Shifoxona', tags: [{ k: 'amenity', v: 'hospital' }, { k: 'amenity', v: 'clinic' }] },
] as const;

const RADIUS_OPTIONS = [500, 1000, 2000, 5000] as const;

function formatDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function distanceBetween(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function mapsDirectionsUrl(loc: LatLng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`;
}

function mapsPlaceUrl(loc: LatLng, name: string) {
  return `https://www.google.com/maps/search/${encodeURIComponent(name)}/@${loc.lat},${loc.lng},17z`;
}

function readZones(): SavedZone[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as SavedZone[];
    return Array.isArray(p) ? p : [];
  } catch { return []; }
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function searchOverpass(
  center: LatLng,
  radiusM: number,
  tags: readonly { k: string; v: string }[],
  keyword: string,
): Promise<PlaceLead[]> {
  const nameFilter = keyword.trim()
    ? `["name"~"${keyword.trim().replace(/"/g, '')}",i]`
    : '';
  const tagLines = tags
    .map((t) => {
      const f = `["${t.k}"="${t.v}"]${nameFilter}`;
      return `  node${f}(around:${radiusM},${center.lat},${center.lng});\n  way${f}(around:${radiusM},${center.lat},${center.lng});`;
    })
    .join('\n');
  const query = `[out:json][timeout:30];\n(\n${tagLines}\n);\nout center 100;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass xatosi: ${res.status}`);
  const data = await res.json() as { elements: OverpassElement[] };
  return data.elements
    .filter((el) => el.tags?.name)
    .map((el) => {
      const lat = el.lat ?? el.center?.lat ?? 0;
      const lon = el.lon ?? el.center?.lon ?? 0;
      const loc: LatLng = { lat, lng: lon };
      const t = el.tags ?? {};
      return {
        id: `${el.type}-${el.id}`,
        name: t.name ?? '',
        address: [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(', ') || t.description || '',
        phone: t.phone ?? t['contact:phone'] ?? null,
        website: t.website ?? t['contact:website'] ?? null,
        location: loc,
        distance: distanceBetween(center, loc),
        osmType: t.amenity ?? t.shop ?? t.tourism ?? '',
      };
    })
    .filter((l) => l.location.lat !== 0 && l.name)
    .sort((a, b) => a.distance - b.distance);
}

export function ProspectingMapPage() {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const circleRef = useRef<LeafletCircle | null>(null);
  const centerMarkerRef = useRef<LeafletMarker | null>(null);
  const leadMarkersRef = useRef<LeafletMarker[]>([]);
  const tileLayerRef = useRef<LeafletTileLayer | null>(null);

  const [center, setCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [placeTypeKey, setPlaceTypeKey] = useState<string>('restaurant');
  const [keyword, setKeyword] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [zoneName, setZoneName] = useState('Qiziltepa markazi');
  const [mapError, setMapError] = useState('');
  const [searching, setSearching] = useState(false);
  const [leads, setLeads] = useState<PlaceLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [zones, setZones] = useState<SavedZone[]>(readZones);
  const [mapReady, setMapReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>('street');
  const [tableFilter, setTableFilter] = useState('');

  // Autocomplete
  const [suggestions, setSuggestions] = useState<{ display_name: string; lat: string; lon: string; place_id: number }[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const placeType = PLACE_TYPES.find((t) => t.key === placeTypeKey) ?? PLACE_TYPES[0];

  const filteredLeads = useMemo(() => {
    if (!tableFilter.trim()) return leads;
    const q = tableFilter.toLowerCase();
    return leads.filter((l) =>
      l.name.toLowerCase().includes(q) ||
      l.address.toLowerCase().includes(q) ||
      l.osmType.toLowerCase().includes(q),
    );
  }, [leads, tableFilter]);

  const saveZones = useCallback((next: SavedZone[]) => {
    setZones(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  // ── Init map ──
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    let cancelled = false;

    async function init() {
      const L = await import('leaflet');
      if (cancelled || !mapElRef.current) return;

      const map = L.map(mapElRef.current, {
        center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
        zoom: 14,
        zoomControl: true,
        doubleClickZoom: false,
      });

      tileLayerRef.current = L.tileLayer(STREET_URL, {
        attribution: STREET_ATTR,
        maxZoom: 21,
        maxNativeZoom: 19,
      }).addTo(map);

      circleRef.current = L.circle([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], {
        radius: DEFAULT_RADIUS,
        color: '#4f46e5',
        fillColor: '#4f46e5',
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '6 4',
      }).addTo(map);

      const dotIcon = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;background:#ef4444;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      centerMarkerRef.current = L.marker([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], { icon: dotIcon }).addTo(map);

      let clickTimer: ReturnType<typeof setTimeout> | null = null;
      map.on('click', (e) => {
        if (clickTimer) return;
        clickTimer = setTimeout(() => {
          clickTimer = null;
          const pos: LatLng = { lat: e.latlng.lat, lng: e.latlng.lng };
          setCenter(pos);
          setZoneName(`${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`);
          setLeads([]); setSelectedLeadId(null);
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

  // ── Switch tile layer ──
  const switchTile = useCallback(async (mode: MapMode) => {
    const L = await import('leaflet');
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) { tileLayerRef.current.remove(); tileLayerRef.current = null; }
    if (mode === 'satellite') {
      tileLayerRef.current = L.tileLayer(SAT_URL, {
        attribution: SAT_ATTR,
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 21,
        maxNativeZoom: 20,
      }).addTo(map);
    } else {
      tileLayerRef.current = L.tileLayer(STREET_URL, {
        attribution: STREET_ATTR,
        maxZoom: 21,
        maxNativeZoom: 19,
      }).addTo(map);
    }
  }, []);

  const toggleMapMode = useCallback(async () => {
    const next: MapMode = mapMode === 'street' ? 'satellite' : 'street';
    setMapMode(next);
    await switchTile(next);
  }, [mapMode, switchTile]);

  // ── Sync circle + center marker ──
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    mapRef.current.panTo([center.lat, center.lng]);
    circleRef.current?.setLatLng([center.lat, center.lng]);
    circleRef.current?.setRadius(radius);
    centerMarkerRef.current?.setLatLng([center.lat, center.lng]);
  }, [center, radius, mapReady]);

  // ── Render lead markers ──
  const renderLeadMarkers = useCallback(async (nextLeads: PlaceLead[]) => {
    const L = await import('leaflet');
    leadMarkersRef.current.forEach((m) => m.remove());
    leadMarkersRef.current = [];
    const map = mapRef.current;
    if (!map) return;
    nextLeads.forEach((lead, i) => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:26px;height:26px;background:#4f46e5;border:2.5px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35);font-size:10px;font-weight:700;color:#fff">${i + 1}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      const marker = L.marker([lead.location.lat, lead.location.lng], { icon })
        .bindPopup(
          `<div style="min-width:160px;padding:2px 0">
            <strong style="font-size:13px;color:#111">${lead.name}</strong>
            ${lead.address ? `<br/><span style="font-size:11px;color:#6b7280">${lead.address}</span>` : ''}
            <br/><span style="font-size:11px;color:#4f46e5;font-weight:600">${formatDistance(lead.distance)}</span>
          </div>`,
        )
        .addTo(map);
      marker.on('click', () => setSelectedLeadId(lead.id));
      leadMarkersRef.current.push(marker);
    });
  }, []);

  // ── Search ──
  const searchNearby = useCallback(async () => {
    setSearching(true);
    setMapError('');
    setSelectedLeadId(null);
    setTableFilter('');
    try {
      const results = await searchOverpass(center, radius, placeType.tags, keyword);
      setLeads(results);
      await renderLeadMarkers(results);
      if (results.length === 0) setMapError("Bu hududda hech narsa topilmadi. Radius yoki joy turini o'zgartiring.");
    } catch (err) {
      setMapError(err instanceof Error ? err.message : 'Qidiruv xatosi');
      setLeads([]);
    } finally {
      setSearching(false);
    }
  }, [center, radius, placeType, keyword, renderLeadMarkers]);

  // ── Nominatim autocomplete ──
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) { setSuggestions([]); setSuggestionsOpen(false); return; }
    setLoadingSuggestions(true);
    try {
      const params = new URLSearchParams({ format: 'json', q: `${query.trim()}, O'zbekiston`, countrycodes: 'uz', limit: '6', addressdetails: '0' });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { 'Accept-Language': 'uz,ru,en' } });
      const data = await res.json() as { display_name: string; lat: string; lon: string; place_id: number }[];
      setSuggestions(data);
      setSuggestionsOpen(data.length > 0);
    } catch { /* ignore */ } finally { setLoadingSuggestions(false); }
  }, []);

  const handleQueryChange = useCallback((val: string) => {
    setLocationQuery(val);
    if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current);
    suggestionTimerRef.current = setTimeout(() => fetchSuggestions(val), 350);
  }, [fetchSuggestions]);

  const selectSuggestion = useCallback((item: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const name = item.display_name.split(',')[0] ?? item.display_name;
    setCenter({ lat, lng });
    setZoneName(name);
    setLocationQuery(name);
    setSuggestions([]); setSuggestionsOpen(false);
    setLeads([]); setSelectedLeadId(null);
    mapRef.current?.setView([lat, lng], 15, { animate: true });
  }, []);

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(loc); setZoneName('Hozirgi joylashuv');
        setLeads([]); setSelectedLeadId(null);
        mapRef.current?.setView([loc.lat, loc.lng], 15, { animate: true });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }, []);

  const saveCurrentZone = useCallback(() => {
    const name = zoneName.trim() || `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`;
    saveZones([{ id: `${Date.now()}`, name, center, radius, status: 'planned', createdAt: new Date().toISOString() }, ...zones]);
  }, [center, radius, zoneName, zones, saveZones]);

  const clearResults = useCallback(() => {
    setLeads([]); setSelectedLeadId(null); setMapError(''); setTableFilter('');
    leadMarkersRef.current.forEach((m) => m.remove());
    leadMarkersRef.current = [];
  }, []);

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] flex-col overflow-hidden lg:flex-row">
      {/* ══ SIDEBAR ══ */}
      <aside
        className="flex max-h-[45vh] shrink-0 flex-col overflow-hidden bg-surface lg:max-h-none lg:w-[340px]"
        style={{ borderRight: '1px solid var(--color-border-subtle)' }}
      >
        {/* Header */}
        <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <Map className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-text-primary">Mijoz qidirish xaritasi</h1>
              <p className="text-[10px] text-text-muted">OpenStreetMap · Overpass API · Bepul</p>
            </div>
          </div>

          {/* Location search */}
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <input
                value={locationQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && suggestions[0]) selectSuggestion(suggestions[0]); }}
                onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
                onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
                className="input !py-2 text-sm"
                style={{ paddingLeft: 32 }}
                placeholder="Shahar, qishloq, tuman..."
                autoComplete="off"
              />
              {loadingSuggestions && <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-text-muted" />}
            </div>
            <button onClick={locateMe} disabled={locating} className="btn btn-secondary btn-sm shrink-0" title="Joylashuvim">
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
            </button>
            {suggestionsOpen && suggestions.length > 0 && (
              <div className="absolute left-0 right-10 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-surface shadow-dropdown">
                {suggestions.map((item) => (
                  <button key={item.place_id} onMouseDown={() => selectSuggestion(item)}
                    className="flex w-full items-center gap-2 border-b border-border/40 px-3 py-2.5 text-left last:border-0 hover:bg-surface-secondary" style={{ minHeight: 'auto' }}>
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                    <span className="line-clamp-1 text-[12px] text-text-secondary">{item.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 overflow-auto p-3 space-y-3">
          {/* Radius */}
          <div className="rounded-xl bg-surface-secondary p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-bold text-text-primary">Qidiruv radiusi</p>
              <span className="rounded bg-primary-50 px-2 py-0.5 text-[11px] font-bold text-primary-700 tabular-nums">
                {formatDistance(radius)}
              </span>
            </div>
            <input type="range" min={300} max={5000} step={100} value={radius}
              onChange={(e) => setRadius(Number(e.target.value))} className="w-full accent-primary-600" />
            <div className="mt-2 grid grid-cols-4 gap-1">
              {RADIUS_OPTIONS.map((v) => (
                <button key={v} onClick={() => setRadius(v)}
                  className={cn('rounded-lg py-1.5 text-[11px] font-bold transition-colors', radius === v ? 'bg-primary-600 text-white' : 'bg-surface text-text-muted hover:bg-surface-tertiary')}
                  style={{ minHeight: 'auto', minWidth: 'auto' }}>
                  {formatDistance(v)}
                </button>
              ))}
            </div>
          </div>

          {/* Place types */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Nima qidiriladi</p>
            <div className="grid grid-cols-2 gap-1">
              {PLACE_TYPES.map((t) => (
                <button key={t.key} onClick={() => setPlaceTypeKey(t.key)}
                  className={cn('rounded-lg px-2 py-2 text-[12px] font-semibold transition-colors', placeTypeKey === t.key ? 'bg-primary-600 text-white' : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary')}
                  style={{ minHeight: 'auto' }}>
                  {t.label}
                </button>
              ))}
            </div>
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
              className="input mt-2 !py-2 text-sm" placeholder="Nom bo'yicha filter (ixtiyoriy)" />
          </div>

          {/* Actions */}
          <button onClick={searchNearby} disabled={searching} className="btn btn-primary btn-md w-full">
            {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CircleDot className="h-4 w-4" />}
            {searching ? 'Qidirilmoqda...' : 'Radius ichida izlash'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={saveCurrentZone} className="btn btn-secondary btn-sm">
              <Save className="h-3.5 w-3.5" /> Saqlash
            </button>
            <button onClick={clearResults} className="btn btn-secondary btn-sm">
              <Trash2 className="h-3.5 w-3.5" /> Tozalash
            </button>
          </div>

          {/* Saved zones */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Saqlangan hududlar</p>
              <span className="text-[10px] text-text-muted">{zones.length} ta</span>
            </div>
            {zones.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-3 py-3 text-center text-[11px] text-text-muted">
                Hududni tanlab "Saqlash" tugmasini bosing
              </div>
            ) : (
              <div className="space-y-1.5">
                {zones.map((z) => (
                  <div key={z.id} className="rounded-xl bg-surface-secondary p-2.5">
                    <button onClick={() => { setCenter(z.center); setRadius(z.radius); setZoneName(z.name); setLeads([]); mapRef.current?.setView([z.center.lat, z.center.lng], 14, { animate: true }); }}
                      className="flex w-full items-center justify-between gap-2 text-left" style={{ minHeight: 'auto' }}>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-bold text-text-primary">{z.name}</span>
                        <span className="text-[10px] text-text-muted">{formatDistance(z.radius)} radius</span>
                      </span>
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', z.status === 'scouted' ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700')}>
                        {z.status === 'scouted' ? "Ko'rildi" : 'Reja'}
                      </span>
                    </button>
                    <div className="mt-1.5 flex gap-1">
                      <button onClick={() => saveZones(zones.map((x) => x.id === z.id ? { ...x, status: x.status === 'planned' ? 'scouted' : 'planned' } : x))}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-surface px-2 py-1 text-[11px] font-medium text-text-secondary hover:bg-surface-tertiary transition-colors" style={{ minHeight: 'auto' }}>
                        <Check className="h-3 w-3" /> Status
                      </button>
                      <button onClick={() => saveZones(zones.filter((x) => x.id !== z.id))}
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors" style={{ minHeight: 'auto', minWidth: 'auto' }}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">

        {/* ── MAP ── */}
        <div className="relative" style={{ height: 'clamp(280px, 45vh, 480px)' }}>
          <div ref={mapElRef} className="h-full w-full" style={{ background: '#e8eff4' }} />

          {!mapReady && (
            <div className="absolute inset-0 z-[400] flex items-center justify-center bg-surface-secondary">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          )}

          {/* Top-left: zone info */}
          <div className="absolute left-3 top-3 z-[500] rounded-xl bg-white/95 px-3 py-2 shadow-md backdrop-blur"
            style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            <div className="flex items-center gap-1.5">
              <Route className="h-3.5 w-3.5 text-primary-600" />
              <p className="text-[12px] font-bold text-text-primary">{zoneName}</p>
            </div>
            <p className="mt-0.5 text-[10px] text-text-muted tabular-nums">
              {center.lat.toFixed(4)}, {center.lng.toFixed(4)} · {formatDistance(radius)}
            </p>
          </div>

          {/* Top-right: stats + satellite toggle */}
          <div className="absolute right-3 top-3 z-[500] flex flex-col gap-2">
            {/* Stats */}
            <div className="flex gap-1.5">
              <div className="rounded-xl bg-white/95 px-2.5 py-1.5 text-center shadow-md backdrop-blur" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                <p className="text-[9px] font-medium text-text-muted">Topildi</p>
                <p className="text-sm font-black text-text-primary tabular-nums">{leads.length}</p>
              </div>
              <div className="rounded-xl bg-white/95 px-2.5 py-1.5 text-center shadow-md backdrop-blur" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                <p className="text-[9px] font-medium text-text-muted">Saqlangan</p>
                <p className="text-sm font-black text-primary-600 tabular-nums">{zones.length}</p>
              </div>
            </div>

            {/* Locate */}
            <button onClick={locateMe} disabled={locating}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 shadow-md backdrop-blur hover:bg-white transition-colors"
              style={{ border: '1.5px solid rgba(0,0,0,0.10)', minHeight: 'auto', minWidth: 'auto' }}>
              {locating ? <Loader2 className="h-4 w-4 animate-spin text-primary-600" /> : <LocateFixed className="h-4 w-4 text-gray-600" />}
            </button>

            {/* Satellite toggle */}
            <button onClick={toggleMapMode}
              title={mapMode === 'satellite' ? "Ko'cha xaritasi" : "Sun'iy yo'ldosh"}
              className="group relative overflow-hidden rounded-xl shadow-md transition-all hover:scale-105"
              style={{ width: 44, height: 44, border: mapMode === 'satellite' ? '2.5px solid #4f46e5' : '2px solid rgba(0,0,0,0.15)', minHeight: 'auto', minWidth: 'auto' }}>
              <img src="https://mt0.google.com/vt/lyrs=y&x=371&y=200&z=9" alt="sat"
                className="absolute inset-0 h-full w-full object-cover" draggable={false} />
              <div className={cn('absolute inset-0 flex items-end justify-center pb-0.5 transition-all', mapMode === 'satellite' ? 'bg-black/0' : 'bg-black/35 group-hover:bg-black/20')}>
                <span className="text-[9px] font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                  {mapMode === 'satellite' ? "Ko'cha" : 'Sat'}
                </span>
              </div>
              {mapMode === 'satellite' && <div className="absolute inset-0 rounded-xl ring-2 ring-inset ring-primary-500" />}
            </button>
          </div>

          {/* Bottom hint */}
          <div className="pointer-events-none absolute bottom-3 left-3 z-[500]">
            <span className="rounded-lg bg-black/60 px-2 py-1 text-[10px] text-white backdrop-blur">
              Bosish → markaz · 2x bosish → zoom
            </span>
          </div>
        </div>

        {/* Error bar */}
        {mapError && (
          <div className="mx-3 mt-2 flex items-center gap-2 rounded-xl bg-warning-50 px-3 py-2" style={{ border: '1px solid #fde68a' }}>
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning-600" />
            <p className="flex-1 text-[12px] text-warning-700">{mapError}</p>
            <button onClick={() => setMapError('')} className="text-warning-400 hover:text-warning-600" style={{ minHeight: 'auto', minWidth: 'auto' }}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── RESULTS TABLE ── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Table toolbar */}
          <div className="flex shrink-0 items-center gap-3 px-3 py-2.5"
            style={{ borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-surface)' }}>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary-600" />
              <span className="text-sm font-bold text-text-primary">Natijalar</span>
              {leads.length > 0 && (
                <span className="rounded-md bg-surface-tertiary px-2 py-0.5 text-[11px] font-semibold text-text-muted">
                  {filteredLeads.length} / {leads.length} ta
                </span>
              )}
            </div>
            {leads.length > 0 && (
              <div className="relative ml-auto w-48">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                <input
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  placeholder="Natijalardan qidirish..."
                  className="h-8 w-full rounded-lg border border-border bg-surface pl-8 pr-3 text-[12px] focus:outline-2 focus:outline-primary-500"
                />
                {tableFilter && (
                  <button onClick={() => setTableFilter('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary" style={{ minHeight: 'auto', minWidth: 'auto' }}>
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="min-h-0 flex-1 overflow-auto">
            {leads.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-text-muted">
                <Building2 className="h-12 w-12 opacity-15" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-text-primary">Radius ichida joylar shu yerda chiqadi</p>
                  <p className="mt-1 text-xs text-text-muted">Joy turini tanlang va "Radius ichida izlash" tugmasini bosing</p>
                </div>
                {searching && (
                  <div className="flex items-center gap-2 text-primary-600">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Overpass API dan qidirilmoqda...</span>
                  </div>
                )}
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-text-muted">
                <Search className="mb-2 h-8 w-8 opacity-20" />
                <p className="text-sm">"{tableFilter}" bo'yicha natija topilmadi</p>
              </div>
            ) : (
              <table className="w-full min-w-[560px] text-sm">
                <thead className="sticky top-0 z-10">
                  <tr style={{ background: 'var(--color-surface-secondary)', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <th className="w-10 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-text-muted">№</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-text-muted">Nomi</th>
                    <th className="hidden px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-text-muted sm:table-cell">Manzil</th>
                    <th className="hidden px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-text-muted md:table-cell">Telefon</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-text-muted">Masofa</th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-text-muted">Harakatlar</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead, i) => (
                    <tr
                      key={lead.id}
                      onClick={() => { setSelectedLeadId(lead.id); mapRef.current?.panTo([lead.location.lat, lead.location.lng]); }}
                      className={cn('cursor-pointer transition-colors hover:bg-surface-secondary', selectedLeadId === lead.id && 'bg-primary-50 hover:bg-primary-50')}
                      style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
                    >
                      <td className="px-3 py-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-[13px] font-semibold text-text-primary">{lead.name}</p>
                            {lead.osmType && (
                              <span className="text-[10px] text-text-muted">{lead.osmType}</span>
                            )}
                          </div>
                          {selectedLeadId === lead.id && (
                            <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-[9px] font-bold text-primary-700">Tanlangan</span>
                          )}
                        </div>
                      </td>
                      <td className="hidden px-3 py-2.5 sm:table-cell">
                        <span className="line-clamp-1 max-w-[180px] text-[12px] text-text-muted">{lead.address || '—'}</span>
                      </td>
                      <td className="hidden px-3 py-2.5 md:table-cell">
                        <span className="text-[12px] text-text-secondary tabular-nums">{lead.phone ?? '—'}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-1 text-[12px] font-semibold text-primary-700 tabular-nums">
                          <MapPin className="h-3 w-3" />{formatDistance(lead.distance)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={mapsDirectionsUrl(lead.location)}
                            target="_blank" rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                            style={{ minHeight: 'auto', minWidth: 'auto' }}
                            title="Yo'nalish"
                          >
                            <Navigation className="h-3.5 w-3.5" />
                          </a>
                          <a
                            href={mapsPlaceUrl(lead.location, lead.name)}
                            target="_blank" rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-secondary text-text-muted hover:bg-surface-tertiary transition-colors"
                            style={{ minHeight: 'auto', minWidth: 'auto' }}
                            title="Google Maps da ko'rish"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
