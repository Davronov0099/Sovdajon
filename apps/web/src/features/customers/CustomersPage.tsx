import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Users, Plus, Phone, MapPin, Loader2, AlertCircle, DollarSign, ShoppingBag, Pencil, Trash2, ChevronRight, ChevronLeft, Clock, UserPlus, LayoutGrid, LayoutList, Eye } from 'lucide-react';
import { formatCurrency, formatPhone, UZ_VILOYATLAR, getTumanlar } from '@sardorbek/shared';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/common/SearchInput';
import { useInfiniteCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/useCustomers';
import { useCustomerCategories, useCreateCustomerCategory, useDeleteCustomerCategory } from '@/hooks/useCustomerCategories';
import { useDebts } from '@/hooks/useDebts';
import { useToast } from '@/components/ui/toast';
import { ContactsPanel } from '@/components/common/ContactsPanel';
import { cn } from '@/lib/cn';

type SortMode = 'newest' | 'name' | 'name-desc';
type ViewMode = 'card' | 'table';

export function CustomersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editModal, setEditModal] = useState<{ id: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [viloyat, setViloyat] = useState('');
  const [tuman, setTuman] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const catScrollRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+998');
  const [formViloyat, setFormViloyat] = useState('');
  const [formTuman, setFormTuman] = useState('');

  const [note, setNote] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');

  const formTumanlar = formViloyat ? getTumanlar(formViloyat) : [];

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteCustomers({ search, categoryId: categoryId || undefined, limit: 50 });
  const { data: debtsData } = useDebts({ limit: 100 });
  const { data: catData } = useCustomerCategories();
  const createMut = useCreateCustomer();
  const updateMut = useUpdateCustomer();
  const deleteMut = useDeleteCustomer();
  const createCatMut = useCreateCustomerCategory();
  const deleteCatMut = useDeleteCustomerCategory();

  const categories = catData?.data ?? [];
  const [newCatName, setNewCatName] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [deleteCatConfirm, setDeleteCatConfirm] = useState<{ id: string; name: string } | null>(null);

  const rawCustomers = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
  const totalCount = data?.pages[0]?.pagination.total ?? 0;

  const debtMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of (debtsData?.data ?? [])) {
      if (d.status === 'PAID') continue;
      const cid = d.customer?.id;
      if (!cid) continue;
      map.set(cid, (map.get(cid) || 0) + (Number(d.remainingAmount) || 0));
    }
    return map;
  }, [debtsData]);

  const customers = useMemo(() => {
    let list = rawCustomers;
    if (viloyat) list = list.filter((c) => c.address?.split(',')[0]?.trim() === viloyat);
    if (tuman) list = list.filter((c) => c.address?.split(',')[1]?.trim() === tuman);
    if (sortMode === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'uz'));
    else if (sortMode === 'name-desc') list = [...list].sort((a, b) => b.name.localeCompare(a.name, 'uz'));
    return list;
  }, [rawCustomers, viloyat, tuman, sortMode]);

  const stats = useMemo(() => {
    let withDebt = 0, totalDebt = 0, totalSales = 0;
    for (const c of rawCustomers) totalSales += c._count?.receipts ?? 0;
    debtMap.forEach((r) => { withDebt++; totalDebt += r; });
    return { total: totalCount, withDebt, totalDebt, totalSales };
  }, [totalCount, debtMap, rawCustomers]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => { setTuman(''); }, [viloyat]);

  const [formStartDate, setFormStartDate] = useState('');

  function resetForm() { setName(''); setPhone('+998'); setFormViloyat(''); setFormTuman(''); setNote(''); setFormCategoryId(''); setFormStartDate(''); }

  function getWorkDuration(startDate: string | null): string {
    if (!startDate) return '';
    const start = new Date(startDate);
    const now = new Date();
    const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (months < 1) return 'Yangi';
    if (months < 12) return `${months} oy`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years} yil ${rem} oy` : `${years} yil`;
  }

  const buildAddress = () => {
    if (!formViloyat) return undefined;
    return formTuman ? `${formViloyat}, ${formTuman}` : formViloyat;
  };

  const handleCreate = useCallback(async () => {
    if (!name.trim()) { toast('Ismni kiriting', 'error'); return; }
    if (!phone || phone.length < 13) { toast('Telefon raqamni kiriting', 'error'); return; }
    try {
      await createMut.mutateAsync({ name: name.trim(), phone, address: buildAddress(), note: note || undefined, startDate: formStartDate || undefined, categoryId: formCategoryId || null });
      toast('Mijoz yaratildi', 'success');
      setModalOpen(false); resetForm();
    } catch { toast("Yaratish xatosi", 'error'); }
  }, [name, phone, formViloyat, formTuman, note, formStartDate, formCategoryId, createMut, toast]);

  const handleUpdate = useCallback(async () => {
    if (!editModal || !name.trim()) return;
    try {
      await updateMut.mutateAsync({ id: editModal.id, name: name.trim(), phone, address: buildAddress(), note: note || undefined, startDate: formStartDate || undefined, categoryId: formCategoryId || null });
      toast('Yangilandi', 'success');
      setEditModal(null);
    } catch { toast('Yangilash xatosi', 'error'); }
  }, [editModal, name, phone, formViloyat, formTuman, note, formStartDate, formCategoryId, updateMut, toast]);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMut.mutateAsync(deleteConfirm.id);
      toast("O'chirildi", 'success');
      setDeleteConfirm(null);
    } catch { toast("O'chirish xatosi", 'error'); }
  }, [deleteConfirm, deleteMut, toast]);

  function openEdit(c: typeof rawCustomers[0]) {
    setName(c.name); setPhone(c.phone);
    const parts = (c.address || '').split(',').map((s) => s.trim());
    setFormViloyat(parts[0] || ''); setFormTuman(parts[1] || '');
    setNote(c.note || '');
    setFormCategoryId(c.categoryId || '');
    setFormStartDate(c.startDate ? c.startDate.slice(0, 10) : '');
    setEditModal({ id: c.id });
  }

  const categorySelect = (
    <div>
      <label htmlFor="c-category" className="mb-1.5 block text-sm font-medium text-text-primary">Kategoriya</label>
      <select
        id="c-category"
        value={formCategoryId}
        onChange={(e) => setFormCategoryId(e.target.value)}
        className="min-h-[44px] w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:outline-2 focus:outline-primary-500"
      >
        <option value="">Tanlanmagan</option>
        {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
      </select>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-text-primary">{t('nav.customers')}</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">{totalCount > 0 ? `${totalCount} ta mijoz` : 'Mijozlar boshqaruvi'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ContactsPanel mode="customer" onAccept={async (c) => { await createMut.mutateAsync({ name: c.name, phone: c.phone }); }} />
          {/* View toggle */}
          <div className="hidden sm:flex items-center gap-1 rounded-lg border border-border p-0.5">
            <button
              onClick={() => setViewMode('card')}
              className={cn('flex h-7 w-7 items-center justify-center rounded-md transition-colors', viewMode === 'card' ? 'bg-primary-600 text-white' : 'text-text-muted hover:bg-surface-secondary')}
              style={{ minHeight: 'auto', minWidth: 'auto' }}
              title="Kartochka ko'rinishi"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn('flex h-7 w-7 items-center justify-center rounded-md transition-colors', viewMode === 'table' ? 'bg-primary-600 text-white' : 'text-text-muted hover:bg-surface-secondary')}
              style={{ minHeight: 'auto', minWidth: 'auto' }}
              title="Jadval ko'rinishi"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="btn btn-secondary btn-sm sm:btn-md"
            title="Yangi mijoz qo'shish"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Mijoz kiritish</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
        <div className="stat-card flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50"><Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" /></div>
          <div><p className="text-[10px] sm:text-xs text-text-muted">Jami</p><p className="text-sm sm:text-xl font-bold text-text-primary">{stats.total}</p></div>
        </div>
        <div className="stat-card flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-warning-50"><AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-warning-600" /></div>
          <div><p className="text-[10px] sm:text-xs text-text-muted">Qarzdor</p><p className="text-sm sm:text-xl font-bold text-text-primary">{stats.withDebt}</p></div>
        </div>
        <div className="stat-card flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-danger-50"><DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-danger-600" /></div>
          <div className="min-w-0"><p className="text-[10px] sm:text-xs text-text-muted">Qarz</p><p className="text-xs sm:text-base font-bold text-danger-600 tabular-nums truncate">{formatCurrency(stats.totalDebt)}</p></div>
        </div>
        <div className="stat-card flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-success-50"><ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-success-600" /></div>
          <div><p className="text-[10px] sm:text-xs text-text-muted">Xarid</p><p className="text-sm sm:text-xl font-bold text-text-primary">{stats.totalSales}</p></div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-3 sm:mb-4">
        <SearchInput value={search} onChange={(v) => setSearch(v)} placeholder="Ism yoki telefon..." className="w-full" />
      </div>

      {/* Category chips — doim ko'rinadi */}
      <div className="relative mb-2">
        {categories.length > 3 && (
          <>
            <button onClick={() => catScrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })} className="absolute left-0 top-0 z-10 flex h-full w-7 items-center justify-center bg-gradient-to-r from-surface-secondary to-transparent text-text-muted hover:text-text-primary" style={{ minHeight: 'auto', minWidth: 'auto' }} tabIndex={-1}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => catScrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })} className="absolute right-0 top-0 z-10 flex h-full w-7 items-center justify-center bg-gradient-to-l from-surface-secondary to-transparent text-text-muted hover:text-text-primary" style={{ minHeight: 'auto', minWidth: 'auto' }} tabIndex={-1}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
        <div ref={catScrollRef} className="flex gap-1.5 px-2 py-1.5 overflow-x-auto no-scrollbar" onWheel={(e) => { if (catScrollRef.current && e.deltaY !== 0) { e.preventDefault(); catScrollRef.current.scrollBy({ left: e.deltaY * 2, behavior: 'auto' }); } }}>
          <button onClick={() => setCategoryId('')} className={cn('shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all', !categoryId ? 'bg-sidebar text-white shadow-sm' : 'bg-surface-tertiary/70 text-text-secondary hover:bg-surface-tertiary')} style={{ minHeight: '32px', minWidth: 'auto' }}>
            Barchasi
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryId(categoryId === cat.id ? '' : cat.id)}
              onDoubleClick={() => setDeleteCatConfirm({ id: cat.id, name: cat.name })}
              className={cn('shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all', categoryId === cat.id ? 'bg-sidebar text-white shadow-sm' : 'bg-surface-tertiary/70 text-text-secondary hover:bg-surface-tertiary')}
              style={{ minHeight: '32px', minWidth: 'auto' }}
              title="2 marta bosing — o'chirish"
            >
              {cat.name} <span className="ml-1 text-[11px] opacity-70">{cat._count?.customers ?? 0}</span>
            </button>
          ))}
          {/* Yangi kategoriya qo'shish */}
          {showNewCat ? (
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCatName.trim()) {
                    createCatMut.mutate({ name: newCatName.trim() }, { onSuccess: () => { setNewCatName(''); setShowNewCat(false); } });
                  }
                  if (e.key === 'Escape') { setShowNewCat(false); setNewCatName(''); }
                }}
                placeholder="Kategoriya nomi..."
                className="w-32 rounded-lg border border-primary-300 bg-surface px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary-400"
                style={{ minHeight: '32px' }}
                autoFocus
              />
              <button
                onClick={() => { if (newCatName.trim()) createCatMut.mutate({ name: newCatName.trim() }, { onSuccess: () => { setNewCatName(''); setShowNewCat(false); } }); }}
                disabled={!newCatName.trim() || createCatMut.isPending}
                className="shrink-0 rounded-lg bg-primary-600 px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                style={{ minHeight: '32px', minWidth: 'auto' }}
              >
                {createCatMut.isPending ? '...' : 'OK'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewCat(true)}
              className="shrink-0 flex items-center gap-1 rounded-lg border-2 border-dashed border-border px-3 py-1.5 text-[13px] font-medium text-text-muted hover:border-primary-300 hover:text-primary-600 transition-all"
              style={{ minHeight: '32px', minWidth: 'auto' }}
            >
              <Plus className="h-3.5 w-3.5" />
              Kategoriya
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <select value={viloyat} onChange={(e) => setViloyat(e.target.value)} className="input shrink-0 text-xs sm:text-sm" style={{ minWidth: '130px', maxWidth: '200px' }}>
          <option value="">Barcha viloyatlar</option>
          {UZ_VILOYATLAR.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        {viloyat && (
          <select value={tuman} onChange={(e) => setTuman(e.target.value)} className="input shrink-0 text-xs sm:text-sm" style={{ minWidth: '120px', maxWidth: '180px' }}>
            <option value="">Barcha tumanlar</option>
            {getTumanlar(viloyat).map((tu) => <option key={tu} value={tu}>{tu}</option>)}
          </select>
        )}
        <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="input shrink-0 text-xs sm:text-sm" style={{ minWidth: '110px', maxWidth: '160px' }}>
          <option value="newest">Yangi</option>
          <option value="name">Ism (A-Z)</option>
          <option value="name-desc">Ism (Z-A)</option>
        </select>
      </div>

      {/* View toggle (mobile) */}
      <div className="mb-3 flex items-center gap-2 sm:hidden">
        <button onClick={() => setViewMode('card')} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors', viewMode === 'card' ? 'bg-primary-600 text-white' : 'bg-surface-secondary text-text-muted')} style={{ minHeight: 'auto' }}>
          <LayoutGrid className="h-3.5 w-3.5" /> Kartochka
        </button>
        <button onClick={() => setViewMode('table')} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors', viewMode === 'table' ? 'bg-primary-600 text-white' : 'bg-surface-secondary text-text-muted')} style={{ minHeight: 'auto' }}>
          <LayoutList className="h-3.5 w-3.5" /> Jadval
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-[180px] rounded-xl" />)}
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Users className="mb-4 h-14 w-14 opacity-20" />
          <p className="text-sm font-medium">Mijoz topilmadi</p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr style={{ background: 'var(--color-surface-secondary)', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">Ism</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">Telefon</th>
                  <th className="hidden px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted sm:table-cell">Kategoriya</th>
                  <th className="hidden px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted md:table-cell">Manzil</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">Qarz</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => {
                  const debt = debtMap.get(c.id) || 0;
                  return (
                    <tr
                      key={c.id}
                      className="cursor-pointer transition-colors hover:bg-surface-secondary"
                      style={{ borderBottom: '1px solid var(--color-border-subtle)', background: i % 2 === 0 ? 'var(--color-surface)' : 'transparent' }}
                      onClick={() => navigate({ to: '/customers/$customerId', params: { customerId: c.id } })}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[11px] font-bold text-primary-700">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-text-primary">{c.name}</p>
                            {getWorkDuration(c.startDate) && (
                              <p className="flex items-center gap-0.5 text-[10px] text-info-600">
                                <Clock className="h-2.5 w-2.5" />{getWorkDuration(c.startDate)}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[13px] text-text-secondary tabular-nums whitespace-nowrap">{formatPhone(c.phone)}</td>
                      <td className="hidden px-3 py-3 sm:table-cell">
                        {c.category ? (
                          <span className="rounded bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-600">{c.category.name}</span>
                        ) : <span className="text-[12px] text-text-muted">—</span>}
                      </td>
                      <td className="hidden px-3 py-3 md:table-cell">
                        <span className="line-clamp-1 max-w-[160px] text-[12px] text-text-muted">{c.address ?? '—'}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {debt > 0 ? (
                          <span className="rounded bg-danger-50 px-1.5 py-0.5 text-[11px] font-bold text-danger-600 tabular-nums">{formatCurrency(debt)}</span>
                        ) : (
                          <span className="rounded bg-success-50 px-1.5 py-0.5 text-[11px] font-medium text-success-600">Qarzsiz</span>
                        )}
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => navigate({ to: '/customers/$customerId', params: { customerId: c.id } })} className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-surface-tertiary hover:text-primary-600 transition-colors" style={{ minHeight: 'auto', minWidth: 'auto' }} title="Ko'rish">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => openEdit(c)} className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-surface-tertiary transition-colors" style={{ minHeight: 'auto', minWidth: 'auto' }} title="Tahrirlash">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteConfirm({ id: c.id, name: c.name })} className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-danger-50 hover:text-danger-600 transition-colors" style={{ minHeight: 'auto', minWidth: 'auto' }} title="O'chirish">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div ref={loadMoreRef} className="flex items-center justify-center py-4">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-sm text-text-muted"><Loader2 className="h-4 w-4 animate-spin" />Yuklanmoqda...</div>
            ) : hasNextPage ? <div className="h-4" /> : <p className="text-xs text-text-muted">Barcha {customers.length} ta mijoz</p>}
          </div>
        </>
      ) : (
        /* CARD VIEW */
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {customers.map((c) => {
              const debt = debtMap.get(c.id) || 0;
              const sales = c._count?.receipts ?? 0;
              return (
                <div key={c.id} onClick={() => navigate({ to: '/customers/$customerId', params: { customerId: c.id } })} className="card p-2 sm:p-3 flex flex-col transition-all hover:shadow-card-hover cursor-pointer active:scale-[0.98]">
                  {/* Name */}
                  <div className="min-w-0 mb-1">
                    <h3 className="text-[13px] sm:text-sm font-bold text-text-primary leading-snug line-clamp-2">{c.name}</h3>
                  </div>

                  {/* Category badge */}
                  {c.category && (
                    <span className="inline-block self-start rounded bg-primary-50 px-1.5 py-px text-[9px] sm:text-[10px] font-medium text-primary-600 mb-0.5 truncate max-w-full">
                      {c.category.name}
                    </span>
                  )}

                  {/* Phone + address */}
                  <p className="flex items-center gap-1 text-[10px] text-text-muted mb-0.5">
                    <Phone className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{formatPhone(c.phone)}</span>
                  </p>
                  {c.address && (
                    <p className="flex items-center gap-1 text-[10px] text-text-muted mb-0.5">
                      <MapPin className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{c.address}</span>
                    </p>
                  )}

                  {/* Duration + Debt badge + sales */}
                  <div className="flex items-center gap-1.5 mt-1 mb-1 flex-wrap">
                    {getWorkDuration(c.startDate) && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] text-info-600 font-medium">
                        <Clock className="h-2.5 w-2.5" />{getWorkDuration(c.startDate)}
                      </span>
                    )}
                    <span className="text-[9px] sm:text-[10px] text-text-muted">{sales} xarid</span>
                    {debt > 0 ? (
                      <span className="ml-auto rounded bg-danger-50 px-1 py-px text-[9px] sm:text-[10px] font-bold text-danger-600 tabular-nums">
                        {formatCurrency(debt)}
                      </span>
                    ) : (
                      <span className="ml-auto rounded bg-success-50 px-1 py-px text-[9px] sm:text-[10px] font-medium text-success-600">Qarzsiz</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex items-center gap-1.5 pt-1.5" style={{ borderTop: '1px solid var(--color-border-subtle)' }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(c)} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-secondary active:bg-surface-tertiary transition-colors" style={{ minHeight: 'auto', minWidth: 'auto' }} title="Tahrirlash">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteConfirm({ id: c.id, name: c.name })} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-danger-50 hover:text-danger-600 active:bg-danger-100 transition-colors" style={{ minHeight: 'auto', minWidth: 'auto' }} title="O'chirish">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div ref={loadMoreRef} className="flex items-center justify-center py-6">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-sm text-text-muted"><Loader2 className="h-4 w-4 animate-spin" />Yuklanmoqda...</div>
            ) : hasNextPage ? <div className="h-4" /> : customers.length > 0 ? (
              <p className="text-xs text-text-muted">Barcha {customers.length} ta mijoz</p>
            ) : null}
          </div>
        </>
      )}

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Yangi mijoz" size="sm">
        <div className="space-y-4">
          <Input id="c-name" label="Ism *" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ism familiya" />
          <Input id="c-phone" label="Telefon *" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998901234567" />
          {categorySelect}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="c-viloyat" className="mb-1.5 block text-sm font-medium text-text-primary">Viloyat</label>
              <select id="c-viloyat" value={formViloyat} onChange={(e) => { setFormViloyat(e.target.value); setFormTuman(''); }}
                className="min-h-[44px] w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:outline-2 focus:outline-primary-500">
                <option value="">Tanlang</option>
                {UZ_VILOYATLAR.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="c-tuman" className="mb-1.5 block text-sm font-medium text-text-primary">Tuman/Shahar</label>
              <select id="c-tuman" value={formTuman} onChange={(e) => setFormTuman(e.target.value)} disabled={!formViloyat}
                className="min-h-[44px] w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:outline-2 focus:outline-primary-500 disabled:opacity-50">
                <option value="">Tanlang</option>
                {formTumanlar.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <Input id="c-start" label="Ishlash boshlanish sanasi" type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
          <Input id="c-note" label="Izoh" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={createMut.isPending}>{t('common.cancel')}</Button>
            <Button onClick={handleCreate} loading={createMut.isPending} disabled={!name.trim() || phone.length < 13}>{t('common.create')}</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Mijozni tahrirlash" size="sm">
        <div className="space-y-4">
          <Input id="e-name" label="Ism *" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <Input id="e-phone" label="Telefon *" value={phone} onChange={(e) => setPhone(e.target.value)} />
          {categorySelect}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="e-viloyat" className="mb-1.5 block text-sm font-medium text-text-primary">Viloyat</label>
              <select id="e-viloyat" value={formViloyat} onChange={(e) => { setFormViloyat(e.target.value); setFormTuman(''); }}
                className="min-h-[44px] w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:outline-2 focus:outline-primary-500">
                <option value="">Tanlang</option>
                {UZ_VILOYATLAR.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="e-tuman" className="mb-1.5 block text-sm font-medium text-text-primary">Tuman/Shahar</label>
              <select id="e-tuman" value={formTuman} onChange={(e) => setFormTuman(e.target.value)} disabled={!formViloyat}
                className="min-h-[44px] w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:outline-2 focus:outline-primary-500 disabled:opacity-50">
                <option value="">Tanlang</option>
                {formTumanlar.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <Input id="e-start" label="Ishlash boshlanish sanasi" type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
          <Input id="e-note" label="Izoh" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditModal(null)} disabled={updateMut.isPending}>{t('common.cancel')}</Button>
            <Button onClick={handleUpdate} loading={updateMut.isPending} disabled={!name.trim()}>Saqlash</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="O'chirishni tasdiqlang" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary"><strong className="text-text-primary">{deleteConfirm?.name}</strong> mijozini o'chirishga ishonchingiz kommi?</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={deleteMut.isPending}>{t('common.cancel')}</Button>
            <button onClick={handleDelete} disabled={deleteMut.isPending} className="btn btn-md bg-danger-600 text-white hover:bg-danger-700">
              {deleteMut.isPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              O'chirish
            </button>
          </div>
        </div>
      </Modal>
      {/* Delete Category Modal */}
      <Modal open={!!deleteCatConfirm} onClose={() => setDeleteCatConfirm(null)} title="Kategoriyani o'chirish" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            <strong className="text-text-primary">"{deleteCatConfirm?.name}"</strong> kategoriyasini o'chirmoqchimisiz? Ushbu kategoriyaga tegishli mijozlar kategoriyasiz qoladi.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteCatConfirm(null)} disabled={deleteCatMut.isPending}>{t('common.cancel')}</Button>
            <button
              onClick={() => {
                if (deleteCatConfirm) {
                  deleteCatMut.mutate(deleteCatConfirm.id, {
                    onSuccess: () => {
                      setDeleteCatConfirm(null);
                      if (categoryId === deleteCatConfirm.id) setCategoryId('');
                      toast("Kategoriya o'chirildi", 'success');
                    },
                  });
                }
              }}
              disabled={deleteCatMut.isPending}
              className="btn btn-md bg-danger-600 text-white hover:bg-danger-700"
            >
              {deleteCatMut.isPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              O'chirish
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
