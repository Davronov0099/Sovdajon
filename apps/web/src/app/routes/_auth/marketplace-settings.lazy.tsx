import { createLazyFileRoute } from '@tanstack/react-router';
import { MarketplaceSettingsPage } from '@/features/marketplace/MarketplaceSettingsPage';

export const Route = createLazyFileRoute('/_auth/marketplace-settings')({
  component: MarketplaceSettingsPage,
});
