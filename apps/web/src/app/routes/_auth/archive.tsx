import { createFileRoute } from '@tanstack/react-router';
import { ArchivePage } from '@/features/archive/ArchivePage';

export const Route = createFileRoute('/_auth/archive')({
  component: ArchivePage,
});
