import { createLazyFileRoute } from '@tanstack/react-router';
import { PartnersPage } from '@/features/partners/PartnersPage';
export const Route = createLazyFileRoute('/_auth/partners')({ component: PartnersPage });
