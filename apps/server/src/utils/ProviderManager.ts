import {type GeoEventProvider} from '@prisma/client';
import {
  type GeoEventProviderClass,
  type GeoEventProviderConfig,
} from '../Interfaces/GeoEventProvider';
import GeoEventProviderClassRegistry from '../Services/GeoEventProvider/GeoEventProviderClassRegistry';
import {logger} from '../server/logger';

interface CachedProviderConfig {
  config: GeoEventProviderConfig;
  cachedAt: Date;
  accessCount: number;
}

interface ConfigCacheMetrics {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  cacheSize: number;
  avgParseTime: number;
}

/**
 * Consolidated utility for provider management: selection and instantiation.
 * Handles provider shuffling, selection, and factory creation with optional config caching.
 */
export class ProviderManager {
  private configCache = new Map<string, CachedProviderConfig>();
  private parseTimings: number[] = [];
  private cacheMetrics = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
  };

  constructor(
    private readonly enableConfigCache: boolean = process.env
      .ENABLE_PROVIDER_CONFIG_CACHE === 'true',
    private readonly cacheTtlMs: number = parseInt(
      process.env.PROVIDER_CONFIG_CACHE_TTL_MS || '600000',
    ), // 10 minutes
  ) {
    if (this.enableConfigCache) {
      logger('Provider config caching enabled', 'debug', {
        ttlMs: this.cacheTtlMs,
        maxAge: `${this.cacheTtlMs / 60000} minutes`,
      });
    }
  }
  /**
   * Shuffles an array of providers and selects up to the specified limit.
   * Uses Fisher-Yates shuffle algorithm for randomization.
   * @param providers - Array of GeoEventProvider instances
   * @param limit - Maximum number of providers to select
   * @returns Array of randomly selected providers
   */
  selectProviders(
    providers: GeoEventProvider[],
    limit: number,
  ): GeoEventProvider[] {
    // Create a copy to avoid mutating the original array
    const shuffled = [...providers];

    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, limit);
  }

  /**
   * Creates and initializes a provider instance based on the provider configuration.
   * OPTIMIZATION: Caches parsed configs to avoid re-parsing JSON on every request.
   * @param provider - The GeoEventProvider database record
   * @returns Initialized GeoEventProviderClass instance
   * @throws Error if provider client is not found in registry
   */
  createProvider(provider: GeoEventProvider): GeoEventProviderClass {
    const parsedConfig = this.getOrParseConfig(provider);
    const client = parsedConfig.client;

    // Get the provider class from the registry
    const ProviderClass = GeoEventProviderClassRegistry.get(client);

    // Initialize the provider with the parsed config
    ProviderClass.initialize(parsedConfig);

    return ProviderClass;
  }

  /**
   * Gets cached config or parses and caches it
   * @param provider - The GeoEventProvider database record
   * @returns Parsed configuration
   */
  private getOrParseConfig(provider: GeoEventProvider): GeoEventProviderConfig {
    this.cacheMetrics.totalRequests++;

    if (this.enableConfigCache) {
      const cached = this.configCache.get(provider.id);

      if (cached && this.isCacheValid(cached)) {
        cached.accessCount++;
        this.cacheMetrics.hits++;
        return cached.config;
      }
    }

    // Cache miss or caching disabled - parse config
    this.cacheMetrics.misses++;
    const startTime = Date.now();

    const parsedConfig: GeoEventProviderConfig = JSON.parse(
      JSON.stringify(provider.config),
    );

    const parseTime = Date.now() - startTime;
    this.parseTimings.push(parseTime);

    // Keep only last 100 parse timings for average calculation
    if (this.parseTimings.length > 100) {
      this.parseTimings.shift();
    }

    // Cache the parsed config if caching is enabled
    if (this.enableConfigCache) {
      this.configCache.set(provider.id, {
        config: parsedConfig,
        cachedAt: new Date(),
        accessCount: 1,
      });
    }

    return parsedConfig;
  }

  /**
   * Checks if cached config is still valid (not expired)
   */
  private isCacheValid(cached: CachedProviderConfig): boolean {
    const now = new Date();
    const ageMs = now.getTime() - cached.cachedAt.getTime();
    return ageMs < this.cacheTtlMs;
  }

  /**
   * Invalidates cached config for a specific provider
   */
  invalidateConfig(providerId: string): boolean {
    return this.configCache.delete(providerId);
  }

  /**
   * Clears all cached configs
   */
  clearConfigCache(): void {
    const size = this.configCache.size;
    this.configCache.clear();
    logger(`Cleared provider config cache (${size} entries)`, 'debug');
  }

  /**
   * Gets config cache performance metrics
   */
  getConfigCacheMetrics(): ConfigCacheMetrics {
    const hitRate =
      this.cacheMetrics.totalRequests > 0
        ? (this.cacheMetrics.hits / this.cacheMetrics.totalRequests) * 100
        : 0;

    const avgParseTime =
      this.parseTimings.length > 0
        ? this.parseTimings.reduce((sum, time) => sum + time, 0) /
          this.parseTimings.length
        : 0;

    return {
      hits: this.cacheMetrics.hits,
      misses: this.cacheMetrics.misses,
      totalRequests: this.cacheMetrics.totalRequests,
      hitRate: Math.round(hitRate * 100) / 100,
      cacheSize: this.configCache.size,
      avgParseTime: Math.round(avgParseTime * 100) / 100,
    };
  }

  /**
   * Checks if config caching is effective (hit rate > 60%)
   */
  isConfigCacheEffective(): boolean {
    const metrics = this.getConfigCacheMetrics();
    return metrics.totalRequests > 10 && metrics.hitRate > 60;
  }

  /**
   * Gets cache status and recommendations
   */
  getConfigCacheStatus(): {
    enabled: boolean;
    effective: boolean;
    metrics: ConfigCacheMetrics;
    recommendations: string[];
  } {
    const metrics = this.getConfigCacheMetrics();
    const effective = this.isConfigCacheEffective();
    const recommendations: string[] = [];

    if (this.enableConfigCache) {
      if (metrics.totalRequests > 10) {
        if (metrics.hitRate < 40) {
          recommendations.push(
            'Low hit rate (<40%). Consider increasing TTL or check if configs change frequently.',
          );
        } else if (metrics.hitRate > 80) {
          recommendations.push(
            'High hit rate (>80%). Config caching is very effective.',
          );
        }
      }

      if (metrics.avgParseTime > 10) {
        recommendations.push(
          `Config parsing is slow (${metrics.avgParseTime}ms avg). Caching provides significant benefit.`,
        );
      }
    } else {
      if (metrics.avgParseTime > 5) {
        recommendations.push(
          'Config parsing detected. Consider enabling caching with ENABLE_PROVIDER_CONFIG_CACHE=true',
        );
      }
    }

    return {
      enabled: this.enableConfigCache,
      effective,
      metrics,
      recommendations,
    };
  }

  /**
   * Performs cache maintenance (removes expired entries)
   */
  maintainCache(): number {
    if (!this.enableConfigCache) return 0;

    let removedCount = 0;
    const now = new Date();

    for (const [providerId, cached] of this.configCache.entries()) {
      const ageMs = now.getTime() - cached.cachedAt.getTime();
      if (ageMs >= this.cacheTtlMs) {
        this.configCache.delete(providerId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger(
        `Cache maintenance: removed ${removedCount} expired config entries`,
        'debug',
      );
    }

    return removedCount;
  }
}
