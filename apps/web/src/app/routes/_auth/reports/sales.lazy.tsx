import { createLazyFileRoute } from '@tanstack/react-router';
import { SalesReportPage } from '@/features/reports/SalesReportPage';

export const Route = createLazyFileRoute('/_auth/reports/sales')({
  component: SalesReportPage,
});
