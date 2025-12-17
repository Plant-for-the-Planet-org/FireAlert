/**
 * Site Data Caching Utility
 * Optional in-memory cache for Site geometries to reduce database queries
 * Only use if profiling shows Site queries are a bottleneck
 */

import {logger} from '../server/logger';

export interface CachedSite {
  id: string;
  detectionGeometry: any; // PostGIS geometry
  detectionRadius: number;
  isActive: boolean;
  cachedAt: Date;
}

export interface SiteCacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  totalRequests: number;
  hitRate: number;
  cacheSize: number;
  memoryUsageMB: number;
}

/**
 * In-memory cache for Site data with TTL and LRU eviction
 */
export class SiteCache {
  private cache = new Map<string, CachedSite>();
  private accessOrder = new Map<string, number>(); // Track access order for LRU
  private accessCounter = 0;
  private metrics: Omit<SiteCacheMetrics, 'hitRate' | 'memoryUsageMB'> = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRequests: 0,
    cacheSize: 0,
  };

  constructor(
    private readonly ttlMs: number = 5 * 60 * 1000, // 5 minutes default
    private readonly maxSize: number = 1000, // Max 1000 sites in cache
  ) {}

  /**
   * Gets a site from cache or returns null if not found/expired
   */
  get(siteId: string): CachedSite | null {
    this.metrics.totalRequests++;

    const cached = this.cache.get(siteId);
    if (!cached) {
      this.metrics.misses++;
      return null;
    }

    // Check if expired
    const now = new Date();
    const ageMs = now.getTime() - cached.cachedAt.getTime();
    if (ageMs > this.ttlMs) {
      this.cache.delete(siteId);
      this.accessOrder.delete(siteId);
      this.metrics.misses++;
      this.metrics.evictions++;
      return null;
    }

    // Update access order for LRU
    this.accessOrder.set(siteId, ++this.accessCounter);
    this.metrics.hits++;

    return cached;
  }

  /**
   * Stores a site in the cache
   */
  set(site: CachedSite): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(site.id)) {
      this.evictOldest();
    }

    // Store the site
    this.cache.set(site.id, {
      ...site,
      cachedAt: new Date(),
    });

    this.accessOrder.set(site.id, ++this.accessCounter);
    this.metrics.cacheSize = this.cache.size;
  }

  /**
   * Gets multiple sites from cache, returns Map with found sites
   */
  getMultiple(siteIds: string[]): Map<string, CachedSite> {
    const result = new Map<string, CachedSite>();

    for (const siteId of siteIds) {
      const cached = this.get(siteId);
      if (cached) {
        result.set(siteId, cached);
      }
    }

    return result;
  }

  /**
   * Stores multiple sites in cache
   */
  setMultiple(sites: CachedSite[]): void {
    for (const site of sites) {
      this.set(site);
    }
  }

  /**
   * Removes a site from cache
   */
  delete(siteId: string): boolean {
    const deleted = this.cache.delete(siteId);
    if (deleted) {
      this.accessOrder.delete(siteId);
      this.metrics.cacheSize = this.cache.size;
    }
    return deleted;
  }

  /**
   * Clears all cached sites
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.metrics.cacheSize = 0;
    this.metrics.evictions += this.cache.size;
  }

  /**
   * Gets cache performance metrics
   */
  getMetrics(): SiteCacheMetrics {
    const hitRate =
      this.metrics.totalRequests > 0
        ? (this.metrics.hits / this.metrics.totalRequests) * 100
        : 0;

    const memoryUsageMB = this.estimateMemoryUsage();

    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsageMB: Math.round(memoryUsageMB * 100) / 100,
    };
  }

  /**
   * Resets cache metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0,
      cacheSize: this.cache.size,
    };
  }

  /**
   * Checks if caching is effective (hit rate > 50%)
   */
  isEffective(): boolean {
    const metrics = this.getMetrics();
    return metrics.totalRequests > 100 && metrics.hitRate > 50;
  }

  /**
   * Gets cache status for monitoring
   */
  getStatus(): {
    enabled: boolean;
    effective: boolean;
    metrics: SiteCacheMetrics;
    recommendations: string[];
  } {
    const metrics = this.getMetrics();
    const effective = this.isEffective();
    const recommendations: string[] = [];

    if (metrics.totalRequests > 100) {
      if (metrics.hitRate < 30) {
        recommendations.push(
          'Low hit rate (<30%). Consider disabling cache or increasing TTL.',
        );
      } else if (metrics.hitRate > 80) {
        recommendations.push('High hit rate (>80%). Cache is very effective.');
      }
    }

    if (metrics.memoryUsageMB > 50) {
      recommendations.push(
        'High memory usage (>50MB). Consider reducing cache size.',
      );
    }

    if (metrics.evictions > metrics.hits) {
      recommendations.push(
        'High eviction rate. Consider increasing cache size or reducing TTL.',
      );
    }

    return {
      enabled: true,
      effective,
      metrics,
      recommendations,
    };
  }

  private evictOldest(): void {
    if (this.accessOrder.size === 0) return;

    // Find the entry with the smallest access counter (oldest)
    let oldestId = '';
    let oldestAccess = Infinity;

    for (const [siteId, accessTime] of this.accessOrder) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestId = siteId;
      }
    }

    if (oldestId) {
      this.cache.delete(oldestId);
      this.accessOrder.delete(oldestId);
      this.metrics.evictions++;
      this.metrics.cacheSize = this.cache.size;
    }
  }

  private estimateMemoryUsage(): number {
    // Rough estimation: each cached site ~1KB (geometry can be large)
    const avgSizeKB = 1;
    return (this.cache.size * avgSizeKB) / 1024; // Convert to MB
  }
}

