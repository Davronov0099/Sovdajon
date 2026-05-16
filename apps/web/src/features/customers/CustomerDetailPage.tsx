import { useState } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { ArrowLeft, Phone, MapPin, Pencil, ShoppingBag, DollarSign, Clock, AlertTriangle, CheckCircle, X, Calendar, Tag } from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@sardorbek/shared';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomer, useUpdateCustomer } from '@/hooks/useCustomers';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';

const PM_LABELS: Record<string, string> = { CASH: 'Naqd', CARD: 'Karta', CLICK: 'Click', TRANSFER: "O'tkazma", DEBT: 'Qarzga', MIXED: 'Aralash', SPLIT: 'Aralash' };
function pmLabel(m: string) { return PM_LABELS[m] || m; }

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  ACTIVE: { label: 'Faol', color: 'bg-info-50 text-info-700', icon: Clock },
  PARTIAL: { label: 'Qisman', color: 'bg-warning-50 text-warning-700', icon: DollarSign },
  PAID: { label: "To'langan", color: 'bg-success-50 text-success-700', icon: CheckCircle },
  OVERDUE: { label: "Muddati o'tgan", color: 'bg-danger-50 text-danger-700', icon: AlertTriangle },
};

export function CustomerDetailPage() {
  const { customerId } = useParams({ from: '/_auth/customers_/$customerId' });
  const { toast } = useToast();

  const { data, isLoading } = useCustomer(customerId);
  const updateMut = useUpdateCustomer();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customer = (data as any)?.data as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const debts: any[] = customer?.debts ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const receipts: any[] = customer?.receipts ?? [];

  const [editOpen, setEditOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [receiptDetail, setReceiptDetail] = useState<any>(null);
  const [tab, setTab] = useState<'debts' | 'receipts'>('debts');

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const [editNote, setEditNote] = useState('');
  const [editStartDate, setEditStartDate] = useState('');

  function openEdit() {
    if (!customer) return;
    setEditName(customer.name); setEditPhone(customer.phone);
    setEditAddress(customer.address || '');
    setEditNote(customer.note || '');
    setEditStartDate(customer.startDate ? customer.startDate.slice(0, 10) : '');
    setEditOpen(true);
  }

  async function handleUpdate() {
    if (!editName.trim()) return;
    try {
      await updateMut.mutateAsync({ id: customerId, name: editName.trim(), phone: editPhone, address: editAddress || undefined, note: editNote || undefined, startDate: editStartDate || undefined });
      toast('Yangilandi', 'success');
      setEditOpen(false);
    } catch { toast('Xatolik', 'error'); }
  }

  const totalDebt = debts.filter((d: any) => d.status !== 'PAID').reduce((s: number, d: any) => s + (Number(d.remainingAmount) || 0), 0);
  const totalPurchase = receipts.reduce((s: number, r: any) => s + (Number(r.total) || 0), 0);
  const activeDebts = debts.filter((d: any) => d.status !== 'PAID');
  const paidDebts = debts.filter((d: any) => d.status === 'PAID');

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      {/* Back */}
      <Link to="/customers" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors mb-4">
        <ArrowLeft className="h-4 w-4" />Mijozlar
      </Link>

      {/* Header */}
      {isLoading ? <Skeleton className="h-20 w-full mb-5" /> : customer ? (
        <div className="flex items-start gap-3 mb-5">
          <div className={cn('flex h-11 w-11 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full text-sm sm:text-lg font-bold', totalDebt > 0 ? 'bg-danger-100 text-danger-700' : 'bg-primary-100 text-primary-700')}>
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-2xl font-bold text-text-primary truncate">{customer.name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] sm:text-sm text-text-muted">
              <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{customer.phone}</span>
              {customer.address && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{customer.address}</span>}
              {customer.category && <span className="inline-flex items-center gap-1 text-primary-600 font-medium"><Tag className="h-3 w-3" />{customer.category.name}</span>}
            </div>
            {/* Info badges */}
            <div className="flex flex-wrap gap-2 mt-2">
              {customer.startDate && (() => {
                const start = new Date(customer.startDate);
                const now = new Date();
                const diffMs = now.getTime() - start.getTime();
                const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
                let duration: string;
                if (totalDays < 1) duration = 'Bugun';
                else if (totalDays < 30) duration = `${totalDays} kun`;
                else if (months < 12) duration = `${months} oy ${totalDays % 30 > 0 ? (totalDays % 30) + ' kun' : ''}`;
                else { const y = Math.floor(months / 12); const m = months % 12; duration = m > 0 ? `${y} yil ${m} oy` : `${y} yil`; }
                return (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-info-50 px-2 py-1 text-[11px] font-medium text-info-700">
                    <Clock className="h-3 w-3" />{duration}
                  </span>
                );
              })()}
              <span className="inline-flex items-center gap-1 rounded-lg bg-surface-tertiary px-2 py-1 text-[11px] font-medium text-text-secondary">
                <Calendar className="h-3 w-3" />Qo'shilgan: {formatDate(customer.startDate || customer.createdAt)}
              </span>

              {customer.loyaltyPoints > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-success-50 px-2 py-1 text-[11px] font-medium text-success-700">
                  Ball: {customer.loyaltyPoints}
                </span>
              )}
            </div>
            {customer.note && <p className="text-[11px] text-text-muted mt-1.5 italic">"{customer.note}"</p>}
          </div>
          <button onClick={openEdit} className="btn btn-secondary btn-sm shrink-0">
            <Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">Tahrirlash</span>
          </button>
        </div>
      ) : <h1 className="text-xl font-bold text-text-primary mb-5">Mijoz topilmadi</h1>}

      {/* Stats */}
      {!isLoading && customer && (
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <div className="stat-card">
            <p className="stat-label text-[10px] sm:text-xs">Qarz</p>
            <p className={cn('stat-value text-sm sm:text-lg tabular-nums', totalDebt > 0 ? 'text-danger-600' : 'text-success-600')}>{totalDebt > 0 ? formatCurrency(totalDebt) : '0'}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label text-[10px] sm:text-xs">Jami xarid</p>
            <p className="stat-value text-sm sm:text-lg tabular-nums">{formatCurrency(totalPurchase)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label text-[10px] sm:text-xs">Cheklar</p>
            <p className="stat-value text-sm sm:text-lg">{receipts.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label text-[10px] sm:text-xs">Qarzlar</p>
            <p className="stat-value text-sm sm:text-lg">{debts.length}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      {!isLoading && customer && (
        <div className="flex mb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <button onClick={() => setTab('debts')} className={cn('flex-1 sm:flex-none px-4 py-2 text-sm font-medium transition-colors', tab === 'debts' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-text-muted')}>
            Qarzlar ({debts.length})
          </button>
          <button onClick={() => setTab('receipts')} className={cn('flex-1 sm:flex-none px-4 py-2 text-sm font-medium transition-colors', tab === 'receipts' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-text-muted')}>
            Xaridlar ({receipts.length})
          </button>
        </div>
      )}

      {/* Debts tab */}
      {tab === 'debts' && !isLoading && (
        <>
          {activeDebts.length > 0 && (
            <div className="mb-4">
              <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Faol qarzlar</h3>
              <div className="space-y-2">
                {activeDebts.map((d: any) => {
                  const st = STATUS_MAP[d.status as string] ?? STATUS_MAP.ACTIVE;
                  const Icon = st!.icon;
                  const amount = Number(d.amount) || 0;
                  const remaining = Number(d.remainingAmount) || 0;
                  const paid = amount - remaining;
                  const pct = amount > 0 ? Math.round((paid / amount) * 100) : 0;
                  return (
                    <div key={d.id} className={cn('card p-3', d.status === 'OVERDUE' && 'border-l-[3px] border-l-danger-500')}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className={cn('inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium', st!.color)}>
                            <Icon className="h-2.5 w-2.5" />{st!.label}
                          </span>
                          <p className="mt-1 text-[11px] text-text-muted">
                            Muddat: <span className={cn('font-medium', d.status === 'OVERDUE' ? 'text-danger-600' : 'text-text-secondary')}>{formatDate(d.dueDate)}</span>
                            <span className="mx-1">·</span>{formatDate(d.createdAt)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-text-primary tabular-nums">{formatCurrency(remaining)}</p>
                          {paid > 0 && <p className="text-[10px] text-text-muted tabular-nums">/{formatCurrency(amount)}</p>}
                        </div>
                      </div>
                      {paid > 0 && (
                        <div className="mt-2">
                          <div className="h-1.5 rounded-full bg-surface-tertiary overflow-hidden">
                            <div className="h-full rounded-full bg-success-500" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-text-muted mt-0.5 text-right">{pct}% to'langan</p>
                        </div>
                      )}
                      <div className="mt-2 text-right">
                        <Link to="/debts/$customerId" params={{ customerId }} className="text-[11px] font-medium text-primary-600 hover:text-primary-700">
                          Qarzlar bo'limiga o'tish →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {paidDebts.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">To'langan</h3>
              <div className="space-y-1.5">
                {paidDebts.map((d: any) => (
                  <div key={d.id} className="card p-3 flex items-center justify-between opacity-50">
                    <div>
                      <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium bg-success-50 text-success-700">
                        <CheckCircle className="h-2.5 w-2.5" />To'langan
                      </span>
                      <p className="text-[11px] text-text-muted mt-0.5">{formatDate(d.createdAt)}</p>
                    </div>
                    <p className="text-sm font-bold text-text-muted tabular-nums line-through">{formatCurrency(Number(d.amount))}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {debts.length === 0 && (
            <div className="flex flex-col items-center py-12 text-text-muted">
              <DollarSign className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-xs">Qarz mavjud emas</p>
            </div>
          )}
        </>
      )}

      {/* Receipts tab */}
      {tab === 'receipts' && !isLoading && (
        <>
          {receipts.length > 0 ? (
            <div className="space-y-1.5">
              {receipts.map((r: any) => (
                <button key={r.id} onClick={() => setReceiptDetail(r)} className="card p-3 flex items-center justify-between w-full text-left hover:shadow-card-hover transition-shadow">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-text-primary">Chek #{r.number}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">{formatDateTime(r.createdAt)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-text-primary tabular-nums">{formatCurrency(Number(r.total))}</p>
                    <p className="text-[10px] text-text-muted">{pmLabel(r.paymentMethod)}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 text-text-muted">
              <ShoppingBag className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-xs">Xarid mavjud emas</p>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Mijozni tahrirlash" size="sm">
        <div className="space-y-4">
          <Input id="ed-name" label="Ism *" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
          <Input id="ed-phone" label="Telefon" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
          <Input id="ed-address" label="Manzil" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
          <Input id="ed-start" label="Ishlash boshlanish sanasi" type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
          <Input id="ed-note" label="Izoh" value={editNote} onChange={(e) => setEditNote(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={updateMut.isPending}>Bekor qilish</Button>
            <Button onClick={handleUpdate} loading={updateMut.isPending} disabled={!editName.trim()}>Saqlash</Button>
          </div>
        </div>
      </Modal>

      {/* Receipt Detail Modal */}
      {receiptDetail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center" onClick={() => setReceiptDetail(null)} data-no-swipe>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div className="compact-inputs relative z-10 w-full sm:max-w-md bg-surface sm:rounded-2xl rounded-t-2xl shadow-modal animate-scale-in"
            style={{ maxHeight: 'calc(100dvh - 2rem)' }} onClick={(e) => e.stopPropagation()}>

            {/* Receipt header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
              <div>
                <h2 className="text-base font-bold text-text-primary">Chek #{receiptDetail.number}</h2>
                <p className="text-[11px] text-text-muted">{formatDateTime(receiptDetail.createdAt)}</p>
              </div>
              <button onClick={() => setReceiptDetail(null)} className="rounded-xl p-2 hover:bg-surface-secondary transition-colors">
                <X className="h-5 w-5 text-text-muted" />
              </button>
            </div>

            <div className="overflow-y-auto p-4" style={{ maxHeight: '60vh' }}>
              {/* Items table */}
              {receiptDetail.items?.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden mb-4">
                  <table className="w-full text-[12px] sm:text-[13px]">
                    <thead>
                      <tr className="bg-surface-secondary text-[10px] font-semibold text-text-muted uppercase">
                        <th className="px-3 py-2 text-left">Mahsulot</th>
                        <th className="px-2 py-2 text-center w-14">Soni</th>
                        <th className="px-2 py-2 text-right w-20">Narx</th>
                        <th className="px-3 py-2 text-right w-24">Jami</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiptDetail.items.map((item: any, idx: number) => (
                        <tr key={item.id || idx} className="border-t border-border/30">
                          <td className="px-3 py-2 text-text-primary font-medium">{item.productName}</td>
                          <td className="px-2 py-2 text-center tabular-nums text-text-secondary">{item.quantity}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-text-secondary">{formatCurrency(Number(item.unitPrice))}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold text-text-primary">{formatCurrency(Number(item.total))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Summary */}
              <div className="space-y-1.5 text-[13px]">
                <div className="flex justify-between pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <span className="font-semibold text-text-primary">Jami</span>
                  <span className="font-bold text-text-primary text-base tabular-nums">{formatCurrency(Number(receiptDetail.total))}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-text-muted">To'lov usuli</span>
                  <span className="font-medium text-text-secondary">
                    {pmLabel(receiptDetail.paymentMethod)}
                  </span>
                </div>
                {receiptDetail.cashReceived && Number(receiptDetail.cashReceived) > 0 && (
                  <>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-text-muted">Berilgan</span>
                      <span className="tabular-nums text-text-secondary">{formatCurrency(Number(receiptDetail.cashReceived))}</span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-text-muted">Qaytim</span>
                      <span className="tabular-nums text-success-600">{formatCurrency(Number(receiptDetail.change || 0))}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
