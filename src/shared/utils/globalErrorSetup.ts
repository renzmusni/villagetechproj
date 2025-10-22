import { setupGlobalErrorHandlers, ErrorLogger } from './errorHandler'

// Initialize global error handling
export const initializeErrorHandling = () => {
  // Setup global error handlers for unhandled errors
  setupGlobalErrorHandlers()

  // Setup console error override for better tracking
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const originalConsoleError = console.error
    console.error = (...args: any[]) => {
      originalConsoleError.apply(console, args)

      // Log console errors to our error tracking system
      if (args[0] instanceof Error) {
        ErrorLogger.log({
          name: 'ConsoleError',
          message: args[0].message,
          stack: args[0].stack,
          type: 'Unknown' as any,
          context: {
            component: 'Console',
            action: 'Console.error'
          }
        } as any)
      }
    }
  }

  // Setup unhandled promise rejection handler
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      // Log any pending errors before page unload
      const recentErrors = ErrorLogger.getRecentErrors()
      if (recentErrors.length > 0) {
        console.log(`Page unloaded with ${recentErrors.length} recent errors`)
      }
    })
  }
}

// Performance monitoring
export const setupPerformanceMonitoring = () => {
  if (typeof window === 'undefined') return

  // Monitor page load performance
  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const loadTime = navigation.loadEventEnd - navigation.loadEventStart

    if (loadTime > 3000) { // 3 seconds threshold
      console.warn(`Slow page load detected: ${loadTime}ms`)
      ErrorLogger.log({
        name: 'PerformanceIssue',
        message: `Slow page load: ${loadTime}ms`,
        type: 'Unknown' as any,
        context: {
          component: 'Performance',
          action: 'Page Load',
          additionalInfo: {
            loadTime,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
            firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
          }
        }
      } as any)
    }
  })

  // Monitor long tasks
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 100) { // 100ms threshold
          console.warn(`Long task detected: ${entry.duration}ms`)
          ErrorLogger.log({
            name: 'PerformanceIssue',
            message: `Long task: ${entry.duration}ms`,
            type: 'Unknown' as any,
            context: {
              component: 'Performance',
              action: 'Long Task',
              additionalInfo: {
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name
              }
            }
          } as any)
        }
      }
    })

    try {
      observer.observe({ entryTypes: ['longtask'] })
    } catch (e) {
      // longtask might not be supported in all browsers
    }
  }
}

// Network monitoring
export const setupNetworkMonitoring = () => {
  if (typeof window === 'undefined') return

  // Monitor online/offline status
  const handleOnline = () => {
    console.log('Network connection restored')
  }

  const handleOffline = () => {
    console.warn('Network connection lost')
    ErrorLogger.log({
      name: 'NetworkError',
      message: 'Network connection lost',
      type: 'NETWORK' as any,
      context: {
        component: 'Network',
        action: 'Connection Status'
      }
    } as any)
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Monitor fetch requests for failures
  const originalFetch = window.fetch
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args)

      // Log failed HTTP responses
      if (!response.ok) {
        ErrorLogger.log({
          name: 'HttpError',
          message: `HTTP ${response.status}: ${response.statusText}`,
          type: 'NETWORK' as any,
          context: {
            component: 'Network',
            action: 'HTTP Request',
            additionalInfo: {
              status: response.status,
              statusText: response.statusText,
              url: args[0],
              method: args[1]?.method || 'GET'
            }
          }
        } as any)
      }

      return response
    } catch (error) {
      // Log network failures
      ErrorLogger.log({
        name: 'NetworkError',
        message: (error as Error).message,
        type: 'NETWORK' as any,
        context: {
          component: 'Network',
          action: 'Network Request',
          additionalInfo: {
            url: args[0],
            method: args[1]?.method || 'GET'
          }
        }
      } as any)

      throw error
    }
  }
}

// User interaction tracking
export const setupUserInteractionTracking = () => {
  if (typeof window === 'undefined') return

  let lastActivity = Date.now()

  const updateLastActivity = () => {
    lastActivity = Date.now()
  }

  // Track user interactions
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
  events.forEach(event => {
    document.addEventListener(event, updateLastActivity, { passive: true })
  })

  // Check for user inactivity
  setInterval(() => {
    const inactiveTime = Date.now() - lastActivity
    if (inactiveTime > 30 * 60 * 1000) { // 30 minutes
      console.log(`User inactive for ${Math.round(inactiveTime / 1000 / 60)} minutes`)
    }
  }, 60000) // Check every minute
}

// Memory monitoring (where available)
export const setupMemoryMonitoring = () => {
  if (typeof window === 'undefined') return

  // Monitor memory usage if available
  if ('memory' in performance) {
    setInterval(() => {
      const memory = (performance as any).memory
      const usedMemory = memory.usedJSHeapSize / 1024 / 1024 // Convert to MB
      const totalMemory = memory.totalJSHeapSize / 1024 / 1024 // Convert to MB
      const memoryUsage = (usedMemory / totalMemory) * 100

      if (memoryUsage > 80) { // 80% threshold
        console.warn(`High memory usage: ${memoryUsage.toFixed(1)}% (${usedMemory.toFixed(1)}MB/${totalMemory.toFixed(1)}MB)`)
        ErrorLogger.log({
          name: 'MemoryIssue',
          message: `High memory usage: ${memoryUsage.toFixed(1)}%`,
          type: 'Unknown' as any,
          context: {
            component: 'Memory',
            action: 'Memory Usage',
            additionalInfo: {
              usedMemory,
              totalMemory,
              memoryUsage,
              limit: memory.jsHeapSizeLimit / 1024 / 1024
            }
          }
        } as any)
      }
    }, 30000) // Check every 30 seconds
  }
}

// Setup all monitoring and error handling
export const setupAllMonitoring = () => {
  initializeErrorHandling()
  setupPerformanceMonitoring()
  setupNetworkMonitoring()
  setupUserInteractionTracking()
  setupMemoryMonitoring()

  console.log('🛡️ Error handling and monitoring initialized')
}

// Export setup function for easy initialization
export default setupAllMonitoring