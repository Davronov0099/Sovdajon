import { useState, useEffect } from 'react';
import { Activity, Database, Server, Wifi, WifiOff, HardDrive, Clock, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';

interface HealthStatus {
  status: string;
  db?: string;
  redis?: string;
  uptime?: number;
  memory?: { rss: number; heapUsed: number; heapTotal: number };
  version?: string;
}

export function MonitoringPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  async function checkHealth() {
    setLoading(true);
    setError('');
    try {
      const [live, ready] = await Promise.all([
        api.get('health/live').json<HealthStatus>().catch(() => null),
        api.get('health/ready').json<HealthStatus>().catch(() => null),
      ]);

      let monitorData: HealthStatus | null = null;
      try {
        monitorData = await api.get('monitoring/system').json<{ data: HealthStatus }>().then((r) => r.data);
      } catch { /* monitoring endpoint may not exist */ }

      setHealth({
        status: live?.status ?? 'unknown',
        db: ready?.db ?? 'unknown',
        redis: ready?.redis ?? 'unknown',
        uptime: monitorData?.uptime,
        memory: monitorData?.memory,
        version: monitorData?.version,
      });
      setLastCheck(new Date());
    } catch {
      setError('Server bilan aloqa yo\'q');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { checkHealth(); }, []);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d} kun ${h} soat`;
    if (h > 0) return `${h} soat ${m} daqiqa`;
    return `${m} daqiqa`;
  };

  return (
    <div className="p-4 sm:p-6 animate-fade-in max-w-4xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Monitoring</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Tizim holati va salomatligi
            {lastCheck && <span className="ml-2">| Oxirgi: {lastCheck.toLocaleTimeString()}</span>}
          </p>
        </div>
        <button onClick={checkHealth} className="btn btn-secondary btn-md" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Yangilash
        </button>
      </div>

      {error ? (
        <div className="card p-8 text-center">
          <WifiOff className="mx-auto mb-3 h-12 w-12 text-danger-500" />
          <p className="font-medium text-danger-600">{error}</p>
          <button onClick={checkHealth} className="btn btn-primary btn-md mt-4">Qayta urinish</button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatusCard
              icon={Server}
              label="API Server"
              value={health?.status === 'ok' ? 'Ishlayapti' : 'Noma\'lum'}
              status={health?.status === 'ok' ? 'success' : 'warning'}
              loading={loading}
            />
            <StatusCard
              icon={Database}
              label="PostgreSQL"
              value={health?.db === 'connected' ? 'Ulangan' : 'Uzilgan'}
              status={health?.db === 'connected' ? 'success' : 'danger'}
              loading={loading}
            />
            <StatusCard
              icon={Wifi}
              label="Redis"
              value={health?.redis === 'connected' ? 'Ulangan' : 'Uzilgan'}
              status={health?.redis === 'connected' ? 'success' : 'warning'}
              loading={loading}
            />
            <StatusCard
              icon={Clock}
              label="Uptime"
              value={health?.uptime ? formatUptime(health.uptime) : '-'}
              status="info"
              loading={loading}
            />
          </div>

          {/* Memory */}
          {health?.memory && (
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info-50">
                  <HardDrive className="h-5 w-5 text-info-600" aria-hidden="true" />
                </div>
                <h2 className="text-sm font-semibold text-text-primary">Xotira ishlatilishi</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <MemoryBar label="RSS" used={health.memory.rss} total={512 * 1024 * 1024} format={formatBytes} />
                <MemoryBar label="Heap Used" used={health.memory.heapUsed} total={health.memory.heapTotal} format={formatBytes} />
                <MemoryBar label="Heap Total" used={health.memory.heapTotal} total={512 * 1024 * 1024} format={formatBytes} />
              </div>
            </div>
          )}

          {/* Info */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-3">Tizim ma'lumotlari</h2>
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-border-subtle">
                <dt className="text-text-muted">Versiya</dt>
                <dd className="font-medium text-text-primary tabular-nums">{health?.version ?? '0.1.0'}</dd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border-subtle">
                <dt className="text-text-muted">Node.js</dt>
                <dd className="font-medium text-text-primary">v20 LTS</dd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border-subtle">
                <dt className="text-text-muted">Framework</dt>
                <dd className="font-medium text-text-primary">Fastify 5</dd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border-subtle">
                <dt className="text-text-muted">Database</dt>
                <dd className="font-medium text-text-primary">PostgreSQL 16</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusCard({ icon: Icon, label, value, status, loading }: {
  icon: typeof Activity;
  label: string;
  value: string;
  status: 'success' | 'warning' | 'danger' | 'info';
  loading: boolean;
}) {
  const colors = {
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    danger: 'bg-danger-50 text-danger-600',
    info: 'bg-info-50 text-info-600',
  };
  const dotColors = {
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
    info: 'bg-info-500',
  };

  return (
    <div className="stat-card">
      {loading ? (
        <div className="skeleton h-12 w-full rounded-lg" />
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${colors[status]}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className={`h-2.5 w-2.5 rounded-full ${dotColors[status]} animate-pulse`} />
          </div>
          <p className="text-sm font-semibold text-text-primary">{value}</p>
          <p className="stat-label mt-0.5">{label}</p>
        </>
      )}
    </div>
  );
}

function MemoryBar({ label, used, total, format }: { label: string; used: number; total: number; format: (n: number) => string }) {
  const percent = Math.min(Math.round((used / total) * 100), 100);
  const color = percent > 80 ? 'bg-danger-500' : percent > 60 ? 'bg-warning-500' : 'bg-success-500';

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-muted">{label}</span>
        <span className="font-medium text-text-secondary tabular-nums">{format(used)} / {format(total)}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-tertiary overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
