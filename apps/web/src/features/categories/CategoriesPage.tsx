import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FolderTree, Trash2, Pencil, ChevronDown, ChevronRight, GripVertical, Layers } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import {
  useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
  useReorderCategories, useCreateSubCategory, useDeleteSubCategory,
} from '@/hooks/useCategories';

interface CategoryItem {
  id: string;
  name: string;
  icon: string | null;
  order: number;
  subCategories: { id: string; name: string; categoryId: string; order: number }[];
  _count: { products: number };
}

/* ─── Sortable Category Row ─── */

function SortableCategoryRow({
  cat, expanded, onToggle, onEdit, onDelete, onAddSub, onDeleteSub,
}: {
  cat: CategoryItem;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddSub: () => void;
  onDeleteSub: (id: string, name: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="card stagger-item">
      <div className="flex items-center gap-2 px-4 py-3">
        {/* Drag handle */}
        <button
          {...attributes} {...listeners}
          className="cursor-grab rounded-md p-1.5 text-text-muted hover:bg-surface-tertiary hover:text-text-secondary transition-colors"
          aria-label="Sudrab ko'chirish"
          style={{ minHeight: 'auto', minWidth: 'auto' }}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Expand/collapse */}
        {cat.subCategories.length > 0 ? (
          <button
            onClick={onToggle}
            className="rounded-md p-1.5 text-text-muted hover:bg-surface-tertiary transition-colors"
            aria-label={expanded ? 'Yopish' : 'Ochish'}
            style={{ minHeight: 'auto', minWidth: 'auto' }}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : <span className="w-7" />}

        {/* Category icon + name */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          <FolderTree className="h-4 w-4" />
        </div>
        <span className="flex-1 text-sm font-medium text-text-primary">{cat.name}</span>

        {/* Product count badge */}
        <span className="badge badge-neutral text-[10px]">
          {cat._count.products} ta
        </span>

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onAddSub}
            className="rounded-md p-2 text-text-muted hover:bg-primary-50 hover:text-primary-600 transition-colors"
            aria-label="Sub-kategoriya qo'shish"
            title="Sub-kategoriya"
            style={{ minHeight: 'auto', minWidth: 'auto' }}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onEdit}
            className="rounded-md p-2 text-text-muted hover:bg-primary-50 hover:text-primary-600 transition-colors"
            aria-label="Tahrirlash"
            style={{ minHeight: 'auto', minWidth: 'auto' }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-md p-2 text-text-muted hover:bg-danger-50 hover:text-danger-600 transition-colors"
            aria-label="O'chirish"
            style={{ minHeight: 'auto', minWidth: 'auto' }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Sub-categories */}
      {expanded && cat.subCategories.length > 0 && (
        <div style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          {cat.subCategories.map((sub) => (
            <div key={sub.id} className="flex items-center gap-3 py-2.5 pl-[72px] pr-4 hover:bg-surface-secondary/40 transition-colors">
              <Layers className="h-3.5 w-3.5 text-text-muted shrink-0" />
              <span className="flex-1 text-sm text-text-secondary">{sub.name}</span>
              <button
                onClick={() => onDeleteSub(sub.id, sub.name)}
                className="rounded-md p-1.5 text-text-muted hover:bg-danger-50 hover:text-danger-600 transition-colors"
                aria-label={`${sub.name} ni o'chirish`}
                style={{ minHeight: 'auto', minWidth: 'auto' }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */

export function CategoriesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data, isLoading } = useCategories();
  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();
  const deleteMut = useDeleteCategory();
  const reorderMut = useReorderCategories();
  const createSubMut = useCreateSubCategory();
  const deleteSubMut = useDeleteSubCategory();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subCategoryName, setSubCategoryName] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: 'category' | 'sub' } | null>(null);

  const categories = (data?.data ?? []) as CategoryItem[];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      toast('Kategoriya nomini kiriting', 'error');
      return;
    }
    try {
      if (editingId) {
        await updateMut.mutateAsync({ id: editingId, data: { name: name.trim() } });
        toast('Kategoriya yangilandi', 'success');
      } else {
        await createMut.mutateAsync({ name: name.trim() });
        toast('Kategoriya yaratildi', 'success');
      }
      setModalOpen(false); setName(''); setEditingId(null);
    } catch {
      toast('Xatolik yuz berdi', 'error');
    }
  }, [name, editingId, createMut, updateMut, toast]);

  const handleAddSub = useCallback(async () => {
    if (!subCategoryName.trim()) {
      toast('Sub-kategoriya nomini kiriting', 'error');
      return;
    }
    try {
      await createSubMut.mutateAsync({ name: subCategoryName.trim(), categoryId: parentCategoryId });
      toast('Sub-kategoriya yaratildi', 'success');
      setSubModalOpen(false); setSubCategoryName('');
    } catch {
      toast('Xatolik yuz berdi', 'error');
    }
  }, [subCategoryName, parentCategoryId, createSubMut, toast]);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'category') {
        await deleteMut.mutateAsync(deleteTarget.id);
      } else {
        await deleteSubMut.mutateAsync(deleteTarget.id);
      }
      toast(`"${deleteTarget.name}" o'chirildi`, 'success');
    } catch {
      toast("O'chirish xatosi", 'error');
    }
    setDeleteTarget(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex);
    reorderMut.mutate(reordered.map((c, i) => ({ id: c.id, order: i })));
  }

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{t('nav.categories')}</h1>
          <p className="text-sm text-text-muted mt-0.5">{categories.length} ta kategoriya</p>
        </div>
        <button onClick={() => { setEditingId(null); setName(''); setModalOpen(true); }} className="btn btn-primary btn-md">
          <Plus className="h-4 w-4" /> {t('common.create')}
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-14 w-full rounded-xl" />)}</div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <FolderTree className="mb-4 h-16 w-16 opacity-30" />
          <p className="text-base font-medium">Kategoriyalar yo'q</p>
          <p className="mt-1 text-sm">Yangi kategoriya yarating</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {categories.map((cat) => (
                <SortableCategoryRow
                  key={cat.id}
                  cat={cat}
                  expanded={expandedIds.has(cat.id)}
                  onToggle={() => toggleExpand(cat.id)}
                  onEdit={() => { setEditingId(cat.id); setName(cat.name); setModalOpen(true); }}
                  onDelete={() => {
                    if (cat._count.products > 0) {
                      toast("Kategoriyada mahsulotlar bor — avval o'chiring", 'error');
                      return;
                    }
                    setDeleteTarget({ id: cat.id, name: cat.name, type: 'category' });
                  }}
                  onAddSub={() => { setParentCategoryId(cat.id); setSubCategoryName(''); setSubModalOpen(true); }}
                  onDeleteSub={(id, subName) => setDeleteTarget({ id, name: subName, type: 'sub' })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Create/Edit Category Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Kategoriya tahrirlash' : 'Yangi kategoriya'} size="sm">
        <div className="space-y-5">
          <Input
            id="cat-name"
            label="Kategoriya nomi"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder="Masalan: Dastgirlar"
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setModalOpen(false)} className="btn btn-secondary btn-md" disabled={createMut.isPending || updateMut.isPending}>
              {t('common.cancel')}
            </button>
            <button onClick={handleSave} className="btn btn-primary btn-md" disabled={!name.trim() || createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {t('common.save')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Sub-Category Modal */}
      <Modal open={subModalOpen} onClose={() => setSubModalOpen(false)} title="Yangi sub-kategoriya" size="sm">
        <div className="space-y-5">
          <Input
            id="sub-name"
            label="Sub-kategoriya nomi"
            value={subCategoryName}
            onChange={(e) => setSubCategoryName(e.target.value)}
            autoFocus
            placeholder="Masalan: Kichik dastgirlar"
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setSubModalOpen(false)} className="btn btn-secondary btn-md" disabled={createSubMut.isPending}>
              {t('common.cancel')}
            </button>
            <button onClick={handleAddSub} className="btn btn-primary btn-md" disabled={!subCategoryName.trim() || createSubMut.isPending}>
              {createSubMut.isPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {t('common.create')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.type === 'category' ? "Kategoriyani o'chirish" : "Sub-kategoriyani o'chirish"}
        description={`"${deleteTarget?.name}" ni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.`}
        confirmText="O'chirish"
        variant="danger"
        loading={deleteMut.isPending || deleteSubMut.isPending}
      />
    </div>
  );
}
