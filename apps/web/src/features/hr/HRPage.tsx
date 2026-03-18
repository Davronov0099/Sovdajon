import { useState, useCallback } from 'react';
import {
  Clock, DollarSign, Target, Banknote, Users,
  CheckCircle, XCircle, MapPin, Plus, Pencil, Trash2,
  Shield, ShieldCheck, ShieldAlert, Phone, Key, UserX, UserCheck,
  MoreVertical,
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@sardorbek/shared';
import { useToast } from '@/components/ui/toast';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTodayAttendance } from '@/hooks/useAttendance';
import { useSalaries, useCalculateAll, usePaySalary, useUpsertSalarySetting } from '@/hooks/useSalary';
import { useAdvances, useApproveAdvance, useRejectAdvance, useCreateAdvance } from '@/hooks/useAdvance';
import { useKpiTemplates, useCreateKpiTemplate, useDeleteKpiTemplate } from '@/hooks/useKpi';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useResetPassword, type UserItem } from '@/hooks/useUsers';
import { cn } from '@/lib/cn';

type TabKey = 'employees' | 'attendance' | 'salary' | 'kpi' | 'advance';

const TABS: { key: TabKey; label: string; shortLabel: string; icon: typeof Clock }[] = [
  { key: 'employees', label: 'Xodimlar', shortLabel: 'Xodim', icon: Users },
  { key: 'attendance', label: 'Davomat', shortLabel: 'Davomat', icon: Clock },
  { key: 'salary', label: 'Oylik', shortLabel: 'Oylik', icon: DollarSign },
  { key: 'kpi', label: 'KPI', shortLabel: 'KPI', icon: Target },
  { key: 'advance', label: 'Avans', shortLabel: 'Avans', icon: Banknote },
];

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Shield; color: string; bg: string }> = {
  ADMIN: { label: 'Admin', icon: ShieldCheck, color: 'text-danger-600', bg: 'bg-danger-50' },
  CASHIER: { label: 'Kassir', icon: Shield, color: 'text-primary-600', bg: 'bg-primary-50' },
  HELPER: { label: 'Yordamchi', icon: ShieldAlert, color: 'text-warning-600', bg: 'bg-warning-50' },
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PRESENT: { label: 'Keldi', cls: 'bg-success-50 text-success-700' },
  LATE: { label: 'Kechikdi', cls: 'bg-warning-50 text-warning-700' },
  ABSENT: { label: 'Kelmadi', cls: 'bg-danger-50 text-danger-700' },
  HALF_DAY: { label: 'Yarim kun', cls: 'bg-info-50 text-info-700' },
};

const SAL_STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Qoralama', cls: 'bg-surface-secondary text-text-muted' },
  CALCULATED: { label: 'Hisoblangan', cls: 'bg-info-50 text-info-700' },
  RECALCULATED: { label: 'Qayta', cls: 'bg-warning-50 text-warning-700' },
  PAID: { label: "To'langan", cls: 'bg-success-50 text-success-700' },
};

const ADV_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Kutilmoqda', cls: 'bg-warning-50 text-warning-700' },
  APPROVED: { label: 'Tasdiqlangan', cls: 'bg-success-50 text-success-700' },
  REJECTED: { label: 'Rad', cls: 'bg-danger-50 text-danger-700' },
  PAID: { label: "To'langan", cls: 'bg-info-50 text-info-700' },
};

