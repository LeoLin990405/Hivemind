/**
 * @license
 * Copyright 2025 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Error State Components
 * Reusable error UI components for different error scenarios
 */

import React from 'react';
import { Result, Button, Empty } from '@arco-design/web-react';
import {
  IconExclamationCircle,
  IconCloseCircle,
  IconRefresh,
  IconWifi,
} from '@arco-design/web-react/icon';

/**
 * Generic Error Display
 */
interface ErrorDisplayProps {
  error: Error | unknown;
  title?: string;
  onRetry?: () => void;
  onReset?: () => void;
}

export function ErrorDisplay({ error, title, onRetry, onReset }: ErrorDisplayProps) {
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

  return (
    <Result
      status="error"
      icon={<IconExclamationCircle />}
      title={title || 'Error'}
      subTitle={errorMessage}
      extra={
        <div className="space-x-2">
          {onRetry && (
            <Button type="primary" onClick={onRetry} icon={<IconRefresh />}>
              Retry
            </Button>
          )}
          {onReset && (
            <Button onClick={onReset}>
              Reset
            </Button>
          )}
        </div>
      }
    />
  );
}

/**
 * Network Error Display
 */
interface NetworkErrorProps {
  onRetry?: () => void;
}

export function NetworkError({ onRetry }: NetworkErrorProps) {
  return (
    <Result
      status="error"
      icon={<IconWifi style={{ fontSize: 64, color: 'var(--color-warning-6)' }} />}
      title="Network Error"
      subTitle="Unable to connect to the server. Please check your internet connection."
      extra={
        onRetry && (
          <Button type="primary" onClick={onRetry} icon={<IconRefresh />}>
            Retry
          </Button>
        )
      }
    />
  );
}

/**
 * Not Found Error Display
 */
interface NotFoundErrorProps {
  resource?: string;
  onBack?: () => void;
}

export function NotFoundError({ resource = 'Resource', onBack }: NotFoundErrorProps) {
  return (
    <Result
      status="404"
      title="Not Found"
      subTitle={`${resource} not found or has been deleted.`}
      extra={
        onBack && (
          <Button type="primary" onClick={onBack}>
            Go Back
          </Button>
        )
      }
    />
  );
}

/**
 * Permission Error Display
 */
interface PermissionErrorProps {
  message?: string;
  onBack?: () => void;
}

export function PermissionError({
  message = 'You do not have permission to access this resource.',
  onBack,
}: PermissionErrorProps) {
  return (
    <Result
      status="403"
      title="Access Denied"
      subTitle={message}
      extra={
        onBack && (
          <Button type="primary" onClick={onBack}>
            Go Back
          </Button>
        )
      }
    />
  );
}

/**
 * Empty State Display
 */
interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: {
    text: string;
    onClick: () => void;
  };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Empty
      description={
        <div>
          {title && <div className="font-semibold mb-1">{title}</div>}
          {description && <div className="text-gray-500">{description}</div>}
        </div>
      }
    >
      {action && (
        <Button type="primary" onClick={action.onClick}>
          {action.text}
        </Button>
      )}
    </Empty>
  );
}

/**
 * Query Error Display
 * Specialized for React Query errors
 */
interface QueryErrorProps {
  error: Error | unknown;
  onRetry?: () => void;
}

export function QueryError({ error, onRetry }: QueryErrorProps) {
  const isNetworkError =
    error instanceof Error &&
    (error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.message.includes('Network'));

  if (isNetworkError) {
    return <NetworkError onRetry={onRetry} />;
  }

  const is404 =
    error instanceof Error &&
    ('status' in error ? (error as any).status === 404 : error.message.includes('not found'));

  if (is404) {
    return <NotFoundError onBack={onRetry} />;
  }

  const is403 =
    error instanceof Error &&
    ('status' in error ? (error as any).status === 403 : error.message.includes('permission'));

  if (is403) {
    return <PermissionError onBack={onRetry} />;
  }

  return <ErrorDisplay error={error} title="Failed to load data" onRetry={onRetry} />;
}

/**
 * Inline Error Message
 * Small error display for inline use
 */
interface InlineErrorProps {
  error: Error | unknown;
  onRetry?: () => void;
}

export function InlineError({ error, onRetry }: InlineErrorProps) {
  const errorMessage = error instanceof Error ? error.message : 'An error occurred';

  return (
    <div className="inline-error flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm">
      <IconCloseCircle className="text-red-600 dark:text-red-400" />
      <span className="flex-1 text-red-700 dark:text-red-300">{errorMessage}</span>
      {onRetry && (
        <Button size="mini" type="text" onClick={onRetry} icon={<IconRefresh />}>
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Loading Error (for suspense fallbacks)
 */
interface LoadingErrorProps {
  error: Error | unknown;
  resetErrorBoundary?: () => void;
}

export function LoadingError({ error, resetErrorBoundary }: LoadingErrorProps) {
  return (
    <div className="loading-error flex flex-col items-center justify-center min-h-[200px] p-8">
      <IconExclamationCircle
        style={{ fontSize: 48, color: 'var(--color-danger-6)', marginBottom: 16 }}
      />
      <div className="text-lg font-semibold mb-2">Failed to load</div>
      <div className="text-gray-500 mb-4">
        {error instanceof Error ? error.message : 'An unexpected error occurred'}
      </div>
      {resetErrorBoundary && (
        <Button type="primary" onClick={resetErrorBoundary} icon={<IconRefresh />}>
          Try Again
        </Button>
      )}
    </div>
  );
}
