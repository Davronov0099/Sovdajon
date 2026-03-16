import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Contact, Plus, Upload, Tag, Trash2, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/common/SearchInput';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useContacts, useContactCategories, useCreateContact, useUpdateContact, useDeleteContact, useImportContacts, useCreateContactCategory, useDeleteContactCategory } from '@/hooks/useContacts';
import { useToast } from '@/components/ui/toast';
import type { ContactItem, ContactCategoryItem } from '@/types/api';

export function ContactsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Category management
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const { data, isLoading } = useContacts({ search, categoryId: categoryFilter || undefined, page });
  const { data: catData } = useContactCategories();
  const createMut = useCreateContact();
  const updateMut = useUpdateContact();
  const deleteMut = useDeleteContact();
  const importMut = useImportContacts();
  const createCatMut = useCreateContactCategory();
  const deleteCatMut = useDeleteContactCategory();

  const contacts: ContactItem[] = data?.data ?? [];
  const pagination = data?.pagination;
  const categories: ContactCategoryItem[] = catData?.data ?? [];

  function openEdit(c: ContactItem) {
    setEditId(c.id); setName(c.name); setPhone(c.phone);
    setCategoryId(c.categoryId ?? ''); setNote(c.note ?? '');
    setModalOpen(true);
  }

  const handleSave = useCallback(async () => {
    if (!name.trim() || !phone.trim()) { toast('Ism va telefon kerak', 'error'); return; }
    try {
      const payload = { name: name.trim(), phone: phone.trim(), categoryId: categoryId || undefined, note: note || undefined };
      if (editId) {
        await updateMut.mutateAsync({ id: editId, ...payload });
        toast('Kontakt yangilandi', 'success');
      } else {
        await createMut.mutateAsync(payload);
        toast('Kontakt yaratildi', 'success');
      }
      setModalOpen(false); setEditId(null); setName(''); setPhone(''); setCategoryId(''); setNote('');
    } catch { toast('Xatolik', 'error'); }
  }, [editId, name, phone, categoryId, note, createMut, updateMut, toast]);

  async function handleDelete() {
    if (!deleteTarget) return;
    try { await deleteMut.mutateAsync(deleteTarget.id); toast("O'chirildi", 'success'); }
    catch { toast("O'chirish xatosi", 'error'); }
    setDeleteTarget(null);
  }

  async function handleImport() {
    // File input trigger — simplified version
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        let parsed: { name: string; phone: string }[];
        if (file.name.endsWith('.json')) {
          parsed = JSON.parse(text);
        } else {
          // CSV: name,phone per line
          parsed = text.split('\n').filter(Boolean).map((line) => {
            const [n, p] = line.split(',');
            return { name: n?.trim() ?? '', phone: p?.trim() ?? '' };
          }).filter((c) => c.name && c.phone);
        }
        if (parsed.length === 0) { toast("Kontaktlar topilmadi", 'error'); return; }
        const result = await importMut.mutateAsync({ contacts: parsed, categoryId: categoryFilter || undefined });
        const data = result as { data?: { created: number; duplicates: number } };
        toast(`${data.data?.created ?? 0} ta yaratildi, ${data.data?.duplicates ?? 0} ta dublikat`, 'success');
      } catch { toast('Import xatosi', 'error'); }
    };
    input.click();
  }

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{t('nav.contacts')}</h1>
          <p className="text-sm text-text-muted mt-0.5">CRM kontaktlar</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCatModalOpen(true)} className="btn btn-secondary btn-md">
            <Tag className="h-4 w-4" aria-hidden="true" /> Kategoriyalar
          </button>
          <button onClick={handleImport} className="btn btn-secondary btn-md" disabled={importMut.isPending}>
            <Upload className="h-4 w-4" aria-hidden="true" /> Import
          </button>
          <button onClick={() => { setEditId(null); setName(''); setPhone(''); setCategoryId(''); setNote(''); setModalOpen(true); }} className="btn btn-primary btn-md">
            <Plus className="h-4 w-4" aria-hidden="true" /> Yangi
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Ism yoki telefon..." className="w-full sm:w-72" />
        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="min-h-[44px] rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-primary-500" aria-label="Kategoriya filter">
          <option value="">Barcha kategoriya</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c._count.contacts})</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Contact className="mb-4 h-16 w-16" /><p className="text-lg font-medium">{t('common.noData')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-shadow hover:shadow-card">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-600">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-medium text-text-primary">{c.name}</h3>
                <p className="text-sm text-text-muted">{c.phone}</p>
              </div>
              {c.category && (
                <span className="shrink-0 rounded-full bg-surface-secondary px-2.5 py-0.5 text-xs font-medium text-text-muted">{c.category.name}</span>
              )}
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => openEdit(c)} className="min-h-[44px] min-w-[44px] rounded-lg p-2.5 text-text-muted hover:bg-surface-secondary hover:text-primary-600" aria-label={`${c.name} ni tahrirlash`}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setDeleteTarget({ id: c.id, name: c.name })} className="min-h-[44px] min-w-[44px] rounded-lg p-2.5 text-text-muted hover:bg-danger-50 hover:text-danger-600" aria-label={`${c.name} ni o'chirish`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Oldingi</Button>
          <span className="text-sm text-text-muted">{page} / {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Keyingi</Button>
        </div>
      )}

      {/* Contact Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Kontakt tahrirlash' : 'Yangi kontakt'} size="sm">
        <div className="space-y-4">
          <Input id="ct-name" label="Ism" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
          <Input id="ct-phone" label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <div>
            <label htmlFor="ct-cat" className="mb-1.5 block text-sm font-medium text-text-primary">Kategoriya</label>
            <select id="ct-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="min-h-[44px] w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm focus:outline-2 focus:outline-offset-2 focus:outline-primary-500">
              <option value="">Tanlanmagan</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Input id="ct-note" label="Izoh (ixtiyoriy)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} loading={createMut.isPending || updateMut.isPending} disabled={!name.trim() || !phone.trim()}>{t('common.save')}</Button>
          </div>
        </div>
      </Modal>

      {/* Category Management */}
      <Modal open={catModalOpen} onClose={() => setCatModalOpen(false)} title="Kontakt kategoriyalari" size="sm">
        <div className="space-y-3">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-sm font-medium text-text-primary">{c.name} <span className="text-text-muted">({c._count.contacts})</span></span>
              <button type="button" onClick={() => { deleteCatMut.mutate(c.id); }} className="min-h-[44px] min-w-[44px] rounded p-2.5 text-text-muted hover:text-danger-600" aria-label={`${c.name} kategoriyani o'chirish`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input id="new-cat" label="" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Yangi kategoriya nomi..." />
            <Button onClick={async () => {
              if (!newCatName.trim()) return;
              await createCatMut.mutateAsync({ name: newCatName.trim() });
              setNewCatName('');
            }} loading={createCatMut.isPending} disabled={!newCatName.trim()}>Qo'shish</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Kontakt o'chirish" description={`"${deleteTarget?.name}" ni o'chirmoqchimisiz?`} confirmText="O'chirish" variant="danger" loading={deleteMut.isPending} />
    </div>
  );
}