function compactMoney(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

type Toast = ReturnType<typeof useToast>['toast'];

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */
export function HRPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>('employees');
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  return (
    <div className="p-3 sm:p-4 lg:p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-3 sm:mb-4">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-text-primary">Xodimlar boshqaruvi</h1>
        <p className="text-[11px] sm:text-xs text-text-muted mt-0.5">Davomat, oylik, KPI va avanslar</p>
      </div>

      {/* Tabs — mobile: segment control, desktop: pill buttons */}
      {/* Mobile */}
      <div className="sm:hidden mb-3 flex rounded-xl p-1 overflow-x-auto no-scrollbar" style={{ border: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-surface-secondary)' }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={cn('flex flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-[11px] font-medium transition-all whitespace-nowrap', active ? 'bg-surface text-primary-700 shadow-sm' : 'text-text-muted')} style={{ minHeight: 'auto', minWidth: 'auto' }}>
              <Icon className={cn('h-3.5 w-3.5 shrink-0', active && 'text-primary-600')} />
              {t.shortLabel}
            </button>
          );
        })}
      </div>
      {/* Desktop */}
      <div className="hidden sm:flex mb-4 gap-1 overflow-x-auto no-scrollbar">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all whitespace-nowrap shrink-0', tab === t.key ? 'bg-primary-600 text-white shadow-sm' : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary')} style={{ minHeight: 'auto', minWidth: 'auto' }}>
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'employees' && <EmployeesTab toast={toast} />}
      {tab === 'attendance' && <AttendanceTab />}
      {tab === 'salary' && <SalaryTab month={month} setMonth={setMonth} toast={toast} />}
      {tab === 'kpi' && <KpiTab toast={toast} />}
      {tab === 'advance' && <AdvanceTab toast={toast} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   EMPLOYEES TAB
   ═══════════════════════════════════════════════════ */
function EmployeesTab({ toast }: { toast: Toast }) {
  const { data, isLoading } = useUsers();
  const createMut = useCreateUser();
  const updateMut = useUpdateUser();
  const deleteMut = useDeleteUser();
  const resetPwdMut = useResetPassword();
  const salarySettingMut = useUpsertSalarySetting();

  const users: UserItem[] = data?.data ?? [];
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [pwdModal, setPwdModal] = useState<string | null>(null);
  const [salaryModal, setSalaryModal] = useState<UserItem | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const [login, setLogin] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'CASHIER' | 'HELPER'>('HELPER');
  const [phone, setPhone] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [salesPercent, setSalesPercent] = useState('');

  function openCreate() {
    setEditUser(null); setLogin(''); setName(''); setPassword('');
    setRole('HELPER'); setPhone(''); setModalOpen(true);
  }
  function openEdit(u: UserItem) {
    setEditUser(u); setLogin(u.login); setName(u.name);
    setRole(u.role); setPhone(u.phone ?? ''); setPassword('');
    setModalOpen(true); setMenuOpen(null);
  }

  const handleSave = useCallback(async () => {
    try {
      if (editUser) {
        await updateMut.mutateAsync({ id: editUser.id, name, role, phone: phone || undefined, isActive: editUser.isActive });
        toast('Xodim yangilandi', 'success');
      } else {
        if (!login || !password) { toast('Login va parol kerak', 'error'); return; }
        await createMut.mutateAsync({ login, password, name, role, phone: phone || undefined });
        toast("Xodim qo'shildi", 'success');
      }
      setModalOpen(false);
    } catch { toast('Xatolik yuz berdi', 'error'); }
  }, [editUser, login, name, password, role, phone, createMut, updateMut, toast]);

  async function handleToggleActive(u: UserItem) {
    setMenuOpen(null);
    try {
      await updateMut.mutateAsync({ id: u.id, isActive: !u.isActive });
      toast(u.isActive ? "Nofaol qilindi" : "Faollashtirildi", 'success');
    } catch { toast('Xatolik', 'error'); }
  }

  async function handleResetPwd() {
    if (!pwdModal || !newPwd) return;
    try {
      await resetPwdMut.mutateAsync({ id: pwdModal, password: newPwd });
      toast('Parol yangilandi', 'success'); setPwdModal(null); setNewPwd('');
    } catch { toast('Xatolik', 'error'); }
  }

  async function handleSalarySetting() {
    if (!salaryModal) return;
    try {
      await salarySettingMut.mutateAsync({
        userId: salaryModal.id, baseSalary: Number(baseSalary) || 0, salesPercent: Number(salesPercent) || 0,
      });
      toast('Oylik sozlamasi saqlandi', 'success'); setSalaryModal(null);
    } catch { toast('Xatolik', 'error'); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] sm:text-xs text-text-muted">{users.length} ta xodim</span>
        <button onClick={openCreate} className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 active:scale-[0.97] transition-all">
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Xodim qo'shish</span>
          <span className="sm:hidden">Qo'shish</span>
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-surface p-3" style={{ border: '1px solid var(--color-border-subtle)' }}>
            <div className="h-10 w-10 rounded-full bg-surface-secondary animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5"><div className="h-3 w-24 rounded bg-surface-secondary animate-pulse" /><div className="h-2.5 w-16 rounded bg-surface-secondary animate-pulse" /></div>
          </div>
        ))}</div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center py-14 text-text-muted">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-secondary mb-3"><Users className="h-6 w-6 opacity-40" /></div>
          <p className="text-sm font-medium text-text-primary mb-1">Xodimlar yo'q</p>
          <button onClick={openCreate} className="text-xs text-primary-600 font-medium hover:underline">+ Birinchi xodimni qo'shing</button>
        </div>
      ) : (
        <div className="space-y-1.5 sm:space-y-2">
          {users.map((u) => {
            const rc = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.HELPER!;
            const RIcon = rc.icon;
            const isMenuOpen = menuOpen === u.id;
            return (
              <div
                key={u.id}
                className={cn(
                  'relative rounded-xl bg-surface p-3 sm:p-3.5 transition-all hover:shadow-card',
                  !u.isActive && 'opacity-50',
                )}
                style={{ border: '1px solid var(--color-border-subtle)' }}
              >
                <div className="flex items-center gap-2.5">
                  {/* Avatar */}
                  <div className={cn('flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold', rc.bg, rc.color)}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] sm:text-sm font-semibold text-text-primary truncate">{u.name}</p>
                      {!u.isActive && <span className="text-[8px] px-1 py-px rounded bg-danger-50 text-danger-600 font-semibold uppercase">off</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={cn('inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-medium rounded px-1.5 py-px', rc.bg, rc.color)}>
                        <RIcon className="h-2.5 w-2.5" /> {rc.label}
                      </span>
                      <span className="text-[10px] text-text-muted">@{u.login}</span>
                      {u.phone && (
                        <span className="text-[10px] text-text-muted hidden sm:flex items-center gap-0.5">
                          <Phone className="h-2.5 w-2.5" />{u.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Desktop actions — inline */}
                  <div className="hidden sm:flex items-center gap-0.5 shrink-0">
                    <button onClick={() => { setSalaryModal(u); setBaseSalary(''); setSalesPercent(''); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-success-50 hover:text-success-600 transition-colors" style={{ minHeight: 'auto', minWidth: 'auto' }} title="Oylik sozlash">
                      <DollarSign className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { setPwdModal(u.id); setNewPwd(''); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-warning-50 hover:text-warning-600 transition-colors" style={{ minHeight: 'auto', minWidth: 'auto' }} title="Parol tiklash">
                      <Key className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleToggleActive(u)} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-tertiary transition-colors" style={{ minHeight: 'auto', minWidth: 'auto' }} title={u.isActive ? "Nofaol qilish" : "Faollashtirish"}>
                      {u.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => openEdit(u)} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-primary-50 hover:text-primary-600 transition-colors" style={{ minHeight: 'auto', minWidth: 'auto' }} title="Tahrirlash">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(u)} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-danger-50 hover:text-danger-600 transition-colors" style={{ minHeight: 'auto', minWidth: 'auto' }} title="O'chirish">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Mobile: 3-dot menu */}
                  <div className="sm:hidden relative">
                    <button
                      onClick={() => setMenuOpen(isMenuOpen ? null : u.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-secondary transition-colors"
                      style={{ minHeight: 'auto', minWidth: 'auto' }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {isMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 top-full mt-1 z-40 w-44 rounded-xl bg-surface shadow-dropdown animate-scale-in overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                          {[
                            { label: 'Oylik sozlash', icon: DollarSign, color: 'text-success-600', action: () => { setSalaryModal(u); setBaseSalary(''); setSalesPercent(''); setMenuOpen(null); } },
                            { label: 'Parol tiklash', icon: Key, color: 'text-warning-600', action: () => { setPwdModal(u.id); setNewPwd(''); setMenuOpen(null); } },
                            { label: u.isActive ? 'Nofaol qilish' : 'Faollashtirish', icon: u.isActive ? UserX : UserCheck, color: 'text-text-secondary', action: () => handleToggleActive(u) },
                            { label: 'Tahrirlash', icon: Pencil, color: 'text-primary-600', action: () => openEdit(u) },
                            { label: "O'chirish", icon: Trash2, color: 'text-danger-600', action: () => { setDeleteTarget(u); setMenuOpen(null); } },
                          ].map((item) => {
                            const Icon = item.icon;
                            return (
                              <button key={item.label} onClick={item.action} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-text-secondary hover:bg-surface-secondary transition-colors">
                                <Icon className={cn('h-4 w-4', item.color)} />
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editUser ? 'Xodimni tahrirlash' : "Yangi xodim qo'shish"} size="sm">
        <div className="space-y-4">
          {!editUser && <Input label="Login" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="kassir1" autoFocus />}
          <Input label="Ism" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sardor Aliyev" />
          {!editUser && <Input label="Parol" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kamida 4 ta belgi" />}
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-text-secondary">Roli</label>
            <div className="grid grid-cols-3 gap-2">
              {(['ADMIN', 'CASHIER', 'HELPER'] as const).map((r) => {
                const rc = ROLE_CONFIG[r]!;
                const RIcon = rc.icon;
                return (
                  <button key={r} type="button" onClick={() => setRole(r)} className={cn('flex flex-col items-center gap-1 rounded-xl py-2.5 sm:py-3 text-[10px] sm:text-[11px] font-medium transition-all', role === r ? `${rc.bg} ${rc.color} ring-2 ring-current/20` : 'bg-surface-secondary text-text-muted hover:bg-surface-tertiary')}>
                    <RIcon className="h-4 w-4" />
                    {rc.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Input label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998901234567" />
          <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Bekor</Button>
            <Button onClick={handleSave} loading={createMut.isPending || updateMut.isPending} className="flex-1">Saqlash</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!pwdModal} onClose={() => setPwdModal(null)} title="Parolni tiklash" size="sm">
        <div className="space-y-4">
          <Input label="Yangi parol" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Kamida 4 ta belgi" autoFocus />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setPwdModal(null)} className="flex-1">Bekor</Button>
            <Button onClick={handleResetPwd} loading={resetPwdMut.isPending} disabled={newPwd.length < 4} className="flex-1">Saqlash</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!salaryModal} onClose={() => setSalaryModal(null)} title={`Oylik sozlash — ${salaryModal?.name ?? ''}`} size="sm">
        <div className="space-y-4">
          <Input label="Asosiy oylik (so'm)" type="number" min={0} value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} placeholder="3 000 000" autoFocus />
          <Input label="Sotuv foizi (%)" type="number" min={0} max={100} step={0.1} value={salesPercent} onChange={(e) => setSalesPercent(e.target.value)} placeholder="5" />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setSalaryModal(null)} className="flex-1">Bekor</Button>
            <Button onClick={handleSalarySetting} loading={salarySettingMut.isPending} className="flex-1">Saqlash</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={async () => { if (deleteTarget) { await deleteMut.mutateAsync(deleteTarget.id); toast("O'chirildi", 'success'); } setDeleteTarget(null); }} title="Xodimni o'chirish" description={`"${deleteTarget?.name}" ni o'chirmoqchimisiz?`} confirmText="O'chirish" variant="danger" loading={deleteMut.isPending} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ATTENDANCE TAB
   ═══════════════════════════════════════════════════ */
function AttendanceTab() {
  const { data, isLoading } = useTodayAttendance();
  const records = (data?.data?.records ?? []) as { id: string; checkIn: string; checkOut: string | null; status: string; lat: number | null; lng: number | null; user: { name: string } }[];
  const stats = data?.data?.stats as { total: number; present: number; late: number; absent: number } | undefined;

  return (
    <div className="space-y-3">
      {stats && (
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {[
            { label: 'Jami', value: stats.total, color: 'text-text-primary', bg: 'bg-surface' },
            { label: 'Keldi', value: stats.present, color: 'text-success-600', bg: 'bg-success-50' },
            { label: 'Kechikdi', value: stats.late, color: 'text-warning-600', bg: 'bg-warning-50' },
            { label: 'Kelmadi', value: stats.absent, color: 'text-danger-600', bg: 'bg-danger-50' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-2.5 sm:p-3 text-center" style={{ border: '1px solid var(--color-border-subtle)' }}>
              <p className={cn('text-lg sm:text-xl font-bold tabular-nums', s.color)}>{s.value}</p>
              <p className="text-[9px] sm:text-[10px] text-text-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-1.5">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-surface-secondary animate-pulse" />)}</div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center py-14 text-text-muted">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-secondary mb-3"><Clock className="h-6 w-6 opacity-40" /></div>
          <p className="text-sm font-medium text-text-primary">Bugungi davomat yo'q</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {records.map((rec) => {
            const st = STATUS_BADGE[rec.status] ?? STATUS_BADGE.PRESENT!;
            return (
              <div key={rec.id} className="flex items-center gap-2.5 rounded-xl bg-surface p-2.5 sm:p-3" style={{ border: '1px solid var(--color-border-subtle)' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[11px] font-bold text-primary-700">
                  {rec.user.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-text-primary truncate">{rec.user.name}</p>
                  <p className="text-[10px] text-text-muted">
                    <span>{formatDateTime(rec.checkIn)}</span>
                    {rec.checkOut && <span> → {formatDateTime(rec.checkOut)}</span>}
                  </p>
                </div>
                <span className={cn('text-[9px] sm:text-[10px] font-medium rounded-md px-1.5 sm:px-2 py-0.5 shrink-0', st.cls)}>{st.label}</span>
                {rec.lat && rec.lng && <MapPin className="h-3.5 w-3.5 text-success-500 shrink-0 hidden sm:block" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SALARY TAB
   ═══════════════════════════════════════════════════ */
function SalaryTab({ month, setMonth, toast }: { month: string; setMonth: (m: string) => void; toast: Toast }) {
  const { data, isLoading } = useSalaries(month);
  const calculateMut = useCalculateAll();
  const payMut = usePaySalary();
  const salaries = (data?.data ?? []) as { id: string; user: { name: string }; base: string; kpiBonus: string; salesBonus: string; advances: string; fines: string; total: string; status: string }[];

  async function handleCalculate() {
    try { await calculateMut.mutateAsync(month); toast('Hisoblandi', 'success'); }
    catch { toast('Xatolik', 'error'); }
  }
  async function handlePay(id: string) {
    try { await payMut.mutateAsync(id); toast("To'landi", 'success'); }
    catch { toast('Xatolik', 'error'); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-border bg-surface px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-primary-500 focus:outline-none" />
        <button onClick={handleCalculate} disabled={calculateMut.isPending} className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-2 text-[11px] sm:text-xs font-semibold text-white hover:bg-primary-700 transition-all disabled:opacity-50 shrink-0">
          {calculateMut.isPending && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
          Hisoblash
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-surface-secondary animate-pulse" />)}</div>
      ) : salaries.length === 0 ? (
        <div className="flex flex-col items-center py-14 text-text-muted">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-secondary mb-3"><DollarSign className="h-6 w-6 opacity-40" /></div>
          <p className="text-sm font-medium text-text-primary mb-1">Oylik yo'q</p>
          <p className="text-[11px] text-text-muted">"Hisoblash" tugmasini bosing</p>
        </div>
      ) : (
        <div className="space-y-2">
          {salaries.map((s) => {
            const st = SAL_STATUS[s.status] ?? SAL_STATUS.DRAFT!;
            const total = Number(s.total);
            return (
              <div key={s.id} className="rounded-xl bg-surface overflow-hidden" style={{ border: '1px solid var(--color-border-subtle)' }}>
                {/* Header row */}
                <div className="flex items-center justify-between p-3 sm:px-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[11px] font-bold text-primary-700">{s.user.name.charAt(0)}</div>
                    <p className="text-[13px] sm:text-sm font-semibold text-text-primary truncate">{s.user.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-[13px] sm:text-base font-bold text-text-primary tabular-nums">
                      <span className="sm:hidden">{compactMoney(total)}</span>
                      <span className="hidden sm:inline">{formatCurrency(total)}</span>
                    </p>
                    <span className={cn('text-[9px] sm:text-[10px] font-medium rounded-md px-1.5 sm:px-2 py-0.5', st.cls)}>{st.label}</span>
                    {s.status === 'CALCULATED' && (
                      <button onClick={() => handlePay(s.id)} disabled={payMut.isPending} className="rounded-lg bg-success-600 px-2 py-1 text-[10px] sm:text-[11px] font-semibold text-white hover:bg-success-700 transition-colors disabled:opacity-50">
                        To'lash
                      </button>
                    )}
                  </div>
                </div>
                {/* Breakdown — mobile: compact flex, desktop: grid */}
                <div className="sm:hidden flex divide-x divide-border-subtle bg-surface-secondary/50 text-center" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                  {[
                    { label: 'Asosiy', val: Number(s.base), cls: '' },
                    { label: 'KPI', val: Number(s.kpiBonus), cls: 'text-success-600' },
                    { label: 'Sotuv', val: Number(s.salesBonus), cls: 'text-info-600' },
                    { label: 'Avans', val: Number(s.advances), cls: 'text-warning-600' },
                    { label: 'Jarima', val: Number(s.fines), cls: 'text-danger-600' },
                  ].map((item) => (
                    <div key={item.label} className="flex-1 py-1.5 px-1">
                      <p className="text-[8px] text-text-muted uppercase tracking-wider">{item.label}</p>
                      <p className={cn('text-[10px] tabular-nums font-semibold mt-0.5', item.cls)}>{compactMoney(item.val)}</p>
                    </div>
                  ))}
                </div>
                {/* Desktop breakdown grid */}
                <div className="hidden sm:grid grid-cols-6 gap-1.5 text-center mt-2">
                  {[
                    { label: 'Asosiy', val: Number(s.base), cls: '' },
                    { label: 'KPI', val: Number(s.kpiBonus), cls: 'text-success-600' },
                    { label: 'Sotuv', val: Number(s.salesBonus), cls: 'text-info-600' },
                    { label: 'Avans', val: -Number(s.advances), cls: 'text-warning-600' },
                    { label: 'Jarima', val: -Number(s.fines), cls: 'text-danger-600' },
                    { label: 'Jami', val: Number(s.total), cls: 'font-bold' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-surface-secondary px-2 py-1.5">
                      <p className="text-[9px] text-text-muted">{item.label}</p>
                      <p className={cn('text-xs tabular-nums font-semibold', item.cls)}>{formatCurrency(Math.abs(item.val))}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   KPI TAB
   ═══════════════════════════════════════════════════ */
function KpiTab({ toast }: { toast: Toast }) {
  const { data, isLoading } = useKpiTemplates();
  const createMut = useCreateKpiTemplate();
  const deleteMut = useDeleteKpiTemplate();
  const templates = (data?.data ?? []) as { id: string; name: string; description: string | null; targetValue: string; unit: string; bonusAmount: string }[];
  const [modalOpen, setModalOpen] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplDesc, setTplDesc] = useState('');
  const [tplTarget, setTplTarget] = useState('');
  const [tplUnit, setTplUnit] = useState('count');
  const [tplBonus, setTplBonus] = useState('');

  async function handleCreate() {
    try {
      await createMut.mutateAsync({
        name: tplName, description: tplDesc || undefined,
        targetValue: Number(tplTarget), unit: tplUnit as 'count' | 'sum' | 'percent',
        bonusAmount: Number(tplBonus),
      });
      toast("Shablon qo'shildi", 'success'); setModalOpen(false);
    } catch { toast('Xatolik', 'error'); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] sm:text-xs text-text-muted">{templates.length} ta shablon</span>
        <button onClick={() => { setTplName(''); setTplDesc(''); setTplTarget(''); setTplUnit('count'); setTplBonus(''); setModalOpen(true); }} className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 active:scale-[0.97] transition-all">
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Shablon qo'shish</span>
          <span className="sm:hidden">Qo'shish</span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-surface-secondary animate-pulse" />)}</div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center py-14 text-text-muted">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-secondary mb-3"><Target className="h-6 w-6 opacity-40" /></div>
          <p className="text-sm font-medium text-text-primary mb-1">KPI shablonlari yo'q</p>
          <button onClick={() => setModalOpen(true)} className="text-xs text-primary-600 font-medium hover:underline">+ Birinchi shablonni yarating</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2">
          {templates.map((tpl) => (
            <div key={tpl.id} className="rounded-xl bg-surface p-3 sm:p-4 group" style={{ border: '1px solid var(--color-border-subtle)' }}>
              <div className="flex items-start justify-between mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50"><Target className="h-4 w-4 text-primary-600" /></div>
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-semibold text-text-primary truncate">{tpl.name}</h3>
                    {tpl.description && <p className="text-[10px] text-text-muted line-clamp-1">{tpl.description}</p>}
                  </div>
                </div>
                <button onClick={() => { if (confirm(`"${tpl.name}" ni o'chirish?`)) deleteMut.mutate(tpl.id); }} className="sm:opacity-0 sm:group-hover:opacity-100 flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-danger-50 hover:text-danger-600 transition-all shrink-0" style={{ minHeight: 'auto', minWidth: 'auto' }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                <span className="text-text-muted">Target: <span className="font-semibold text-text-secondary tabular-nums">{tpl.targetValue} {tpl.unit}</span></span>
                <span className="font-semibold text-success-600 tabular-nums">{formatCurrency(Number(tpl.bonusAmount))}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Yangi KPI shablon" size="sm">
        <div className="space-y-4">
          <Input label="Nomi" value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="Kunlik savdo" autoFocus />
          <Input label="Izoh" value={tplDesc} onChange={(e) => setTplDesc(e.target.value)} placeholder="Ixtiyoriy" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Maqsad qiymati" type="number" value={tplTarget} onChange={(e) => setTplTarget(e.target.value)} placeholder="100" />
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-text-secondary">Birlik</label>
              <select value={tplUnit} onChange={(e) => setTplUnit(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">
                <option value="count">Dona</option><option value="sum">So'm</option><option value="percent">Foiz</option>
              </select>
            </div>
          </div>
          <Input label="Bonus (so'm)" type="number" value={tplBonus} onChange={(e) => setTplBonus(e.target.value)} placeholder="500 000" />
          <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Bekor</Button>
            <Button onClick={handleCreate} loading={createMut.isPending} disabled={!tplName || !tplTarget || !tplBonus} className="flex-1">Saqlash</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ADVANCE TAB
   ═══════════════════════════════════════════════════ */
function AdvanceTab({ toast }: { toast: Toast }) {
  const { data, isLoading } = useAdvances();
  const approveMut = useApproveAdvance();
  const rejectMut = useRejectAdvance();
  const createMut = useCreateAdvance();
  const { data: usersData } = useUsers();
  const users: UserItem[] = usersData?.data ?? [];
  const advances = ((data as { data?: { id: string; amount: string; reason: string | null; status: string; createdAt: string; user: { id: string; name: string } }[] })?.data ?? []);

  const [modalOpen, setModalOpen] = useState(false);
  const [advUserId, setAdvUserId] = useState('');
  const [advAmount, setAdvAmount] = useState('');
  const [advReason, setAdvReason] = useState('');

  async function handleCreate() {
    try {
      await createMut.mutateAsync({ userId: advUserId, amount: Number(advAmount), reason: advReason || undefined });
      toast("Avans berildi", 'success'); setModalOpen(false);
    } catch { toast('Xatolik', 'error'); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] sm:text-xs text-text-muted">{advances.length} ta so'rov</span>
        <button onClick={() => { setAdvUserId(users[0]?.id ?? ''); setAdvAmount(''); setAdvReason(''); setModalOpen(true); }} className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 active:scale-[0.97] transition-all">
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Avans berish</span>
          <span className="sm:hidden">Berish</span>
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-1.5">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-surface-secondary animate-pulse" />)}</div>
      ) : advances.length === 0 ? (
        <div className="flex flex-col items-center py-14 text-text-muted">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-secondary mb-3"><Banknote className="h-6 w-6 opacity-40" /></div>
          <p className="text-sm font-medium text-text-primary mb-1">Avans so'rovlari yo'q</p>
          <button onClick={() => setModalOpen(true)} className="text-xs text-primary-600 font-medium hover:underline">+ Avans berish</button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {advances.map((adv) => {
            const st = ADV_STATUS[adv.status] ?? ADV_STATUS.PENDING!;
            return (
              <div key={adv.id} className="rounded-xl bg-surface p-2.5 sm:p-3" style={{ border: '1px solid var(--color-border-subtle)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-50 text-[11px] font-bold text-warning-700">{adv.user.name.charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-text-primary truncate">{adv.user.name}</p>
                    <p className="text-[10px] text-text-muted truncate">{adv.reason ?? "Sabab yo'q"} · {formatDate(adv.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <p className="text-[13px] sm:text-sm font-bold text-text-primary tabular-nums">
                      <span className="sm:hidden">{compactMoney(Number(adv.amount))}</span>
                      <span className="hidden sm:inline">{formatCurrency(Number(adv.amount))}</span>
                    </p>
                    <span className={cn('text-[9px] sm:text-[10px] font-medium rounded-md px-1.5 py-0.5', st.cls)}>{st.label}</span>
                    {adv.status === 'PENDING' && (
                      <div className="flex gap-1">
                        <button onClick={() => approveMut.mutate(adv.id)} disabled={approveMut.isPending} className="flex h-7 w-7 items-center justify-center rounded-lg bg-success-50 text-success-600 hover:bg-success-100 transition-colors" style={{ minHeight: 'auto', minWidth: 'auto' }}>
                          <CheckCircle className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => rejectMut.mutate(adv.id)} disabled={rejectMut.isPending} className="flex h-7 w-7 items-center justify-center rounded-lg bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors" style={{ minHeight: 'auto', minWidth: 'auto' }}>
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Avans berish" size="sm">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-text-secondary">Xodim</label>
            <select value={advUserId} onChange={(e) => setAdvUserId(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">
              {users.filter((u) => u.isActive).map((u) => <option key={u.id} value={u.id}>{u.name} ({ROLE_CONFIG[u.role]?.label ?? u.role})</option>)}
            </select>
          </div>
          <Input label="Summa" type="number" min={1} value={advAmount} onChange={(e) => setAdvAmount(e.target.value)} placeholder="500 000" autoFocus />
          <Input label="Sabab (ixtiyoriy)" value={advReason} onChange={(e) => setAdvReason(e.target.value)} placeholder="Oilaviy ehtiyoj" />
          <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Bekor</Button>
            <Button onClick={handleCreate} loading={createMut.isPending} disabled={!advUserId || !advAmount} className="flex-1">Berish</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
