/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Error Boundary Component
 * Catches React errors and displays fallback UI
 */

import type { ReactNode } from 'react';
import React, { Component } from 'react';
import { Result, Button } from '@arco-design/web-react';
import { IconExclamationCircle } from '@arco-design/web-react/icon';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary Component
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 *
 * With custom fallback:
 * ```tsx
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state when resetKeys change
    if (this.props.resetKeys && prevProps.resetKeys && this.props.resetKeys.some((key, i) => key !== prevProps.resetKeys?.[i])) {
      this.reset();
    }
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return (
        <div className='error-boundary-fallback p-8'>
          <Result
            status='error'
            icon={<IconExclamationCircle style={{ fontSize: 64, color: 'var(--color-danger-6)' }} />}
            title='Something went wrong'
            subTitle='An unexpected error occurred. Please try refreshing the page.'
            extra={[
              <Button key='refresh' type='primary' onClick={() => window.location.reload()}>
                Refresh Page
              </Button>,
              <Button key='reset' onClick={this.reset}>
                Try Again
              </Button>,
            ]}
          >
            {process.env.NODE_ENV === 'development' && error && (
              <div className='mt-6 text-left'>
                <details className='bg-gray-100 dark:bg-gray-800 p-4 rounded'>
                  <summary className='cursor-pointer font-semibold mb-2'>Error Details (Development Only)</summary>
                  <div className='space-y-2'>
                    <div>
                      <strong>Error:</strong>
                      <pre className='mt-1 text-sm overflow-auto'>{error.toString()}</pre>
                    </div>
                    {errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className='mt-1 text-sm overflow-auto whitespace-pre-wrap'>{errorInfo.componentStack}</pre>
                      </div>
                    )}
                    {error.stack && (
                      <div>
                        <strong>Stack Trace:</strong>
                        <pre className='mt-1 text-sm overflow-auto'>{error.stack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}
          </Result>
        </div>
      );
    }

    return children;
  }
}

/**
 * Query Error Boundary
 * Specialized error boundary for React Query errors
 */
interface QueryErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

export function QueryErrorBoundary({ children, onReset }: QueryErrorBoundaryProps) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('React Query Error:', error, errorInfo);
      }}
      fallback={
        <div className='query-error-boundary p-8'>
          <Result
            status='error'
            title='Failed to load data'
            subTitle='There was an error loading the data. Please try again.'
            extra={[
              <Button
                key='retry'
                type='primary'
                onClick={() => {
                  onReset?.();
                  window.location.reload();
                }}
              >
                Retry
              </Button>,
            ]}
          />
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * withErrorBoundary HOC
 * Wraps a component with an error boundary
 */
export function withErrorBoundary<P extends object>(Component: React.ComponentType<P>, errorBoundaryProps?: Omit<Props, 'children'>) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}
