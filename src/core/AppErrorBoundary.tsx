/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { error as logError } from '../shared/lib/logging';
import { useI18n } from '../shared/lib/i18n';

interface AppErrorBoundaryState {
  hasError: boolean;
}

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

const ErrorFallback: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  const { t } = useI18n();

  return (
    <div className="app-error-boundary">
      <div className="app-error-boundary__content">
        <h1 className="app-error-boundary__title">{t('errorBoundary.title')}</h1>
        <p className="app-error-boundary__message">{t('errorBoundary.message')}</p>
        <button
          type="button"
          className="app-error-boundary__retry-button"
          onClick={onRetry}
        >
          {t('errorBoundary.retry')}
        </button>
      </div>
    </div>
  );
};

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  public state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    logError('[AppErrorBoundary] Unhandled error', error, info);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}
