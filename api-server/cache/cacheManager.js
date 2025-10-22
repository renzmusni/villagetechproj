// Advanced Caching and Performance Optimization System

const crypto = require('crypto');

// In-memory cache fallback (for development)
class MemoryCache {
  constructor(maxSize = 1000, ttl = 300000) { // 5 minutes default TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.timers = new Map();
  }

  set(key, value, customTtl) {
    // LRU: If at capacity, remove oldest item
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.delete(oldestKey);
    }

    const itemTtl = customTtl || this.ttl;
    const expiry = Date.now() + itemTtl;

    this.cache.set(key, { value, expiry });

    // Set expiry timer
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.timers.set(key, setTimeout(() => {
      this.delete(key);
    }, itemTtl));
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key) {
    this.cache.delete(key);
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  clear() {
    this.cache.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }

  has(key) {
    const item = this.cache.get(key);
    return item && Date.now() <= item.expiry;
  }

  size() {
    return this.cache.size;
  }

  keys() {
    return this.cache.keys();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      type: 'memory'
    };
  }
}

// Redis cache implementation (for production)
class RedisCache {
  constructor(redis, options = {}) {
    this.redis = redis;
    this.prefix = options.prefix || 'hoa_cache:';
    this.defaultTtl = options.defaultTtl || 300; // 5 minutes
    this.keyPattern = options.keyPattern || null;
  }

