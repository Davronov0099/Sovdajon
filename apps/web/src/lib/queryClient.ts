import { QueryClient, type Mutation } from '@tanstack/react-query';

// Global mutation error handler — barcha mutation xatolarini toast qiladi
function onMutationError(error: Error, _variables: unknown, _context: unknown, mutation: Mutation) {
  // Skip if mutation has its own onError (already handled)
  if (mutation.options.onError) return;

  // Extract error message from API response
  let message = 'Xatolik yuz berdi';
  try {
    const parsed = JSON.parse((error as { message?: string }).message ?? '{}');
    if (parsed?.error?.message) {
      message = parsed.error.message;
    }
  } catch {
    if (error.message) message = error.message;
  }

  // Dispatch custom event for toast system
  window.dispatchEvent(new CustomEvent('app:toast', {
    detail: { message, variant: 'error' },
  }));
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      onError: onMutationError as never,
    },
  },
});
