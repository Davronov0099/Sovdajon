import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, Loader2, BookUser, Trash2, Upload, UserPlus, Check } from 'lucide-react';
import { useInfiniteContacts, useContactCategories, useDeleteContact, useImportContacts } from '@/hooks/useContacts';
import { useInfiniteCustomers } from '@/hooks/useCustomers';
import { useInfiniteSuppliers } from '@/hooks/useSuppliers';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import type { ContactItem, ContactCategoryItem } from '@/types/api';

interface ContactsPanelProps {
  mode: 'customer' | 'supplier';
  onAccept: (contact: { name: string; phone: string }) => Promise<void>;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, '');
}

export function ContactsPanel({ mode, onAccept }: ContactsPanelProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'saved' | 'import'>('saved');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [accepting, setAccepting] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteContacts({
    search, categoryId: catFilter || undefined, limit: 2000,
  });
  const { data: catData } = useContactCategories();
  const deleteMut = useDeleteContact();
  const importMut = useImportContacts();

  const { data: custData } = useInfiniteCustomers({ limit: 100 });
  const { data: supData } = useInfiniteSuppliers({ limit: 100 });

  const contacts = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
  const totalCount = data?.pages[0]?.pagination.total ?? 0;
  const categories: ContactCategoryItem[] = catData?.data ?? [];

  const label = mode === 'customer' ? 'mijoz' : "ta'minotchi";

  // Phone lookup
  const { customerPhones, supplierPhones } = useMemo(() => {
    const cSet = new Set<string>();
    const sSet = new Set<string>();
    for (const page of custData?.pages ?? []) {
      for (const c of page.data) { if (c.phone) cSet.add(normalizePhone(c.phone)); }
    }
    for (const page of supData?.pages ?? []) {
      for (const s of page.data) { if (s.phone) sSet.add(normalizePhone(s.phone)); }
    }
    return { customerPhones: cSet, supplierPhones: sSet };
  }, [custData, supData]);

  const filteredCategories = categories.filter((c) => {
    const n = c.name.toLowerCase();
    return n === 'mijoz' || n === "ta'minotchi";
  });

  // Infinite scroll observer
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

  async function handleAccept(c: ContactItem) {
    setAccepting(c.id);
    try {
      await onAccept({ name: c.name, phone: c.phone });
      toast(`${c.name} ${label} sifatida qo'shildi`, 'success');
    } catch {
      toast('Xatolik yuz berdi', 'error');
    }
    setAccepting(null);
  }

  async function handleDelete(c: ContactItem) {
    try {
      await deleteMut.mutateAsync(c.id);
      toast(`${c.name} o'chirildi`, 'success');
    } catch {
      toast("O'chirish xatosi", 'error');
    }
  }

  async function handleImportFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json,.vcf';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        let parsed: { name: string; phone: string }[];
        if (file.name.endsWith('.json')) {
          parsed = JSON.parse(text);
        } else {
          parsed = text.split('\n').filter(Boolean).map((line) => {
            const [n, p] = line.split(',');
            return { name: n?.trim() ?? '', phone: p?.trim() ?? '' };
          }).filter((c) => c.name && c.phone);
        }
        if (parsed.length === 0) { toast('Kontakt topilmadi', 'error'); return; }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await importMut.mutateAsync({ contacts: parsed }) as any;
        toast(`${result?.data?.created ?? parsed.length} ta import qilindi`, 'success');
        setTab('saved');
      } catch { toast('Import xatosi', 'error'); }
    };
    input.click();
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  if (!open) {
    return (
      <button onClick={() => { setOpen(true); setSearch(''); setCatFilter(''); setTab('saved'); }}
        className="btn btn-secondary btn-sm sm:btn-md shrink-0">
        <BookUser className="h-4 w-4" />
        <span className="hidden sm:inline">Kontaktlar</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:justify-center sm:pt-[6vh]" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />

      <div
        className="compact-inputs relative z-10 w-full sm:max-w-lg bg-surface sm:rounded-2xl rounded-t-2xl flex flex-col shadow-modal animate-scale-in"
        style={{ maxHeight: 'calc(100dvh - 2rem)', minHeight: '70dvh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div>
            <h2 className="text-base font-bold text-text-primary">Kontaktlar</h2>
            <p className="text-[11px] text-text-muted">{totalCount} ta kontakt</p>
          </div>
          <button onClick={() => setOpen(false)} className="rounded-xl p-2 hover:bg-surface-secondary transition-colors">
            <X className="h-5 w-5 text-text-muted" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <button onClick={() => setTab('saved')}
            className={cn('flex-1 py-2.5 text-sm font-medium transition-colors', tab === 'saved' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-text-muted')}>
            Saqlangan ({totalCount})
          </button>
          <button onClick={() => setTab('import')}
            className={cn('flex-1 py-2.5 text-sm font-medium transition-colors', tab === 'import' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-text-muted')}>
            Import
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {tab === 'saved' ? (
            <>
              {/* Category pills */}
              <div className="px-3 pt-2 pb-1 shrink-0">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button onClick={() => setCatFilter('')}
                    className={cn('shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors', !catFilter ? 'bg-text-primary text-text-inverse' : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary')}>
                    Barchasi
                  </button>
                  {filteredCategories.map((cat) => {
                    const color = cat.name.toLowerCase() === 'mijoz' ? '#22c55e' : '#f59e0b';
                    return (
                      <button key={cat.id} onClick={() => setCatFilter(catFilter === cat.id ? '' : cat.id)}
                        className={cn('shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5', catFilter === cat.id ? 'bg-text-primary text-text-inverse' : 'bg-surface-secondary text-text-secondary hover:bg-surface-tertiary')}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catFilter === cat.id ? '#fff' : color }} />
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search */}
              <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Ism yoki telefon..."
                    className="w-full pl-9 pr-8 py-2 bg-surface-secondary border border-border rounded-xl text-sm focus:outline-2 focus:outline-primary-500 focus:bg-surface placeholder:text-text-muted/50" />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-text-muted" /></div>
                ) : contacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-text-muted">
                    <BookUser className="h-10 w-10 mb-2 opacity-20" />
                    <p className="text-xs">Kontakt topilmadi</p>
                  </div>
                ) : (
                  <>
                    {contacts.map((c) => {
                      const phone = normalizePhone(c.phone);
                      const isCustomer = customerPhones.has(phone);
                      const isSupplier = supplierPhones.has(phone);

                      return (
                        <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 active:bg-surface-secondary/50 transition-colors" style={{ borderBottom: '1px solid var(--color-border-subtle, #f1f5f9)' }}>
                          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-primary-50">
                            <span className="text-sm font-bold text-primary-600">{c.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-medium text-text-primary truncate">{c.name}</p>
                              {isCustomer && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded text-white shrink-0" style={{ backgroundColor: '#22c55e' }}>Mijoz</span>
                              )}
                              {isSupplier && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded text-white shrink-0" style={{ backgroundColor: '#f59e0b' }}>Ta'minotchi</span>
                              )}
                            </div>
                            <p className="text-xs text-text-muted">{c.phone}</p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {(mode === 'customer' && isCustomer) || (mode === 'supplier' && isSupplier) ? (
                              <span className="rounded-lg p-1.5 text-success-600" title="Allaqachon qo'shilgan">
                                <Check className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <button onClick={() => handleAccept(c)} disabled={accepting === c.id}
                                className="rounded-lg p-1.5 text-text-muted hover:bg-primary-50 hover:text-primary-600 transition-colors"
                                title={`${label} sifatida qo'shish`}>
                                {accepting === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                              </button>
                            )}
                            <button onClick={() => handleDelete(c)} disabled={deleteMut.isPending}
                              className="rounded-lg p-1.5 text-text-muted hover:bg-danger-50 hover:text-danger-600 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Load more trigger */}
                    <div ref={loadMoreRef} className="flex items-center justify-center py-4">
                      {isFetchingNextPage ? (
                        <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                      ) : hasNextPage ? (
                        <div className="h-2" />
                      ) : contacts.length > 0 ? (
                        <p className="text-[10px] text-text-muted">Barcha {contacts.length} ta kontakt</p>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
                <Upload className="h-7 w-7 text-primary-600" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-1">Kontaktlarni import qilish</h3>
              <p className="text-xs text-text-muted mb-5 max-w-xs">CSV yoki JSON formatida faylni tanlang. Har bir qatorda ism va telefon raqam bo'lishi kerak.</p>
              <button onClick={handleImportFile} disabled={importMut.isPending}
                className="btn btn-primary btn-md px-6">
                {importMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Fayl tanlash
              </button>
              <div className="mt-6 text-left w-full max-w-xs">
                <p className="text-[10px] font-semibold text-text-muted uppercase mb-2">CSV format namunasi:</p>
                <pre className="text-[11px] text-text-muted bg-surface-secondary rounded-lg p-3 overflow-x-auto">Ism Familiya,+998901234567{'\n'}Alisher Aka,+998912345678</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
