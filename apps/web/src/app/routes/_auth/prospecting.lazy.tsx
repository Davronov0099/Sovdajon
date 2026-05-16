import { createLazyFileRoute } from '@tanstack/react-router';
import { ProspectingMapPage } from '@/features/prospecting/ProspectingMapPage';

export const Route = createLazyFileRoute('/_auth/prospecting')({
  component: ProspectingMapPage,
});
