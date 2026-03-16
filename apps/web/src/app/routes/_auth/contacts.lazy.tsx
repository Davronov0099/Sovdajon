import { createLazyFileRoute } from '@tanstack/react-router';
import { ContactsPage } from '@/features/contacts/ContactsPage';
export const Route = createLazyFileRoute('/_auth/contacts')({ component: ContactsPage });
