import { useState, useCallback } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { ArrowLeft, Phone, Building2, ArrowDownToLine, Pencil, Package, Banknote, Truck, Warehouse } from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@sardorbek/shared';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useSupplier, useUpdateSupplier, useSupplierPayment } from '@/hooks/useSuppliers';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import type { SupplierTransactionItem } from '@/types/api';

export function SupplierDetailPage() {
  const { supplierId } = useParams({ from: '/_auth/suppliers_/$supplierId' });
  const { toast } = useToast();

  const { data, isLoading } = useSupplier(supplierId);
  const updateMut = useUpdateSupplier();
  const payMut = useSupplierPayment();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supplier = (data as any)?.data as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transactions: SupplierTransactionItem[] = supplier?.transactions ?? [];

  // Modals
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  // Edit form
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCompany, setEditCompany] = useState('');

  // Payment form
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');

  function openEdit() {
    if (!supplier) return;
    setEditName(supplier.name);
    setEditPhone(supplier.phone || '');
    setEditCompany(supplier.company || '');
    setEditOpen(true);
  }

  const handleUpdate = useCallback(async () => {
    if (!editName.trim()) return;
    try {
      await updateMut.mutateAsync({ id: supplierId, name: editName.trim(), phone: editPhone || undefined, company: editCompany || undefined });
      toast('Yangilandi', 'success');
      setEditOpen(false);
    } catch { toast('Yangilash xatosi', 'error'); }
  }, [supplierId, editName, editPhone, editCompany, updateMut, toast]);

  const handlePayment = useCallback(async () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) { toast("Summa 0 dan katta bo'lishi kerak", 'error'); return; }
    try {
      await payMut.mutateAsync({ supplierId, amount, note: payNote || undefined });
      toast("To'lov muvaffaqiyatli", 'success');
      setPayOpen(false); setPayAmount(''); setPayNote('');
    } catch { toast("To'lov xatosi", 'error'); }
  }, [supplierId, payAmount, payNote, payMut, toast]);

  // Stats
  const balance = Number(supplier?.balance) || 0;
  const importTxns = transactions.filter((t) => t.type === 'IMPORT');
  const paymentTxns = transactions.filter((t) => t.type === 'PAYMENT');
  const totalImports = importTxns.reduce((s, t) => s + (Number(t.total) || 0), 0);
  const totalPayments = paymentTxns.reduce((s, t) => s + (Number(t.total) || 0), 0);

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      {/* Back + Header */}
      <div className="mb-5">
        <Link to="/suppliers" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" />
          Ta'minotchilar
        </Link>

        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : supplier ? (
          <div className="flex items-start gap-3 sm:gap-4">
            <div className={cn(
              'flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full text-base sm:text-lg font-bold',
              balance > 0 ? 'bg-danger-100 text-danger-700' : 'bg-primary-100 text-primary-700',
            )}>
              {supplier.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-text-primary truncate">{supplier.name}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs sm:text-sm text-text-muted">
                {supplier.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    {supplier.phone}
                  </span>
                )}
                {supplier.company && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    {supplier.company}
                  </span>
                )}
                <span className="text-text-muted/60">Qo'shilgan: {formatDate(supplier.createdAt)}</span>
              </div>
            </div>
            {/* Action buttons */}
            <div className="flex flex-wrap gap-1.5 shrink-0">
              <button onClick={openEdit} className="btn btn-secondary btn-sm">
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tahrirlash</span>
              </button>
              <button onClick={() => setPayOpen(true)} className="btn btn-sm bg-success-600 text-white hover:bg-success-700">
                <Banknote className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">To'lov</span>
              </button>
              <Link to="/suppliers/$supplierId/import" params={{ supplierId }} className="btn btn-primary btn-sm">
                <ArrowDownToLine className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Kirim</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Truck className="h-8 w-8 text-text-muted" />
            <h1 className="text-xl font-bold text-text-primary">Ta'minotchi topilmadi</h1>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {!isLoading && supplier && (
        <div className="mb-5 grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
          <div className="stat-card">
            <p className="stat-label text-[10px] sm:text-xs">Qarz</p>
            <p className={cn('stat-value text-sm sm:text-lg tabular-nums', balance > 0 ? 'text-danger-600' : 'text-success-600')}>
              {balance > 0 ? formatCurrency(balance) : '0'}
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label text-[10px] sm:text-xs">Jami kirimlar</p>
            <p className="stat-value text-sm sm:text-lg tabular-nums">{formatCurrency(totalImports)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label text-[10px] sm:text-xs">Jami to'lovlar</p>
            <p className="stat-value text-sm sm:text-lg text-success-600 tabular-nums">{formatCurrency(totalPayments)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label text-[10px] sm:text-xs">Operatsiyalar</p>
            <p className="stat-value text-sm sm:text-lg">{transactions.length}</p>
          </div>
        </div>
      )}

      {/* Transactions History */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Package className="mb-4 h-16 w-16 opacity-20" />
          <p className="text-sm font-medium">Hali operatsiya mavjud emas</p>
          <p className="text-xs mt-1">Kirim yoki to'lov qilish orqali tarix yarating</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Operatsiyalar tarixi</h2>
          {transactions.map((txn) => (
            <TransactionCard key={txn.id} txn={txn} />
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Tahrirlash" size="sm">
        <div className="space-y-4">
          <Input id="ed-name" label="Nomi *" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
          <Input id="ed-phone" label="Telefon" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
          <Input id="ed-company" label="Kompaniya" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={updateMut.isPending}>Bekor qilish</Button>
            <Button onClick={handleUpdate} loading={updateMut.isPending} disabled={!editName.trim()}>Saqlash</Button>
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="To'lov" size="sm">
        <div className="space-y-4">
          {balance > 0 && (
            <p className="text-sm text-text-muted">Qarz: <strong className="text-danger-600">{formatCurrency(balance)}</strong></p>
          )}
          <Input id="sp-amount" label="To'lov summasi" type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} autoFocus required />
          <Input id="sp-note" label="Izoh (ixtiyoriy)" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPayOpen(false)} disabled={payMut.isPending}>Bekor qilish</Button>
            <Button onClick={handlePayment} loading={payMut.isPending} disabled={!payAmount}>To'lash</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

/* ─── Transaction Card ─── */
function TransactionCard({ txn }: { txn: SupplierTransactionItem }) {
  const [expanded, setExpanded] = useState(false);
  const isImport = txn.type === 'IMPORT';
  const total = Number(txn.total) || 0;
  const isUSD = txn.currency === 'USD';

  return (
    <div className="card p-3 sm:p-4 stagger-item">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className={cn(
            'flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg',
            isImport ? 'bg-info-50 text-info-600' : 'bg-success-50 text-success-600',
          )}>
            {isImport ? <ArrowDownToLine className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-text-primary">
              {isImport ? 'Kirim' : "To'lov"}
            </p>
            <p className="text-[10px] sm:text-[11px] text-text-muted">
              {formatDateTime(txn.createdAt)}
              {isImport && isUSD && <span className="ml-1.5 text-info-600">USD (kurs: {formatCurrency(Number(txn.rate), '')})</span>}
            </p>
            {isImport && txn.warehouse && (
              <p className="flex items-center gap-1 text-[10px] text-primary-600 mt-0.5">
                <Warehouse className="h-2.5 w-2.5" />
                {txn.warehouse.name}
              </p>
            )}
          </div>
        </div>
        <p className={cn(
          'text-sm sm:text-base font-bold tabular-nums shrink-0',
          isImport ? 'text-danger-600' : 'text-success-600',
        )}>
          {isImport ? '+' : '-'}{formatCurrency(total)}
        </p>
      </div>

      {txn.note && (
        <p className="mt-1.5 text-[11px] text-text-muted italic">"{txn.note}"</p>
      )}

      {/* Import items */}
      {isImport && txn.items && txn.items.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] sm:text-xs text-primary-600 hover:text-primary-700 font-medium"
            style={{ minHeight: 'auto', minWidth: 'auto' }}
          >
            {expanded ? 'Yashirish' : `${txn.items.length} ta mahsulot ko'rish`}
          </button>
          {expanded && (
            <div className="mt-2 rounded-lg border border-border/50 overflow-hidden">
              <table className="w-full text-[11px] sm:text-xs">
                <thead>
                  <tr className="bg-surface-secondary text-text-muted">
                    <th className="px-2 py-1.5 text-left font-medium">Mahsulot</th>
                    <th className="px-2 py-1.5 text-right font-medium">Miqdor</th>
                    <th className="px-2 py-1.5 text-right font-medium">Narx</th>
                    <th className="px-2 py-1.5 text-right font-medium">Jami</th>
                  </tr>
                </thead>
                <tbody>
                  {txn.items.map((item) => (
                    <tr key={item.id} className="border-t border-border/30">
                      <td className="px-2 py-1.5 text-text-primary truncate max-w-[150px]">{item.product.name}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{item.quantity}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(Number(item.unitPrice))}</td>
                      <td className="px-2 py-1.5 text-right font-medium tabular-nums">{formatCurrency(Number(item.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
