import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { Users, Plus, Phone, MapPin, Loader2, AlertCircle, DollarSign, ShoppingBag, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { formatCurrency, formatPhone, UZ_VILOYATLAR, getTumanlar } from '@sardorbek/shared';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/common/SearchInput';
import { useInfiniteCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/useCustomers';
import { useDebts } from '@/hooks/useDebts';
import { useToast } from '@/components/ui/toast';
import { ContactsPanel } from '@/components/common/ContactsPanel';

type SortMode = 'newest' | 'name' | 'name-desc';

export function CustomersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editModal, setEditModal] = useState<{ id: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [viloyat, setViloyat] = useState('');
  const [tuman, setTuman] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+998');
  const [formViloyat, setFormViloyat] = useState('');
  const [formTuman, setFormTuman] = useState('');
  const [debtLimit, setDebtLimit] = useState('');
  const [note, setNote] = useState('');

  const formTumanlar = formViloyat ? getTumanlar(formViloyat) : [];

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteCustomers({ search, limit: 50 });
  const { data: debtsData } = useDebts({ limit: 100 });
  const createMut = useCreateCustomer();
  const updateMut = useUpdateCustomer();
  const deleteMut = useDeleteCustomer();

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

  function resetForm() { setName(''); setPhone('+998'); setFormViloyat(''); setFormTuman(''); setDebtLimit(''); setNote(''); }

  const buildAddress = () => {
    if (!formViloyat) return undefined;
    return formTuman ? `${formViloyat}, ${formTuman}` : formViloyat;
  };

  const handleCreate = useCallback(async () => {
    if (!name.trim()) { toast('Ismni kiriting', 'error'); return; }
    if (!phone || phone.length < 13) { toast('Telefon raqamni kiriting', 'error'); return; }
    try {
      await createMut.mutateAsync({ name: name.trim(), phone, address: buildAddress(), debtLimit: debtLimit ? Number(debtLimit) : undefined, note: note || undefined });
      toast('Mijoz yaratildi', 'success');
      setModalOpen(false); resetForm();
    } catch { toast("Yaratish xatosi", 'error'); }
  }, [name, phone, formViloyat, formTuman, debtLimit, note, createMut, toast]);

  const handleUpdate = useCallback(async () => {
    if (!editModal || !name.trim()) return;
    try {
      await updateMut.mutateAsync({ id: editModal.id, name: name.trim(), phone, address: buildAddress(), debtLimit: debtLimit ? Number(debtLimit) : undefined, note: note || undefined });
      toast('Yangilandi', 'success');
      setEditModal(null);
    } catch { toast('Yangilash xatosi', 'error'); }
  }, [editModal, name, phone, formViloyat, formTuman, debtLimit, note, updateMut, toast]);

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
    setDebtLimit(c.debtLimit ? String(c.debtLimit) : ''); setNote(c.note || '');
    setEditModal({ id: c.id });
  }

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
          <button onClick={() => { resetForm(); setModalOpen(true); }} className="btn btn-primary btn-sm sm:btn-md">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Yangi mijoz</span>
            <span className="sm:hidden">Qo'shish</span>
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

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-[180px] rounded-xl" />)}
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Users className="mb-4 h-14 w-14 opacity-20" />
          <p className="text-sm font-medium">Mijoz topilmadi</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {customers.map((c) => {
              const debt = debtMap.get(c.id) || 0;
              const sales = c._count?.receipts ?? 0;
              return (
                <div key={c.id} className="card p-2 sm:p-3 flex flex-col transition-all hover:shadow-card-hover">
                  {/* Name */}
                  <Link to="/customers/$customerId" params={{ customerId: c.id }} className="block min-w-0 mb-1">
                    <h3 className="text-[13px] sm:text-sm font-bold text-text-primary leading-snug hover:text-primary-600 transition-colors line-clamp-2">{c.name}</h3>
                  </Link>

                  {/* Phone + address */}
                  <p className="flex items-center gap-1 text-[10px] text-text-muted mb-0.5">
                    <Phone className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{formatPhone(c.phone)}</span>
                  </p>
                  {c.address && (
                    <p className="flex items-center gap-1 text-[10px] text-text-muted mb-0.5">
                      <MapPin className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{c.address}</span>
                    </p>
                  )}

                  {/* Debt badge + sales */}
                  <div className="flex items-center gap-1.5 mt-1 mb-1">
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
                  <div className="mt-auto flex items-center gap-1 pt-1" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                    <Link to="/customers/$customerId" params={{ customerId: c.id }} className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors" style={{ minHeight: 'auto', minWidth: 'auto' }} title="Batafsil">
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                    <button onClick={() => openEdit(c)} className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted hover:bg-surface-secondary transition-colors" style={{ minHeight: 'auto', minWidth: 'auto' }} title="Tahrirlash">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button onClick={() => setDeleteConfirm({ id: c.id, name: c.name })} className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted hover:bg-danger-50 hover:text-danger-600 transition-colors" style={{ minHeight: 'auto', minWidth: 'auto' }} title="O'chirish">
                      <Trash2 className="h-3 w-3" />
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
          <Input id="c-limit" label="Qarz chegarasi" type="number" value={debtLimit} onChange={(e) => setDebtLimit(e.target.value)} placeholder="0 = chegarasiz" />
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
          <Input id="e-limit" label="Qarz chegarasi" type="number" value={debtLimit} onChange={(e) => setDebtLimit(e.target.value)} />
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
    </div>
  );
}
