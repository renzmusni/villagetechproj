// Frontend Error Handling Utility

export interface ApiError {
  success: false;
  message: string;
  errors?: string[];
  details?: any;
  stack?: string;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  additionalInfo?: Record<string, any>;
}

// Error types for better categorization
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN'
}

// Custom error class
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly context?: ErrorContext;
  public readonly originalError?: Error;
  public readonly statusCode?: number;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    context?: ErrorContext,
    originalError?: Error,
    statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.context = context;
    this.originalError = originalError;
    this.statusCode = statusCode;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

// Error classification function
export const classifyError = (error: any): AppError => {
  // Network errors
  if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
    return new AppError(
      'Network connection failed. Please check your internet connection.',
      ErrorType.NETWORK,
      { component: 'Network', action: 'API Request' },
      error
    );
  }

  // API response errors
  if (error.response) {
    const { status, data } = error.response;

    switch (status) {
      case 400:
        return new AppError(
          data?.message || 'Invalid request. Please check your input.',
          ErrorType.VALIDATION,
          { component: 'API', action: 'Validation' },
          error,
          status
        );

      case 401:
        return new AppError(
          'Authentication required. Please log in again.',
          ErrorType.AUTHENTICATION,
          { component: 'Auth', action: 'Login' },
          error,
          status
        );

      case 403:
        return new AppError(
          'You do not have permission to perform this action.',
          ErrorType.AUTHORIZATION,
          { component: 'Auth', action: 'Authorization' },
          error,
          status
        );

      case 404:
        return new AppError(
          'The requested resource was not found.',
          ErrorType.NOT_FOUND,
          { component: 'API', action: 'Fetch' },
          error,
          status
        );

      case 429:
        return new AppError(
          'Too many requests. Please try again later.',
          ErrorType.NETWORK,
          { component: 'API', action: 'Rate Limit' },
          error,
          status
        );

      case 500:
      case 502:
      case 503:
        return new AppError(
          'Server error. Please try again later.',
          ErrorType.SERVER_ERROR,
          { component: 'API', action: 'Server Error' },
          error,
          status
        );

      default:
        return new AppError(
          data?.message || 'An unexpected error occurred.',
          ErrorType.UNKNOWN,
          { component: 'API', action: 'Unknown Error' },
          error,
          status
        );
    }
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return new AppError(
      'Request timed out. Please try again.',
      ErrorType.NETWORK,
      { component: 'API', action: 'Timeout' },
      error
    );
  }

  // JavaScript errors
  if (error instanceof TypeError) {
    return new AppError(
      'A type error occurred. Please refresh the page.',
      ErrorType.UNKNOWN,
      { component: 'JavaScript', action: 'Type Error' },
      error
    );
  }

  if (error instanceof ReferenceError) {
    return new AppError(
      'A reference error occurred. Please refresh the page.',
      ErrorType.UNKNOWN,
      { component: 'JavaScript', action: 'Reference Error' },
      error
    );
  }

  // Default fallback
  return new AppError(
    error?.message || 'An unexpected error occurred.',
    ErrorType.UNKNOWN,
    { component: 'Unknown', action: 'Error' },
    error
  );
};

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Get error severity based on type and context
export const getErrorSeverity = (error: AppError): ErrorSeverity => {
  switch (error.type) {
    case ErrorType.AUTHENTICATION:
    case ErrorType.AUTHORIZATION:
      return ErrorSeverity.HIGH;

    case ErrorType.SERVER_ERROR:
      return ErrorSeverity.CRITICAL;

    case ErrorType.VALIDATION:
      return ErrorSeverity.LOW;

    case ErrorType.NETWORK:
    case ErrorType.NOT_FOUND:
      return ErrorSeverity.MEDIUM;

    default:
      return ErrorSeverity.MEDIUM;
  }
};

// Error logging service
export class ErrorLogger {
  private static errors: Array<{
    error: AppError;
    timestamp: Date;
    userAgent?: string;
    url?: string;
  }> = [];

  static log(error: AppError, additionalContext?: any) {
    const logEntry = {
      error,
      timestamp: new Date(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      ...additionalContext
    };

    this.errors.push(logEntry);

    // Keep only last 100 errors in memory
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }

    // Console error with formatting
    console.group(`🚨 ${error.type} Error`);
    console.error('Message:', error.message);
    console.error('Type:', error.type);
    console.error('Context:', error.context);
    console.error('Timestamp:', logEntry.timestamp);

    if (process.env.NODE_ENV === 'development') {
      console.error('Original Error:', error.originalError);
      console.error('Stack Trace:', error.stack);
    }

    console.groupEnd();

    // In production, you would send this to your error tracking service
    // Examples: Sentry, LogRocket, Datadog, etc.
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorService(logEntry);
    }
  }

  private static sendToErrorService(logEntry: any) {
    // Integration with error tracking services
    // This is where you would implement Sentry, Datadog, etc.
    try {
      // Example: Send to your logging endpoint
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      }).catch(() => {
        // Silently fail to avoid infinite loops
      });
    } catch (e) {
      // Silently fail to avoid infinite loops
    }
  }

  static getRecentErrors(count: number = 10) {
    return this.errors.slice(-count);
  }

  static clearErrors() {
    this.errors = [];
  }
}

