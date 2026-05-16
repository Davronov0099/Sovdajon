import { createFileRoute } from '@tanstack/react-router';
import { StockAlertsPage } from '@/features/stock-alerts/StockAlertsPage';

export const Route = createFileRoute('/_auth/stock-alerts')({
  component: StockAlertsPage,
});
