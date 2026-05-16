import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  MapPin,
  LocateFixed,
  Loader2,
  Plus,
  AlertCircle,
  Search,
  X,
} from 'lucide-react';
import type { Map as LeafletMap, Marker as LeafletMarker, CircleMarker as LeafletCircleMarker, TileLayer as LeafletTileLayer, Circle as LeafletCircle } from 'leaflet';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import {
  useInfiniteCustomers,
  useCreateCustomer,
} from '@/hooks/useCustomers';

type LatLng = { lat: number; lng: number };
type MapMode = 'street' | 'satellite';

interface PickedLocation {
  latlng: LatLng;
  address: string;
}

interface CustomerFormData {
  name: string;
  phone: string;
  note: string;
  returnDate: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const EMPTY_FORM: CustomerFormData = { name: '', phone: '+998', note: '', returnDate: '' };
const DEFAULT_CENTER: LatLng = { lat: 40.0302, lng: 64.8517 };

const STREET_TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const STREET_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const SATELLITE_TILE = 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
const SATELLITE_ATTR = '© Google Maps';

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

function parseCustomerCoords(note: string | null): LatLng | null {
  if (!note) return null;
  const match = note.match(/__coords:([\d.]+),([\d.]+)/);
  if (!match || !match[1] || !match[2]) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

export function AddCustomerPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const baseTileRef = useRef<LeafletTileLayer | null>(null);
  const pinMarkerRef = useRef<LeafletMarker | null>(null);
  const customerMarkersRef = useRef<LeafletCircleMarker[]>([]);
  const userDotRef = useRef<LeafletCircleMarker | null>(null);
  const userAccuracyRef = useRef<LeafletCircle | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>('street');
  const [locating, setLocating] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<PickedLocation | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CustomerFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data, refetch } = useInfiniteCustomers({ limit: 200 });
  const customers = data?.pages.flatMap((p) => p.data) ?? [];

  const createMut = useCreateCustomer();