/**
 * Site Cache Manager - Singleton pattern for global cache instance
 */
export class SiteCacheManager {
  private static instance: SiteCache | null = null;
  private static enabled = false;

  /**
   * Enables site caching with optional configuration
   */
  static enable(ttlMs = 5 * 60 * 1000, maxSize = 1000): void {
    if (!this.instance) {
      this.instance = new SiteCache(ttlMs, maxSize);
      this.enabled = true;
      logger('Site caching enabled', 'info', {ttlMs, maxSize});
    }
  }

  /**
   * Disables site caching
   */
  static disable(): void {
    if (this.instance) {
      const metrics = this.instance.getMetrics();
      this.instance.clear();
      this.instance = null;
      this.enabled = false;
      logger('Site caching disabled', 'info', {finalMetrics: metrics});
    }
  }

  /**
   * Gets the cache instance (null if disabled)
   */
  static getInstance(): SiteCache | null {
    return this.enabled ? this.instance : null;
  }

  /**
   * Checks if caching is enabled
   */
  static isEnabled(): boolean {
    return this.enabled && this.instance !== null;
  }

  /**
   * Gets cache metrics (returns null if disabled)
   */
  static getMetrics(): SiteCacheMetrics | null {
    return this.instance ? this.instance.getMetrics() : null;
  }

  /**
   * Auto-configures caching based on environment
   */
  static autoConfig(): void {
    const nodeEnv = process.env.NODE_ENV;
    const enableCache = process.env.ENABLE_SITE_CACHE === 'true';

    if (enableCache) {
      const ttl = parseInt(process.env.SITE_CACHE_TTL_MS || '300000'); // 5 minutes
      const maxSize = parseInt(process.env.SITE_CACHE_MAX_SIZE || '1000');

      this.enable(ttl, maxSize);
      logger('Site cache auto-configured', 'info', {nodeEnv, ttl, maxSize});
    } else {
      logger('Site cache disabled by configuration', 'debug', {nodeEnv});
    }
  }
}

// Auto-configure on module load
SiteCacheManager.autoConfig();
