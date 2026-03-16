import { useState } from 'react';
// HR Page — Attendance, Salary, KPI, Advance tabs
import {
  Clock, DollarSign, Target, Banknote,
  CheckCircle, XCircle, MapPin,
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@sardorbek/shared';
import { useToast } from '@/components/ui/toast';
import { useTodayAttendance, useCheckIn, useCheckOut } from '@/hooks/useAttendance';
import { useSalaries, useCalculateAll, usePaySalary } from '@/hooks/useSalary';
import { useAdvances, useApproveAdvance, useRejectAdvance } from '@/hooks/useAdvance';
import { useKpiTemplates } from '@/hooks/useKpi';
import type { AdvanceItem, KpiTemplateItem } from '@/types/api';

// Attendance record from useTodayAttendance hook
interface AttendanceRecordLocal {
  id: string;
  userId: string;
  checkIn: string;
  checkOut: string | null;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'HALF_DAY';
  lat: number | null;
  lng: number | null;
  user: { id: string; name: string; role: string; avatar: string | null };
}

// Salary item from useSalary hook (local type — differs from api.ts)
interface SalaryItemLocal {
  id: string;
  userId: string;
  month: string;
  base: string;
  kpiBonus: string;
  salesBonus: string;
  advances: string;
  fines: string;
  total: string;
  status: 'DRAFT' | 'CALCULATED' | 'RECALCULATED' | 'PAID';
  paidAt: string | null;
  user: { id: string; name: string; role: string };
}

type TabKey = 'attendance' | 'salary' | 'kpi' | 'advance';

const TABS: { key: TabKey; label: string; icon: typeof Clock }[] = [
  { key: 'attendance', label: 'Davomat', icon: Clock },
  { key: 'salary', label: 'Oylik', icon: DollarSign },
  { key: 'kpi', label: 'KPI', icon: Target },
  { key: 'advance', label: 'Avans', icon: Banknote },
];

const ATTENDANCE_STATUS: Record<string, { label: string; class: string }> = {
  PRESENT: { label: 'Keldi', class: 'badge-success' },
  LATE: { label: 'Kechikdi', class: 'badge-warning' },
  ABSENT: { label: 'Kelmadi', class: 'badge-danger' },
  HALF_DAY: { label: 'Yarim kun', class: 'badge-info' },
};

const SALARY_STATUS: Record<string, { label: string; class: string }> = {
  DRAFT: { label: 'Qoralama', class: 'badge-neutral' },
  CALCULATED: { label: 'Hisoblangan', class: 'badge-info' },
  RECALCULATED: { label: 'Qayta', class: 'badge-warning' },
  PAID: { label: "To'langan", class: 'badge-success' },
};

const ADVANCE_STATUS: Record<string, { label: string; class: string }> = {
  PENDING: { label: 'Kutilmoqda', class: 'badge-warning' },
  APPROVED: { label: 'Tasdiqlangan', class: 'badge-success' },
  REJECTED: { label: 'Rad', class: 'badge-danger' },
  PAID: { label: "To'langan", class: 'badge-info' },
};

export function HRPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>('attendance');
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Xodimlar boshqaruvi</h1>
        <p className="text-sm text-text-muted mt-0.5">Davomat, oylik, KPI va avanslar</p>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-lg border border-border bg-surface p-1 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.key
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-tertiary'
              }`}
              style={{ minHeight: '36px', minWidth: 'auto' }}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === 'attendance' && <AttendanceTab />}
      {tab === 'salary' && <SalaryTab month={month} setMonth={setMonth} toast={toast} />}
      {tab === 'kpi' && <KpiTab />}
      {tab === 'advance' && <AdvanceTab toast={toast} />}
    </div>
  );
}

/* ─── Attendance Tab ─── */

function AttendanceTab() {
  const { data, isLoading } = useTodayAttendance();
  // Reserve for check-in/out actions (TODO: add GPS button)
  void useCheckIn;
  void useCheckOut;

  const records: AttendanceRecordLocal[] = data?.data?.records ?? [];
  const stats = data?.data?.stats;

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="stat-card"><p className="stat-label">Jami</p><p className="stat-value">{stats.total}</p></div>
          <div className="stat-card"><p className="stat-label">Keldi</p><p className="stat-value text-success-600">{stats.present}</p></div>
          <div className="stat-card"><p className="stat-label">Kechikdi</p><p className="stat-value text-warning-600">{stats.late}</p></div>
          <div className="stat-card"><p className="stat-label">Kelmadi</p><p className="stat-value text-danger-600">{stats.absent}</p></div>
        </div>
      )}

      {/* Today's records */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <Clock className="mb-3 h-12 w-12 opacity-30" />
          <p className="font-medium">Bugungi davomat yo'q</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((rec) => {
            const statusConfig = ATTENDANCE_STATUS[rec.status] ?? ATTENDANCE_STATUS.PRESENT!;
            return (
              <div key={rec.id} className="card p-4 flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-700">
                  {rec.user.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">{rec.user.name}</p>
                  <p className="text-xs text-text-muted">
                    {formatDateTime(rec.checkIn)}
                    {rec.checkOut && ` → ${formatDateTime(rec.checkOut)}`}
                  </p>
                </div>
                <span className={`badge ${statusConfig.class}`}>
                  <span className="badge-dot" />
                  {statusConfig.label}
                </span>
                {rec.lat && rec.lng && (
                  <MapPin className="h-4 w-4 text-text-muted shrink-0" aria-label="GPS tasdiqlangan" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Salary Tab ─── */

function SalaryTab({ month, setMonth, toast }: { month: string; setMonth: (m: string) => void; toast: ReturnType<typeof useToast>['toast'] }) {
  const { data, isLoading } = useSalaries(month);
  const calculateMut = useCalculateAll();
  const payMut = usePaySalary();

  const salaries: SalaryItemLocal[] = data?.data ?? [];

  async function handleCalculate() {
    try {
      await calculateMut.mutateAsync(month);
      toast('Oyliklar hisoblandi', 'success');
    } catch { toast('Hisoblash xatosi', 'error'); }
  }

  async function handlePay(id: string) {
    try {
      await payMut.mutateAsync(id);
      toast("To'landi", 'success');
    } catch { toast("To'lash xatosi", 'error'); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="input w-auto"
          style={{ minWidth: '180px' }}
        />
        <button onClick={handleCalculate} className="btn btn-primary btn-md" disabled={calculateMut.isPending}>
          {calculateMut.isPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
          Barchasini hisoblash
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : salaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <DollarSign className="mb-3 h-12 w-12 opacity-30" />
          <p className="font-medium">Oylik ma'lumotlari yo'q</p>
          <p className="text-sm mt-1">Avval "Barchasini hisoblash" tugmasini bosing</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Xodim</th>
                <th className="text-right">Asosiy</th>
                <th className="text-right">KPI</th>
                <th className="text-right">Sotuv</th>
                <th className="text-right">Avans</th>
                <th className="text-right">Jarima</th>
                <th className="text-right">Jami</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {salaries.map((s) => {
                const statusConfig = SALARY_STATUS[s.status] ?? SALARY_STATUS.DRAFT!;
                return (
                  <tr key={s.id}>
                    <td className="font-medium">{s.user.name}</td>
                    <td className="text-right tabular-nums">{formatCurrency(Number(s.base))}</td>
                    <td className="text-right tabular-nums text-success-600">{formatCurrency(Number(s.kpiBonus))}</td>
                    <td className="text-right tabular-nums text-info-600">{formatCurrency(Number(s.salesBonus))}</td>
                    <td className="text-right tabular-nums text-warning-600">-{formatCurrency(Number(s.advances))}</td>
                    <td className="text-right tabular-nums text-danger-600">-{formatCurrency(Number(s.fines))}</td>
                    <td className="text-right tabular-nums font-bold">{formatCurrency(Number(s.total))}</td>
                    <td>
                      <span className={`badge ${statusConfig.class}`}>
                        <span className="badge-dot" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td>
                      {s.status === 'CALCULATED' && (
                        <button onClick={() => handlePay(s.id)} className="btn btn-success btn-sm" disabled={payMut.isPending}>
                          To'lash
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── KPI Tab ─── */

function KpiTab() {
  const { data, isLoading } = useKpiTemplates();
  const templates: KpiTemplateItem[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <Target className="mb-3 h-12 w-12 opacity-30" />
          <p className="font-medium">KPI shablonlari yo'q</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <div key={tpl.id} className="card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                  <Target className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">{tpl.name}</h3>
                  {tpl.description && <p className="text-xs text-text-muted">{tpl.description}</p>}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">
                  Target: <span className="font-medium text-text-secondary tabular-nums">{tpl.targetValue} {tpl.unit}</span>
                </span>
                <span className="text-text-muted">
                  Bonus: <span className="font-medium text-success-600 tabular-nums">{formatCurrency(Number(tpl.bonusAmount))}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Advance Tab ─── */

function AdvanceTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const { data, isLoading } = useAdvances();
  const approveMut = useApproveAdvance();
  const rejectMut = useRejectAdvance();

  const advances: AdvanceItem[] = (data as { data?: AdvanceItem[] } | undefined)?.data ?? [];

  async function handleApprove(id: string) {
    try { await approveMut.mutateAsync(id); toast('Tasdiqlandi', 'success'); }
    catch { toast('Xatolik', 'error'); }
  }

  async function handleReject(id: string) {
    try { await rejectMut.mutateAsync(id); toast('Rad etildi', 'success'); }
    catch { toast('Xatolik', 'error'); }
  }

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : advances.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <Banknote className="mb-3 h-12 w-12 opacity-30" />
          <p className="font-medium">Avans so'rovlari yo'q</p>
        </div>
      ) : (
        <div className="space-y-2">
          {advances.map((adv) => {
            const statusConfig = ADVANCE_STATUS[adv.status] ?? ADVANCE_STATUS.PENDING!;
            return (
              <div key={adv.id} className="card p-4 flex flex-wrap items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-50 text-sm font-bold text-warning-700">
                  {adv.user.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">{adv.user.name}</p>
                  <p className="text-xs text-text-muted">{adv.reason ?? 'Sabab ko\'rsatilmagan'} | {formatDate(adv.createdAt)}</p>
                </div>
                <p className="text-lg font-bold text-text-primary tabular-nums">{formatCurrency(Number(adv.amount))}</p>
                <span className={`badge ${statusConfig.class}`}>
                  <span className="badge-dot" />
                  {statusConfig.label}
                </span>
                {adv.status === 'PENDING' && (
                  <div className="flex gap-1.5">
                    <button onClick={() => handleApprove(adv.id)} className="btn btn-success btn-sm" disabled={approveMut.isPending}>
                      <CheckCircle className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleReject(adv.id)} className="btn btn-danger btn-sm" disabled={rejectMut.isPending}>
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
