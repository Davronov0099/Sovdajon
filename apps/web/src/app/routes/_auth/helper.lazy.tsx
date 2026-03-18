import { createLazyFileRoute } from '@tanstack/react-router';
import { HelperPage } from '@/features/helper/HelperPage';

export const Route = createLazyFileRoute('/_auth/helper')({
  component: HelperPage,
});