  const setField = (field: keyof CustomerFormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const switchMapMode = useCallback(async (mode: MapMode, map: LeafletMap) => {
    const L = await import('leaflet');
    if (baseTileRef.current) { baseTileRef.current.remove(); baseTileRef.current = null; }

    if (mode === 'satellite') {
      baseTileRef.current = L.tileLayer(SATELLITE_TILE, {
        attribution: SATELLITE_ATTR,
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 21,
        maxNativeZoom: 20,
      }).addTo(map);
    } else {
      baseTileRef.current = L.tileLayer(STREET_TILE, {
        attribution: STREET_ATTR,
        maxZoom: 19,
      }).addTo(map);
    }
  }, []);

  const updatePin = useCallback(async (map: LeafletMap, latlng: LatLng) => {
    const L = await import('leaflet');
    if (pinMarkerRef.current) pinMarkerRef.current.remove();
    const icon = L.divIcon({
      className: '',
      html: `<div style="position:relative;width:36px;height:44px;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4))">
        <svg width="36" height="44" viewBox="0 0 36 44" fill="none">
          <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z" fill="#ef4444"/>
          <circle cx="18" cy="18" r="9" fill="white"/>
          <circle cx="18" cy="18" r="5.5" fill="#ef4444"/>
        </svg>
      </div>`,
      iconSize: [36, 44],
      iconAnchor: [18, 44],
      popupAnchor: [0, -44],
    });
    pinMarkerRef.current = L.marker([latlng.lat, latlng.lng], { icon }).addTo(map);
  }, []);

  const updateCustomerMarkers = useCallback(async (map: LeafletMap) => {
    const L = await import('leaflet');
    customerMarkersRef.current.forEach((m) => m.remove());
    customerMarkersRef.current = [];

    customers.forEach((c) => {
      const coords = parseCustomerCoords(c.note);
      if (!coords) return;
      const marker = L.circleMarker([coords.lat, coords.lng], {
        radius: 8,
        color: '#fff',
        weight: 2.5,
        fillColor: '#4f46e5',
        fillOpacity: 0.9,
      })
        .bindPopup(
          `<div style="min-width:150px;padding:2px 0">
            <strong style="font-size:13px;color:#111">${c.name}</strong>
            <br/><span style="font-size:11px;color:#6b7280">${c.phone}</span>
          </div>`,
        )
        .addTo(map);
      customerMarkersRef.current.push(marker);
    });
  }, [customers]);

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
          await updatePin(map, latlng);
          setGeocoding(true);
          const address = await reverseGeocode(latlng.lat, latlng.lng);
          setGeocoding(false);
          setPickedLocation({ latlng, address });
          setForm(EMPTY_FORM);
          setModalOpen(true);
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
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      userDotRef.current = null;
      userAccuracyRef.current = null;
    };
  }, [updatePin]);

  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    void updateCustomerMarkers(mapRef.current);
  }, [mapReady, updateCustomerMarkers]);

  const toggleMapMode = useCallback(async () => {
    if (!mapRef.current) return;
    const next: MapMode = mapMode === 'street' ? 'satellite' : 'street';
    setMapMode(next);
    await switchMapMode(next, mapRef.current);
  }, [mapMode, switchMapMode]);

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
      const data: NominatimResult[] = await res.json();
      setSearchResults(data);
      setSearchOpen(true);
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const selectResult = useCallback((r: NominatimResult) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    mapRef.current?.setView([lat, lng], 15);
    setSearchResults([]);
    setSearchOpen(false);
    setSearchQuery(r.display_name.split(',')[0] ?? r.display_name);
  }, []);

  const locateMe = useCallback(() => {
    if (!window.isSecureContext) {
      toast("Joylashuv faqat HTTPS da ishlaydi. Localhost dan foydalaning", 'error');
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

        map.setView([lat, lng], 16, { animate: true });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast("Joylashuv ruxsati rad etilgan", 'error');
        } else if (err.code === err.TIMEOUT) {
          toast("Joylashuvni aniqlash vaqti tugadi", 'warning');
        } else {
          toast("Joylashuvni aniqlab bo'lmadi", 'error');
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }, [toast]);

  const handleCreate = useCallback(async () => {
    if (!form.name.trim()) { toast('Ism familiya kiriting', 'error'); return; }
    if (!form.phone || form.phone.length < 13) { toast('Telefon raqam kiriting', 'error'); return; }
    if (!form.note.trim()) { toast('Izoh kiriting', 'error'); return; }
    if (!form.returnDate.trim()) { toast('Qaytib kelish vaqtini kiriting', 'error'); return; }
    if (!pickedLocation) { toast('Xaritadan manzil tanlang', 'error'); return; }

    setSaving(true);
    try {
      const coordsNote = `${form.note.trim()}\n__coords:${pickedLocation.latlng.lat.toFixed(6)},${pickedLocation.latlng.lng.toFixed(6)}`;
      await createMut.mutateAsync({
        name: form.name.trim(),
        phone: form.phone,
        address: pickedLocation.address,
        note: coordsNote,
        startDate: form.returnDate || undefined,
      });
      toast('Mijoz saqlandi', 'success');
      setModalOpen(false);
      setPickedLocation(null);
      setForm(EMPTY_FORM);
      if (pinMarkerRef.current) { pinMarkerRef.current.remove(); pinMarkerRef.current = null; }
      await refetch();
    } catch {
      toast('Saqlash xatosi', 'error');
    } finally {
      setSaving(false);
    }
  }, [form, pickedLocation, createMut, toast, refetch]);

  const isFormValid =
    form.name.trim().length > 0 &&
    form.phone.length >= 13 &&
    form.note.trim().length > 0 &&
    form.returnDate.trim().length > 0;

  return (
    <div className="flex h-[calc(100vh-var(--header-height,56px))] flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex shrink-0 items-center gap-3 px-4 py-2.5"
        style={{ borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-surface)' }}
      >
        <button
          onClick={() => navigate({ to: '/customers' })}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-secondary"
          style={{ minHeight: 'auto', minWidth: 'auto' }}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-bold text-text-primary">Mijoz qo'shish — Xaritadan</h1>
          <p className="text-[11px] text-text-muted">Xaritada manzilni bosing, so'ng ma'lumot kiriting</p>
        </div>
      </div>

      {/* MAP — full remaining height */}
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

        {/* Geocoding indicator */}
        {geocoding && (
          <div className="absolute left-1/2 top-16 z-[600] -translate-x-1/2 rounded-xl bg-surface/95 px-4 py-2 shadow-card backdrop-blur">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
              Manzil aniqlanmoqda...
            </div>
          </div>
        )}

        {/* Search overlay — shorter, lighter */}
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
                  className="h-9 w-full rounded-xl border border-white/60 bg-white/70 pl-9 pr-8 text-[13px] shadow-md backdrop-blur-md focus:bg-white/90 focus:outline-2 focus:outline-primary-500"
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
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600/90 text-white shadow-md backdrop-blur hover:bg-primary-700 disabled:opacity-50"
                style={{ minHeight: 'auto', minWidth: 'auto' }}
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
                    className="flex w-full items-center gap-2.5 border-b border-border/50 px-3 py-2.5 text-left last:border-0 hover:bg-surface-secondary"
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
            {locating
              ? <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
              : <LocateFixed className="h-4 w-4 text-gray-600" />}
          </button>

          {/* Satellite ↔ Street toggle */}
          <button
            onClick={toggleMapMode}
            title={mapMode === 'satellite' ? "Yo'l xaritasi (OSM)" : "Sun'iy yo'ldosh (Google)"}
            className="group relative overflow-hidden rounded-xl shadow-md transition-all hover:scale-105"
            style={{
              width: 44,
              height: 44,
              border: mapMode === 'satellite' ? '2.5px solid #4f46e5' : '2px solid rgba(0,0,0,0.18)',
              minHeight: 'auto',
              minWidth: 'auto',
            }}
          >
            <img
              src="https://mt0.google.com/vt/lyrs=y&x=371&y=200&z=9"
              alt="satellite"
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
            <div
              className={cn(
                'absolute inset-0 flex flex-col items-center justify-end pb-0.5 transition-all',
                mapMode === 'satellite' ? 'bg-black/0' : 'bg-black/30 group-hover:bg-black/20',
              )}
            >
              <span className="text-[9px] font-bold text-white drop-shadow" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                {mapMode === 'satellite' ? "Yo'l" : 'Sat'}
              </span>
            </div>
            {mapMode === 'satellite' && (
              <div className="absolute inset-0 rounded-xl ring-2 ring-inset ring-primary-500" />
            )}
          </button>
        </div>

        {/* Bottom hint */}
        {mapReady && !pickedLocation && (
          <div
            className="pointer-events-none absolute bottom-6 left-1/2 z-[500] -translate-x-1/2 rounded-2xl px-5 py-2.5 shadow-xl"
            style={{ background: 'rgba(15,23,42,0.82)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <p className="flex items-center gap-2.5 whitespace-nowrap text-[12px] font-semibold text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500">
                <MapPin className="h-3 w-3 text-white" />
              </span>
              Bir marta bosing — manzil belgilash
              <span className="ml-1 rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-medium">2x bosish = zoom</span>
            </p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setPickedLocation(null); if (pinMarkerRef.current) { pinMarkerRef.current.remove(); pinMarkerRef.current = null; } }}
        title="Yangi mijoz qo'shish"
        size="sm"
      >
        <div className="space-y-4">
          {pickedLocation && (
            <div className="flex items-start gap-2.5 rounded-xl bg-primary-50 px-3 py-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-primary-700">Tanlangan manzil:</p>
                <p className="line-clamp-2 text-[11px] text-primary-600">{pickedLocation.address}</p>
              </div>
            </div>
          )}
          <Input id="add-name" label="Ism Familiya *" value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Masalan: Aliyev Jasur" autoFocus />
          <Input id="add-phone" label="Telefon raqam *" value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="+998901234567" />
          <div>
            <label htmlFor="add-note" className="mb-1.5 block text-sm font-medium text-text-primary">
              Izoh * <span className="text-[11px] font-normal text-text-muted">(majburiy)</span>
            </label>
            <textarea
              id="add-note"
              value={form.note}
              onChange={(e) => setField('note', e.target.value)}
              placeholder="Mijoz haqida qisqacha izoh..."
              rows={2}
              className="min-h-[44px] w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:outline-2 focus:outline-primary-500"
            />
          </div>
          <div>
            <label htmlFor="add-return" className="mb-1.5 block text-sm font-medium text-text-primary">
              Qaytib kelish sanasi * <span className="text-[11px] font-normal text-text-muted">(majburiy)</span>
            </label>
            <input
              id="add-return"
              type="date"
              value={form.returnDate}
              onChange={(e) => setField('returnDate', e.target.value)}
              className="min-h-[44px] w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:outline-2 focus:outline-primary-500"
            />
          </div>
          {!isFormValid && (
            <div className="flex items-center gap-2 rounded-lg bg-warning-50 px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-warning-600" />
              <p className="text-[11px] text-warning-700">Barcha maydonlarni to'ldiring</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => { setModalOpen(false); setPickedLocation(null); }} disabled={saving}>Bekor qilish</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!isFormValid || saving}>
              <Plus className="h-4 w-4" /> Saqlash
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
