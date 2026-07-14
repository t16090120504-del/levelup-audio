import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

function ErrorFallback({
  error,
  onRetry,
}: {
  error?: Error;
  onRetry: () => void;
}) {
  const navigate = useNavigate();
  const isDev = import.meta.env.DEV;

  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-deepest px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-status-warning/30 bg-status-warning/10">
        <AlertTriangle size={40} className="text-status-warning" />
      </div>

      <h1 className="mt-6 font-display text-2xl font-bold text-text-primary">
        Something went wrong
      </h1>

      <p className="mt-2 max-w-sm text-sm text-text-secondary">
        An unexpected error occurred. You can try again or return to the home
        page.
      </p>

      {isDev && error && (
        <div className="mt-6 w-full max-w-lg overflow-hidden rounded-lg border border-status-warning/20 bg-bg-elevated text-left">
          <div className="border-b border-bg-base px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-status-warning">
              Error Details (Development)
            </span>
          </div>
          <div className="max-h-64 overflow-auto p-4">
            <p className="font-mono text-xs text-status-warning">
              {error.name}: {error.message}
            </p>
            {error.stack && (
              <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-text-muted">
                {error.stack}
              </pre>
            )}
          </div>
        </div>
      )}

      {!isDev && error && (
        <div className="mt-6 rounded-lg border border-bg-base bg-bg-elevated px-4 py-3">
          <p className="font-mono text-xs text-text-muted">
            {error.name}: {error.message}
          </p>
        </div>
      )}

      <div className="mt-8 flex items-center gap-3">
        <Button
          variant="secondary"
          leftIcon={<Home size={18} />}
          onClick={handleGoHome}
        >
          Go Home
        </Button>
        <Button
          variant="primary"
          leftIcon={<RotateCcw size={18} />}
          onClick={onRetry}
        >
          Retry
        </Button>
      </div>
    </div>
  );
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to error reporting service
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />
      );
    }

    return this.props.children;
  }
}
