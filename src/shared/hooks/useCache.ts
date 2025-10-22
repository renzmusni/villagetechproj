import { useState, useCallback, useEffect } from 'react'
import { cacheManager } from '../utils/websocketClient'

// React Query-style cache hook
export const useCache = () => {
  const [cache, setCache] = useState(() => ({
    data: null,
    loading: false,
    error: null,
    lastFetch: null
  }))

  const fetchWithCache = useCallback(async (key, fetcher, ttl) => {
    try {
      setCache(prev => ({ ...prev, loading: true }))

      // Check cache first
      const cached = await cacheManager?.get(key)
      if (cached) {
        setCache({
          data: cached,
          loading: false,
          error: null,
          lastFetch: Date.now()
        })
        return cached
      }

      // Fetch new data
      const data = await fetcher()

      // Store in cache
      await cacheManager?.set(key, data, ttl)

      setCache({
        data,
        loading: false,
        error: null,
        lastFetch: Date.now()
      })

      return data
    } catch (error) {
      setCache({
        data: null,
        loading: false,
        error,
        lastFetch: Date.now()
      })
      throw error
    }
  }

  const invalidateCache = useCallback(async (pattern) => {
    try {
      await cacheManager?.clear(pattern)
      setCache(prev => ({
        ...prev,
        data: null,
        lastFetch: null
      }))
    } catch (error) {
      console.error('Cache invalidation error:', error)
    }
  }

  const prefetchData = useCallback(async (key, fetcher, condition = true) => {
    if (!condition || !cacheManager) return

    try {
      const cached = await cacheManager.get(key)
      if (cached) {
        return cached
      }

      // Prefetch in background
      fetcher().catch(error => {
        console.warn('Prefetch failed for', key, error)
      })
    } catch (error) {
      console.warn('Prefetch error for', key, error)
    }
  }

  const getCachedData = useCallback(async (key) => {
    if (!cacheManager) return null
    try {
      const data = await cacheManager.get(key)
      return data
    } catch (error) {
      console.error('Cache get error for', key, error)
      return null
    }
  })

  const setCachedData = useCallback(async (key, data, ttl) => {
    if (!cacheManager) return
    try {
      await cacheManager.set(key, data, ttl)
    } catch (error) {
      console.error('Cache set error for', key, error)
    }
  }

  // Auto-invalidation hook
  const useAutoInvalidate = (deps, invalidationKey) => {
    useEffect(() => {
      if (!cacheManager) return

      const invalidateData = async () => {
        try {
          await cacheManager.clear(invalidationKey)
          console.log(`Auto-invalidated cache: ${invalidationKey}`)
        } catch (error) {
          console.error('Auto-invalidation error:', error)
        }
      }

      // Invalidate on dependency changes
      if (deps.length > 0) {
        console.log('Setting up auto-invalidation for dependencies:', deps)
        // Watch for changes and invalidate cache
        // This is a simplified example - in production you'd use more sophisticated invalidation
        const interval = setInterval(invalidateData, 30000) // Check every 30 seconds

        return () => clearInterval(interval)
      }

      return interval
    }
  }, deps)

  // Performance monitoring hook
  const usePerformanceMonitor = () => {
    const [metrics, setMetrics] = useState(() => ({
      renderTime: 0,
      apiCalls: 0,
      errorCount: 0,
      memoryUsage: null
    }))

    const measureRender = useCallback(() => {
      const start = performance.now()

      return (callback) => {
        const result = callback()
        const end = performance.now()

        setMetrics(prev => ({
          ...prev,
          renderTime: end - start
        }))

        return result
      }
    })

    const trackApiCall = useCallback(() => {
      setMetrics(prev => ({
        ...prev,
        apiCalls: prev.apiCalls + 1
      }))
    })

    const trackError = useCallback(() => {
      setMetrics(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1
      }))
    })

    const updateMemoryUsage = useCallback(() => {
      if (typeof window !== 'undefined' && 'memory' in performance) {
        const memory = (performance as any).memory
        setMetrics(prev => ({
          ...prev,
          memoryUsage: {
            used: Math.round(memory.usedJSHeapSize / 1024 / 1024 * 100),
            total: Math.round(memory.totalJSHeapSize / 1024 / 1024 * 100),
            limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024 * 100)
          }
        }))
      }
    })

    useEffect(() => {
      const interval = setInterval(updateMemoryUsage, 5000) // Update every 5 seconds
      return () => clearInterval(interval)
    }, [])

    return {
      metrics,
      measureRender,
      trackApiCall,
      trackError,
      updateMemoryUsage
    }
  }

  // Optimized fetch hook with retry and caching
  const useOptimizedFetch = () => {
    const [state, setState] = useState<{
      loading: boolean
      error: any
      data: any
    }>({
      loading: false,
      error: null,
      data: null
    })

    const executeWithCache = useCallback(async (key, fetcher, options = {}) => {
      const {
        retries = 3,
        retryDelay = 1000,
        ttl = 300000,
        staleWhileRevalidate = false,
        ...options
      } = options

      try {
        setState(prev => ({ ...prev, loading: true, error: null }))

        // Try to get from cache
        const cached = await cacheManager?.get(key)
        if (cached && !options.skipCache) {
          setState({
            loading: false,
            error: null,
            data: cached
          })
          return cached
        }

        // Fetch with retry logic
        let lastError: any = null
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            const data = await fetcher()

            // Store in cache on success
            await cacheManager?.set(key, data, ttl)

            setState({
              loading: false,
              error: null,
              data
            })
            return data
          } catch (error) {
            lastError = error

            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
            } else {
              break
            }
          }
        }

        // If all retries failed, throw the last error
        if (lastError) {
          throw lastError
        }
      } catch (error) {
        setState({
          loading: false,
          error,
          data: null
        })
        throw error
      }
    }

    // Batch operations hook
    const useBatchOperations = () => {
      const [batch, setBatch] = useState<{
        operations: Array<() => Promise<any>>
        executing: boolean
      }>({
        operations: [],
        executing: false
      })

      const addOperation = useCallback((operation) => {
        setBatch(prev => ({
          operations: [...prev.operations, operation]
        }))
      }, [])

      const executeBatch = useCallback(async () => {
        if (batch.executing || batch.operations.length === 0) return

        setBatch(prev => ({ ...prev, executing: true }))

        try {
          const results = await Promise.allSettled(batch.operations.map(op => op()))
          setBatch({
            operations: [],
            executing: false
          })
          return results
        } catch (error) {
          setBatch({
            operations: [],
            executing: false
          })
          throw error
        }
      }, [batch.executing, batch.operations])

      return {
        addOperation,
        executeBatch,
        clearBatch: () => setBatch({ operations: [], executing: false })
      }
    }

  // Smart pagination hook
  const useSmartPagination = (fetchKey, fetcher, options = {}) => {
    const [page, setPage] = useState(1)
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(true)

    const loadMore = useCallback(async () => {
      if (loading || !hasMore) return

      setLoading(true)

      try {
        const nextPage = page + 1
        const cacheKey = `${fetchKey}_page_${nextPage}`

        const cached = await cacheManager?.get(cacheKey)
        let newData

        if (cached) {
          newData = cached
        } else {
          const result = await fetcher(nextPage, options)
          newData = result.data || []
          await cacheManager?.set(cacheKey, {
            data: newData,
            timestamp: Date.now()
          }, 600000) // Cache for 10 minutes
        }

        const combinedData = page === 1 ? newData : [...data, ...newData]
        setData(combinedData)
        setPage(nextPage)
        setHasMore(newData.length >= (options.pageSize || 20))

        return newData
      } catch (error) {
        console.error('Pagination load error:', error)
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    }, [fetchKey, fetcher, loading, hasMore, page])

    const resetPagination = useCallback(() => {
      setPage(1)
      setData([])
      setHasMore(true)
    }, [page, setData, setHasMore])

    return {
      data,
      loading,
      loadMore,
      resetPagination,
      hasMore,
      page
    }
  }

  // Background sync hook
  const useBackgroundSync = (syncKey, fetcher, interval = 60000) => {
    const [lastSync, setLastSync] = useState(null)
    const [syncing, setSyncing] = useState(false)

    useEffect(() => {
      const syncData = async () => {
        try {
          setSyncing(true)
          const data = await fetcher()

          await cacheManager.set(syncKey, {
            data,
            timestamp: Date.now()
          }, 3600000) // Cache for 1 hour

          setLastSync(Date.now())
        } catch (error) {
          console.error('Background sync error:', error)
        } finally {
          setSyncing(false)
        }
      }

      const interval = setInterval(() => {
        if (document.hidden) return // Don't sync if tab is hidden

        // Only sync if it's been more than interval since last sync
        if (!lastSync || Date.now() - lastSync.getTime() >= interval) {
          syncData()
        }
      }, interval)

      return () => clearInterval(interval)
    }, [syncKey, fetcher, interval, lastSync, syncing])

    return {
      lastSync,
      syncing,
      forceSync: syncData
    }
  }

export {
  useCache,
  fetchWithCache,
  invalidateCache,
  prefetchData,
  getCachedData,
  setCachedData,
  useAutoInvalidate,
  usePerformanceMonitor,
  useOptimizedFetch,
  useBatchOperations,
  useSmartPagination,
  useBackgroundSync
}