  async set(key, value, ttl = this.defaultTtl) {
    try {
      const cacheKey = this.getCacheKey(key);
      const serializedValue = JSON.stringify({
        data: value,
        timestamp: Date.now(),
        version: 1
      });

      await this.redis.setex(cacheKey, ttl, serializedValue);
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  async get(key) {
    try {
      const cacheKey = this.getCacheKey(key);
      const cached = await this.redis.get(cacheKey);

      if (!cached) {
        return null;
      }

      const parsed = JSON.parse(cached);

      // Check for version compatibility
      if (parsed.version !== 1) {
        await this.delete(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async delete(key) {
    try {
      const cacheKey = this.getCacheKey(key);
      await this.redis.del(cacheKey);
      return true;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }

  async clear(pattern = null) {
    try {
      if (pattern) {
        const keys = await this.redis.keys(`${this.prefix}${pattern}`);
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
      } else {
        // Clear all keys with our prefix
        const keys = await this.redis.keys(`${this.prefix}*`);
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
      }
      return true;
    } catch (error) {
      console.error('Redis clear error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      const cacheKey = this.getCacheKey(key);
      const exists = await this.redis.exists(cacheKey);
      return exists === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  getCacheKey(key) {
    if (this.keyPattern) {
      key = this.keyPattern.replace('{key}', key);
    }
    return `${this.prefix}${key}`;
  }

  async getStats() {
    try {
      const info = await this.redis.info('memory');
      const keys = await this.redis.keys(`${this.prefix}*`);

      return {
        size: keys.length,
        memory: info,
        prefix: this.prefix,
        ttl: this.defaultTtl,
        type: 'redis'
      };
    } catch (error) {
      return { type: 'redis', error: error.message };
    }
  }
}

// Cache Manager with multiple cache backends
class CacheManager {
  constructor(options = {}) {
    this.options = {
      defaultTtl: options.defaultTtl || 300000, // 5 minutes
      maxSize: options.maxSize || 1000,
      enableRedis: options.enableRedis !== false, // Default to true
      redisUrl: options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      redis: null,
      ...options
    };

    this.cache = null;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      clears: 0,
      errors: 0
    };

    this.initializeCache();
  }

  initializeCache() {
    try {
      if (this.options.enableRedis) {
        // Try to initialize Redis
        const Redis = require('redis');
        const { createClient } = Redis;

        this.options.redis = createClient({ url: this.options.redisUrl });

        this.options.redis.on('error', (error) => {
          console.error('Redis connection error:', error);
          this.options.redis = null;
          this.fallbackToMemoryCache();
        });

        this.options.redis.on('connect', () => {
          console.log('✅ Redis cache connected');
          this.cache = new RedisCache(this.options.redis, this.options);
        });

        this.options.redis.connect();
      } else {
        throw new Error('Redis disabled in options');
      }
    } catch (error) {
      console.warn('⚠️ Redis not available, falling back to memory cache:', error.message);
      this.fallbackToMemoryCache();
    }
  }

  fallbackToMemoryCache() {
    this.cache = new MemoryCache(this.options.maxSize, this.options.defaultTtl);
    console.log('📦 Using in-memory cache');
  }

  async get(key) {
    try {
      const result = await this.cache.get(key);
      if (result !== null) {
        this.stats.hits++;
      } else {
        this.stats.misses++;
      }
      return result;
    } catch (error) {
      this.stats.errors++;
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.options.defaultTtl) {
    try {
      const success = await this.cache.set(key, value, ttl);
      if (success) {
        this.stats.sets++;
      } else {
        this.stats.errors++;
      }
      return success;
    } catch (error) {
      this.stats.errors++;
      console.error('Cache set error:', error);
      return false;
    }
  }

  async delete(key) {
    try {
      const success = await this.cache.delete(key);
      if (success) {
        this.stats.deletes++;
      } else {
        this.stats.errors++;
      }
      return success;
    } catch (error) {
      this.stats.errors++;
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async clear(pattern = null) {
    try {
      const success = await this.cache.clear(pattern);
      if (success) {
        this.stats.clears++;
      } else {
        this.stats.errors++;
      }
      return success;
    } catch (error) {
      this.stats.errors++;
      console.error('Cache clear error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      const exists = await this.cache.exists(key);
      this.stats.hits++;
      return exists;
    } catch (error) {
      this.stats.errors++;
      console.error('Cache exists error:', error);
      return false;
    }
  }

  // Generate cache keys with consistency
  generateKey(prefix, identifier, params = {}) {
    const hash = crypto
      .createHash('md5')
      .update(`${prefix}:${identifier}:${JSON.stringify(params)}`)
      .digest('hex');
    return hash;
  }

  // Key generation for different entity types
  keys = {
    user: (id, params = {}) => this.generateKey('user', id, params),
    household: (id, params = {}) => this.generateKey('household', id, params),
    vehicle: (id, params = {}) => this.generateKey('vehicle', id, params),
    delivery: (id, params = {}) => this.generateKey('delivery', id, params),
    securityIncident: (id, params = {}) => this.generateKey('security_incident', id, params),
    announcement: (id, params = {}) => this.generateKey('announcement', id, params),
    payment: (id, params = {}) => this.generateKey('payment', id, params),
    statistics: (type, params = {}) => this.generateKey('stats', type, params),
    permissions: (userId, params = {}) => this.generateKey('permissions', userId, params),
    settings: (type, params = {}) => this.generateKey('settings', type, params),
    search: (query, params = {}) => this.generateKey('search', query, params),
    rateLimit: (identifier, params = {}) => this.generateKey('rate_limit', identifier, params)
  };

  // Cache invalidation patterns
  invalidate = {
    user: (userId) => this.clear(`user:${userId}*`),
    household: (householdId) => this.clear(`household:${householdId}*`),
    tenant: (tenantId) => this.clear(`tenant:${tenantId}*`),
    vehicle: (vehicleId) => this.clear(`vehicle:${vehicleId}*`),
    delivery: (deliveryId) => this.clear(`delivery:${deliveryId}*`),
    securityIncident: (incidentId) => this.clear(`security_incident:${incidentId}*`),
    announcement: (announcementId) => this.clear(`announcement:${announcementId}*`),
    statistics: (type) => this.clear(`stats:${type}*`),
    permissions: (userId) => this.clear(`permissions:${userId}*`),
    settings: (type) => this.clear(`settings:${type}*`),
    search: (query) => this.clear(`search:*`),
    all: () => this.clear()
  };

  async getStats() {
    const cacheStats = await this.cache.getStats();
    return {
      ...this.stats,
      cache: cacheStats,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
        : '0.00'
    };
  }

  async healthCheck() {
    try {
      const testKey = this.keys.search('health_check');
      const testValue = { timestamp: Date.now() };

      const setSuccess = await this.set(testKey, testValue, 5000); // 5 seconds
      const retrievedValue = await this.get(testKey);

      const isHealthy = setSuccess &&
                       retrievedValue &&
                       retrievedValue.timestamp === testValue.timestamp;

      await this.delete(testKey);

      return {
        healthy: isHealthy,
        message: isHealthy ? 'Cache is healthy' : 'Cache health check failed',
        responseTime: Date.now() - testValue.timestamp
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Cache health check error: ${error.message}`,
        error
      };
    }
  }

  // Warm up cache with common data
  async warmup(dataLoaders = {}) {
    console.log('🔥 Warming up cache...');

    try {
      const promises = [];

      // Common warmup data
      if (dataLoaders.users) {
        promises.push(this.warmupData('users', dataLoaders.users));
      }

      if (dataLoaders.settings) {
        promises.push(this.warmupData('settings', dataLoaders.settings));
      }

      if (dataLoaders.statistics) {
        promises.push(this.warmupData('statistics', dataLoaders.statistics));
      }

      await Promise.allSettled(promises);
      console.log('✅ Cache warmup completed');
    } catch (error) {
      console.error('❌ Cache warmup failed:', error);
    }
  }

  async warmupData(type, loader) {
    try {
      const data = await loader();
      if (Array.isArray(data)) {
        for (const item of data) {
          const key = this.keys[type](item.id);
          await this.set(key, item, this.options.defaultTtl * 2); // Longer TTL for warmup data
        }
      }
    } catch (error) {
      console.error(`Failed to warmup ${type}:`, error);
    }
  }
}

// Singleton instance
let cacheInstance = null;

const getCacheManager = (options = {}) => {
  if (!cacheInstance) {
    cacheInstance = new CacheManager(options);
  }
  return cacheInstance;
};

// Middleware for caching API responses
const cacheMiddleware = (options = {}) => {
  const cache = getCacheManager();
  const {
    ttl = 60000, // 10 minutes default
    keyGenerator = null,
    condition = null,
    skipCache = false,
    invalidateOnMutation = false
  } = options;

  return async (req, res, next) => {
    // Skip caching for specific requests
    if (skipCache ||
        req.method !== 'GET' ||
        req.headers['cache-control']?.includes('no-cache') ||
        req.query?.no_cache === 'true') {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : cache.generateKey('api', `${req.method}:${req.originalUrl}`, {
          query: req.query,
          user: req.user?.id,
          tenant: req.user?.tenantId
        });

    // Check cache
    const cached = await cache.get(cacheKey);
    if (cached && condition && condition(cached, req)) {
      // Add cache header
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Age', Math.floor((Date.now() - cached.timestamp) / 1000));
      return res.json(cached.data);
    }

    // Continue to process request
    const originalJson = res.json;
    const originalEnd = res.end;

    // Intercept response
    const responseData = [];
    let hasEnded = false;

    res.json = (data) => {
      if (hasEnded) return;

      responseData.push(data);

      // Cache the response if successful GET request
      if (req.method === 'GET' && res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, {
          data,
          statusCode: res.statusCode,
          headers: res.getHeaders()
        }, ttl).catch(error => {
          console.error('Cache set error:', error);
        });
      }

      originalJson.call(res, data);
      hasEnded = true;
    };

    res.end = (data) => {
      if (hasEnded) return;

      originalEnd.call(res, data);
      hasEnded = true;
    };

    // Add cache miss header
    res.setHeader('X-Cache', 'MISS');

    next();
  };
};

module.exports = {
  CacheManager,
  getCacheManager,
  cacheMiddleware,
  MemoryCache,
  RedisCache
};