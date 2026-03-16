import { createLazyFileRoute } from '@tanstack/react-router';
import { MonitoringPage } from '@/features/monitoring/MonitoringPage';

export const Route = createLazyFileRoute('/_auth/monitoring')({
  component: MonitoringPage,
});
