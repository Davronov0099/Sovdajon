import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  UserCog, Settings, ShoppingBag, Receipt, AlertTriangle, ScanBarcode,
  ChevronRight, Archive as ArchiveIcon,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/cn';
import type { Role } from '@sardorbek/shared';

interface ArchiveCard {
  key: string;
  to: string;
  icon: typeof UserCog;
  title: string;
  description: string;
  roles: Role[];
  gradient: string;
}

export function ArchivePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const cards: ArchiveCard[] = useMemo(() => [
    {
      key: 'orders',
      to: '/orders',
      icon: ShoppingBag,
      title: t('nav.orders'),
      description: 'Mijozlar buyurtmalari va statuslar',
      roles: ['ADMIN', 'CASHIER', 'HELPER'],
      gradient: 'from-primary-500/15 to-primary-600/5',
    },
    {
      key: 'receipts',
      to: '/receipts',
      icon: Receipt,
      title: t('nav.receipts'),
      description: 'Cheklar tarixi va qaytarish',
      roles: ['ADMIN', 'CASHIER'],
      gradient: 'from-info-500/15 to-info-600/5',
    },
    {
      key: 'stock-alerts',
      to: '/stock-alerts',
      icon: AlertTriangle,
      title: t('nav.stock-alerts'),
      description: "Kam qolgan va tugagan mahsulotlar",
      roles: ['ADMIN', 'CASHIER', 'HELPER'],
      gradient: 'from-warning-500/15 to-warning-600/5',
    },
    {
      key: 'hr',
      to: '/hr',
      icon: UserCog,
      title: t('nav.hr'),
      description: 'Xodimlar, davomad, maosh',
      roles: ['ADMIN'],
      gradient: 'from-success-500/15 to-success-600/5',
    },
    {
      key: 'helper',
      to: '/helper',
      icon: ScanBarcode,
      title: t('nav.helper'),
      description: 'Mahsulot skaneri va yordamchilar',
      roles: ['ADMIN', 'HELPER'],
      gradient: 'from-purple-500/15 to-purple-600/5',
    },
    {
      key: 'settings',
      to: '/settings',
      icon: Settings,
      title: t('nav.settings'),
      description: 'Kompaniya va tizim sozlamalari',
      roles: ['ADMIN'],
      gradient: 'from-text-muted/15 to-text-muted/5',
    },
  ], [t]);

  // Rolga qarab filtrlash
  const visibleCards = user ? cards.filter((c) => c.roles.includes(user.role)) : [];

  return (
    <div className="p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
          <ArchiveIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Arxiv</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Qo'shimcha bo'limlar va sozlamalar
          </p>
        </div>
      </div>

      {/* Cards grid */}
      {visibleCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <ArchiveIcon className="mb-4 h-14 w-14 opacity-15" />
          <p className="text-base font-medium">Sizning rolingiz uchun bo'lim mavjud emas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {visibleCards.map((card) => (
            <ArchiveCardItem key={card.key} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}

function ArchiveCardItem({ card }: { card: ArchiveCard }) {
  const Icon = card.icon;
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={card.to as any}
      className={cn(
        'group relative overflow-hidden rounded-xl bg-surface p-4 sm:p-5 transition-all',
        'hover:shadow-card-hover hover:-translate-y-0.5',
      )}
      style={{ border: '1px solid var(--color-border-subtle)' }}
    >
      {/* Background gradient */}
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-100 transition-opacity group-hover:opacity-100', card.gradient)} />

      {/* Content */}
      <div className="relative">
        <div className="flex items-start gap-3 mb-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-text-primary shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-bold text-text-primary group-hover:text-primary-600 transition-colors">
              {card.title}
            </h3>
            <p className="text-[11px] sm:text-xs text-text-muted mt-0.5">
              {card.description}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-text-muted/40 shrink-0 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  );
}
