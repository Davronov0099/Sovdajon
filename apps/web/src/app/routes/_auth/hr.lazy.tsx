import { createLazyFileRoute } from '@tanstack/react-router';
import { HRPage } from '@/features/hr/HRPage';

export const Route = createLazyFileRoute('/_auth/hr')({
  component: HRPage,
});
