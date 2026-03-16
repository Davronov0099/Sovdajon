import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, info.componentStack);
    }
    // Production: send to error reporting service (Sentry, etc.)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-screen items-center justify-center bg-surface-secondary p-6" role="alert" aria-live="assertive">
          <div className="w-full max-w-md rounded-xl bg-surface p-8 text-center shadow-modal">
            <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-warning-500" aria-hidden="true" />
            <h1 className="mb-2 text-xl font-bold text-text-primary">
              Kutilmagan xatolik yuz berdi
            </h1>
            <p className="mb-6 text-sm text-text-secondary">
              {this.state.error?.message || 'Noma\'lum xatolik'}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={this.handleReset}
                autoFocus
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-2 focus:outline-offset-2 focus:outline-primary-500"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Qayta urinish
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="min-h-[44px] rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-secondary focus:outline-2 focus:outline-offset-2 focus:outline-primary-500"
              >
                Bosh sahifa
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