// User-friendly error messages
export const getHumanReadableMessage = (error: AppError): string => {
  const userMessages: Record<ErrorType, string> = {
    [ErrorType.NETWORK]: 'Connection issue. Please check your internet and try again.',
    [ErrorType.VALIDATION]: 'Please check your input and try again.',
    [ErrorType.AUTHENTICATION]: 'Please log in to continue.',
    [ErrorType.AUTHORIZATION]: 'You don\'t have permission to do this.',
    [ErrorType.NOT_FOUND]: 'We couldn\'t find what you\'re looking for.',
    [ErrorType.SERVER_ERROR]: 'Something went wrong. Please try again later.',
    [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.'
  };

  return userMessages[error.type] || error.message;
};

// Error boundary React component
export interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
}

export const errorBoundaryHandler = (error: Error, errorInfo: any): AppError => {
  const appError = classifyError(error);
  appError.context = {
    ...appError.context,
    component: 'React Error Boundary',
    additionalInfo: errorInfo
  };

  ErrorLogger.log(appError);
  return appError;
};

// Retry mechanism with exponential backoff
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff: wait 1s, 2s, 4s, etc.
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw classifyError(lastError);
};

// Global error handler for unhandled errors
export const setupGlobalErrorHandlers = () => {
  if (typeof window === 'undefined') return;

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = classifyError(event.reason);
    error.context = {
      ...error.context,
      component: 'Global Handler',
      action: 'Unhandled Promise Rejection'
    };
    ErrorLogger.log(error);

    // Prevent the default browser behavior
    event.preventDefault();
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const error = classifyError(event.error);
    error.context = {
      ...error.context,
      component: 'Global Handler',
      action: 'Uncaught Error',
      additionalInfo: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    };
    ErrorLogger.log(error);
  });
};

// Hook for error handling in React components
export const useErrorHandler = () => {
  const handleError = (error: Error | AppError, context?: ErrorContext) => {
    const appError = error instanceof AppError ? error : classifyError(error);

    if (context) {
      appError.context = { ...appError.context, ...context };
    }

    ErrorLogger.log(appError);
    return appError;
  };

  const executeWithErrorHandling = async <T>(
    operation: () => Promise<T>,
    context?: ErrorContext
  ): Promise<{ data?: T; error?: AppError }> => {
    try {
      const data = await operation();
      return { data };
    } catch (error) {
      const appError = handleError(error as Error, context);
      return { error: appError };
    }
  };

  return {
    handleError,
    executeWithErrorHandling,
    getRecentErrors: ErrorLogger.getRecentErrors,
    clearErrors: ErrorLogger.clearErrors
  };
};

// API response checker
export const checkApiResponse = (response: any): void => {
  if (!response.success) {
    const error = new Error(response.message || 'API request failed');
    (error as any).response = { status: 500, data: response };
    throw error;
  }
};

// Form validation helper
export const validateForm = (data: Record<string, any>, rules: Record<string, any>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];

    // Required validation
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field.replace(/_/g, ' ')} is required`);
      continue;
    }

    // Skip further validation if field is empty and not required
    if (value === undefined || value === null || value === '') {
      continue;
    }

    // Type validation
    if (rule.type && typeof value !== rule.type) {
      errors.push(`${field.replace(/_/g, ' ')} must be of type ${rule.type}`);
    }

    // String validations
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${field.replace(/_/g, ' ')} must be at least ${rule.minLength} characters`);
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${field.replace(/_/g, ' ')} must not exceed ${rule.maxLength} characters`);
      }
      if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
        errors.push(`${field.replace(/_/g, ' ')} format is invalid`);
      }
    }

    // Email validation
    if (rule.format === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push(`${field.replace(/_/g, ' ')} must be a valid email address`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  AppError,
  ErrorType,
  ErrorSeverity,
  ErrorLogger,
  classifyError,
  getErrorSeverity,
  getHumanReadableMessage,
  errorBoundaryHandler,
  retryWithBackoff,
  setupGlobalErrorHandlers,
  useErrorHandler,
  checkApiResponse,
  validateForm
};