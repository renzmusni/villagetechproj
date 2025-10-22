'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react'
import { AppError, classifyError, ErrorSeverity, getHumanReadableMessage, ErrorLogger } from '../utils/errorHandler'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: AppError, errorInfo: any) => void
  showErrorDetails?: boolean
}

interface State {
  hasError: boolean
  error: AppError | null
  errorInfo: any
  retryCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error: classifyError(error)
    }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    const appError = classifyError(error)

    this.setState({
      error: appError,
      errorInfo
    })

    // Log the error
    ErrorLogger.log(appError, errorInfo)

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(appError, errorInfo)
    }

    // In production, you might want to send the error to a monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendErrorToService(appError, errorInfo)
    }
  }

  private sendErrorToService = (error: AppError, errorInfo: any) => {
    // Integration with error monitoring services like Sentry, LogRocket, etc.
    try {
      // Example: Send to your error tracking endpoint
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.message,
          type: error.type,
          stack: error.stack,
          context: error.context,
          errorInfo,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      }).catch(() => {
        // Silently fail to avoid infinite loops
      })
    } catch (e) {
      // Silently fail to avoid infinite loops
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))
    }
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleContactSupport = () => {
    window.location.href = 'mailto:support@hoa-community.com'
  }

  private getErrorIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.LOW:
        return <AlertTriangle className="w-8 h-8 text-yellow-500" />
      case ErrorSeverity.MEDIUM:
        return <AlertTriangle className="w-8 h-8 text-orange-500" />
      case ErrorSeverity.HIGH:
        return <AlertTriangle className="w-8 h-8 text-red-500" />
      case ErrorSeverity.CRITICAL:
        return <AlertTriangle className="w-8 h-8 text-red-600" />
      default:
        return <AlertTriangle className="w-8 h-8 text-gray-500" />
    }
  }

  private getErrorActions = () => {
    const { hasError, error, retryCount } = this.state

    if (!error) return []

    const actions = []

    // Retry button for certain error types
    if (error.type === 'NETWORK' || error.type === 'SERVER_ERROR') {
      if (retryCount < this.maxRetries) {
        actions.push({
          label: 'Try Again',
          icon: <RefreshCw className="w-4 h-4" />,
          onClick: this.handleRetry,
          primary: true
        })
      }
    }

    // Go home button
    actions.push({
      label: 'Go Home',
      icon: <Home className="w-4 h-4" />,
      onClick: this.handleGoHome,
      primary: false
    })

    // Reload page button
    actions.push({
      label: 'Reload Page',
      icon: <RefreshCw className="w-4 h-4" />,
      onClick: this.handleReload,
      primary: false
    })

    // Contact support for critical errors
    if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
      actions.push({
        label: 'Contact Support',
        icon: <Mail className="w-4 h-4" />,
        onClick: this.handleContactSupport,
        primary: false
      })
    }

    return actions
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // If custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, errorInfo, retryCount } = this.state
      const showErrorDetails = this.props.showErrorDetails ?? process.env.NODE_ENV === 'development'
      const humanReadableMessage = getHumanReadableMessage(error)
      const actions = this.getErrorActions()

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            {/* Error Icon */}
            <div className="flex justify-center mb-4">
              {this.getErrorIcon(error.severity)}
            </div>

            {/* Error Message */}
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Oops! Something went wrong
              </h1>
              <p className="text-gray-600 mb-4">
                {humanReadableMessage}
              </p>

              {/* Error Type Badge */}
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mb-4">
                {error.type} Error
              </div>

              {/* Retry Count */}
              {retryCount > 0 && (
                <p className="text-sm text-gray-500 mb-4">
                  Retry attempt {retryCount} of {this.maxRetries}
                </p>
              )}
            </div>

            {/* Error Details (Development Only) */}
            {showErrorDetails && errorInfo && (
              <details className="mb-6 p-3 bg-gray-50 rounded-lg text-sm">
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                  Error Details
                </summary>
                <div className="mt-2 space-y-2">
                  <div>
                    <strong>Error:</strong> {error.message}
                  </div>
                  <div>
                    <strong>Type:</strong> {error.type}
                  </div>
                  <div>
                    <strong>Severity:</strong> {error.severity}
                  </div>
                  {error.context && (
                    <div>
                      <strong>Context:</strong>
                      <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(error.context, null, 2)}
                      </pre>
                    </div>
                  )}
                  {error.stack && (
                    <div>
                      <strong>Stack Trace:</strong>
                      <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`w-full flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors ${
                    action.primary
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </button>
              ))}
            </div>

            {/* Additional Help */}
            <div className="mt-6 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Need help?</strong> If this problem persists, please contact our support team for assistance.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for functional components to handle errors
export const useErrorHandler = () => {
  const [error, setError] = React.useState<AppError | null>(null)

  const handleError = React.useCallback((error: Error | AppError, context?: any) => {
    const appError = error instanceof AppError ? error : classifyError(error)

    if (context) {
      appError.context = { ...appError.context, ...context }
    }

    ErrorLogger.log(appError)
    setError(appError)
  }, [])

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  return { error, handleError, clearError }
}

// Error display component for use within components
export const ErrorDisplay: React.FC<{
  error: AppError
  onRetry?: () => void
  onDismiss?: () => void
  showDetails?: boolean
}> = ({ error, onRetry, onDismiss, showDetails = false }) => {
  const humanReadableMessage = getHumanReadableMessage(error)
  const [detailsVisible, setDetailsVisible] = React.useState(false)

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 mb-1">
            Error
          </h3>
          <p className="text-sm text-red-700 mb-2">
            {humanReadableMessage}
          </p>

          {showDetails && (
            <details className="text-xs text-red-600 mb-2">
              <summary
                className="cursor-pointer hover:text-red-800"
                onClick={() => setDetailsVisible(!detailsVisible)}
              >
                {detailsVisible ? 'Hide' : 'Show'} Details
              </summary>
              {detailsVisible && (
                <div className="mt-1 p-2 bg-red-100 rounded">
                  <div><strong>Type:</strong> {error.type}</div>
                  <div><strong>Message:</strong> {error.message}</div>
                  {error.context && (
                    <div className="mt-1">
                      <strong>Context:</strong>
                      <pre className="text-xs bg-red-50 p-1 rounded mt-1 overflow-auto">
                        {JSON.stringify(error.context, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </details>
          )}

          <div className="flex space-x-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200 transition-colors"
              >
                Retry
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-xs text-red-600 hover:text-red-800 transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ErrorBoundary