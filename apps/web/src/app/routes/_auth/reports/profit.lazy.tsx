import { createLazyFileRoute } from '@tanstack/react-router';
import { ProfitReportPage } from '@/features/reports/ProfitReportPage';

export const Route = createLazyFileRoute('/_auth/reports/profit')({
  component: ProfitReportPage,
});
