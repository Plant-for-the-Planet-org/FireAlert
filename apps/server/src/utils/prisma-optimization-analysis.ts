/**
 * Prisma Optimization Analysis
 * Analyzes and optimizes Prisma client configuration for performance
 */

import {PrismaClient} from '@prisma/client';
import {logger} from '../server/logger';

export interface PrismaOptimizationReport {
  connectionPooling: {
    maxConnections: number;
    timeout: number;
    poolSize: number;
    recommendations: string[];
  };
  preparedStatements: {
    enabled: boolean;
    cacheSize: number;
    recommendations: string[];
  };
  queryOptimization: {
    batchingEnabled: boolean;
    transactionMode: string;
    recommendations: string[];
  };
  performance: {
    avgQueryTime: number;
    slowQueries: Array<{
      query: string;
      duration: number;
      frequency: number;
    }>;
    recommendations: string[];
  };
}

interface QueryMetric {
  query: string;
  durations: number[];
  count: number;
  lastExecuted: Date;
}

/**
 * Analyzes Prisma configuration and provides optimization recommendations
 */
export class PrismaOptimizationAnalyzer {
  private queryMetrics = new Map<string, QueryMetric>();
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Analyzes current Prisma configuration and performance
   */
  async analyzeConfiguration(): Promise<PrismaOptimizationReport> {
    const report: PrismaOptimizationReport = {
      connectionPooling: await this.analyzeConnectionPooling(),
      preparedStatements: await this.analyzePreparedStatements(),
      queryOptimization: await this.analyzeQueryOptimization(),
      performance: await this.analyzePerformance(),
    };

    logger('Prisma optimization analysis completed', 'info', report);
    return report;
  }

  /**
   * Records query execution metrics for analysis
   */
  recordQuery(query: string, duration: number): void {
    const normalizedQuery = this.normalizeQuery(query);
    const existing = this.queryMetrics.get(normalizedQuery);

    if (existing) {
      existing.durations.push(duration);
      existing.count++;
      existing.lastExecuted = new Date();
    } else {
      this.queryMetrics.set(normalizedQuery, {
        query: normalizedQuery,
        durations: [duration],
        count: 1,
        lastExecuted: new Date(),
      });
    }
  }

  /**
   * Gets query performance statistics
   */
  getQueryStats(): Array<{
    query: string;
    avgDuration: number;
    maxDuration: number;
    count: number;
    totalTime: number;
  }> {
    return Array.from(this.queryMetrics.values()).map(metric => ({
      query: metric.query,
      avgDuration:
        metric.durations.reduce((sum, d) => sum + d, 0) /
        metric.durations.length,
      maxDuration: Math.max(...metric.durations),
      count: metric.count,
      totalTime: metric.durations.reduce((sum, d) => sum + d, 0),
    }));
  }

  /**
   * Clears recorded metrics
   */
  clearMetrics(): void {
    this.queryMetrics.clear();
  }

  private async analyzeConnectionPooling(): Promise<
    PrismaOptimizationReport['connectionPooling']
  > {
    const recommendations: string[] = [];

    // Check database URL for connection pool settings
    const databaseUrl = process.env.DATABASE_URL || '';
    const poolSizeMatch = databaseUrl.match(/connection_limit=(\d+)/);
    const timeoutMatch = databaseUrl.match(/pool_timeout=(\d+)/);

    const poolSize = poolSizeMatch ? parseInt(poolSizeMatch[1]) : 10; // Default Prisma pool size
    const timeout = timeoutMatch ? parseInt(timeoutMatch[1]) : 10; // Default timeout

    // Analyze connection pool configuration
    if (poolSize < 5) {
      recommendations.push(
        'Consider increasing connection pool size to at least 5 for better concurrency',
      );
    } else if (poolSize > 20) {
      recommendations.push(
        'Connection pool size >20 may cause resource contention. Consider reducing.',
      );
    }

    if (timeout < 5) {
      recommendations.push(
        'Pool timeout <5 seconds may cause connection errors under load',
      );
    }

    // Check for connection pooling best practices
    if (
      !databaseUrl.includes('pgbouncer') &&
      !databaseUrl.includes('connection_limit')
    ) {
      recommendations.push(
        'Consider using connection pooling (PgBouncer) for production workloads',
      );
    }

    return {
      maxConnections: poolSize,
      timeout,
      poolSize,
      recommendations,
    };
  }

  private async analyzePreparedStatements(): Promise<
    PrismaOptimizationReport['preparedStatements']
  > {
    const recommendations: string[] = [];

    // Prisma automatically uses prepared statements for parameterized queries
    const preparedStatementsEnabled = true;
    const cacheSize = 100; // Prisma's default prepared statement cache size

    // Check if we're using raw queries that might not benefit from prepared statements
    const queryStats = this.getQueryStats();
    const rawQueryCount = queryStats.filter(
      stat =>
        stat.query.includes('$executeRaw') || stat.query.includes('$queryRaw'),
    ).length;

    if (rawQueryCount > 0) {
      recommendations.push(
        `Found ${rawQueryCount} raw queries. Consider using Prisma's type-safe queries where possible for better prepared statement usage.`,
      );
    }

    // Check for repeated queries that would benefit from prepared statements
    const repeatedQueries = queryStats.filter(stat => stat.count > 10);
    if (repeatedQueries.length > 0) {
      recommendations.push(
        `Found ${repeatedQueries.length} frequently executed queries. These benefit from prepared statements.`,
      );
    }

    return {
      enabled: preparedStatementsEnabled,
      cacheSize,
      recommendations,
    };
  }

  private async analyzeQueryOptimization(): Promise<
    PrismaOptimizationReport['queryOptimization']
  > {
    const recommendations: string[] = [];

    // Check if batching is being used effectively
    const queryStats = this.getQueryStats();
    const batchableQueries = queryStats.filter(
      stat =>
        stat.query.includes('createMany') ||
        stat.query.includes('updateMany') ||
        stat.query.includes('deleteMany'),
    );

    const batchingEnabled = batchableQueries.length > 0;

    if (!batchingEnabled) {
      recommendations.push(
        'Consider using batch operations (createMany, updateMany) for bulk operations',
      );
    }

    // Check transaction usage
    const transactionQueries = queryStats.filter(stat =>
      stat.query.includes('$transaction'),
    );
    const transactionMode = transactionQueries.length > 0 ? 'explicit' : 'auto';

    if (transactionQueries.length === 0) {
      recommendations.push(
        'Consider using explicit transactions for related operations to improve consistency',
      );
    }

    // Check for N+1 query patterns
    const singleRecordQueries = queryStats.filter(
      stat =>
        stat.count > 50 &&
        (stat.query.includes('findUnique') || stat.query.includes('findFirst')),
    );

    if (singleRecordQueries.length > 0) {
      recommendations.push(
        `Found ${singleRecordQueries.length} potentially N+1 query patterns. Consider using include/select or findMany with filtering.`,
      );
    }

    return {
      batchingEnabled,
      transactionMode,
      recommendations,
    };
  }

  private async analyzePerformance(): Promise<
    PrismaOptimizationReport['performance']
  > {
    const recommendations: string[] = [];
    const queryStats = this.getQueryStats();

    if (queryStats.length === 0) {
      return {
        avgQueryTime: 0,
        slowQueries: [],
        recommendations: [
          'No query metrics available. Start recording queries to analyze performance.',
        ],
      };
    }

    // Calculate average query time
    const totalTime = queryStats.reduce((sum, stat) => sum + stat.totalTime, 0);
    const totalQueries = queryStats.reduce((sum, stat) => sum + stat.count, 0);
    const avgQueryTime = totalTime / totalQueries;

    // Identify slow queries (>1000ms average)
    const slowQueries = queryStats
      .filter(stat => stat.avgDuration > 1000)
      .map(stat => ({
        query: stat.query,
        duration: stat.avgDuration,
        frequency: stat.count,
      }))
      .sort((a, b) => b.duration - a.duration);

    // Generate recommendations
    if (avgQueryTime > 500) {
      recommendations.push(
        `Average query time is ${avgQueryTime.toFixed(
          2,
        )}ms. Consider optimizing slow queries.`,
      );
    }

    if (slowQueries.length > 0) {
      recommendations.push(
        `Found ${slowQueries.length} slow queries (>1000ms). Review indexes and query structure.`,
      );
    }

    // Check for queries that might benefit from indexes
    const spatialQueries = queryStats.filter(
      stat => stat.query.includes('ST_') || stat.query.includes('geometry'),
    );

    if (spatialQueries.length > 0) {
      recommendations.push(
        'Spatial queries detected. Ensure GIST indexes are present on geometry columns.',
      );
    }

    // Check for full table scans
    const potentialScans = queryStats.filter(
      stat =>
        stat.avgDuration > 2000 &&
        !stat.query.includes('WHERE') &&
        !stat.query.includes('LIMIT'),
    );

    if (potentialScans.length > 0) {
      recommendations.push(
        `Found ${potentialScans.length} queries that might be doing full table scans.`,
      );
    }

    return {
      avgQueryTime,
      slowQueries,
      recommendations,
    };
  }

  private normalizeQuery(query: string): string {
    // Remove parameter values and normalize for grouping
    return query
      .replace(/\$\d+/g, '$?') // Replace parameter placeholders
      .replace(/\d+/g, 'N') // Replace numbers with N
      .replace(/['"][^'"]*['"]/g, "'?'") // Replace string literals
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Creates an optimized Prisma client with recommended settings
   */
  static createOptimizedClient(): PrismaClient {
    return new PrismaClient({
      log: [
        {emit: 'event', level: 'query'},
        {emit: 'event', level: 'error'},
        {emit: 'event', level: 'warn'},
      ],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  /**
   * Sets up query logging for performance analysis
   */
  static setupQueryLogging(
    prisma: PrismaClient,
    analyzer: PrismaOptimizationAnalyzer,
  ): void {
    prisma.$on('query', e => {
      analyzer.recordQuery(e.query, e.duration);

      // Log slow queries
      if (e.duration > 1000) {
        logger(`Slow query detected: ${e.duration}ms - ${e.query}`, 'warn');
      }
    });

    prisma.$on('error', e => {
      logger(`Prisma error: ${e.message}`, 'error');
    });
  }
}

/**
 * Utility functions for Prisma optimization
 */
export const PrismaOptimizationUtils = {
  /**
   * Analyzes database indexes and provides recommendations
   */
  async analyzeIndexes(prisma: PrismaClient): Promise<{
    existingIndexes: Array<{table: string; index: string; definition: string}>;
    recommendations: string[];
  }> {
    const recommendations: string[] = [];

    try {
      // Query existing indexes
      const indexes = await prisma.$queryRaw<
        Array<{
          tablename: string;
          indexname: string;
          indexdef: string;
        }>
      >`
        SELECT tablename, indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename IN ('Site', 'GeoEvent', 'GeoEventProvider', 'SiteAlert')
        ORDER BY tablename, indexname
      `;

      const existingIndexes = indexes.map(idx => ({
        table: idx.tablename,
        index: idx.indexname,
        definition: idx.indexdef,
      }));

      // Check for recommended indexes
      const hasGeoEventProviderIndex = indexes.some(
        idx =>
          idx.tablename === 'GeoEvent' &&
          idx.indexdef.includes('geoEventProviderId'),
      );

      const hasEventDateIndex = indexes.some(
        idx =>
          idx.tablename === 'GeoEvent' && idx.indexdef.includes('eventDate'),
      );

      const hasSpatialIndex = indexes.some(
        idx => idx.tablename === 'Site' && idx.indexdef.includes('GIST'),
      );

      if (!hasGeoEventProviderIndex) {
        recommendations.push(
          'Add index on GeoEvent.geoEventProviderId for faster provider queries',
        );
      }

      if (!hasEventDateIndex) {
        recommendations.push(
          'Add index on GeoEvent.eventDate for faster time-based queries',
        );
      }

      if (!hasSpatialIndex) {
        recommendations.push(
          'Add GIST index on Site.detectionGeometry for spatial queries',
        );
      }

      return {existingIndexes, recommendations};
    } catch (error) {
      logger(`Error analyzing indexes: ${error}`, 'error');
      return {
        existingIndexes: [],
        recommendations: [
          'Unable to analyze indexes. Check database connection.',
        ],
      };
    }
  },

  /**
   * Checks database configuration for performance
   */
  async checkDatabaseConfig(prisma: PrismaClient): Promise<{
    settings: Record<string, string>;
    recommendations: string[];
  }> {
    const recommendations: string[] = [];

    try {
      // Query important PostgreSQL settings
      const settings = await prisma.$queryRaw<
        Array<{
          name: string;
          setting: string;
        }>
      >`
        SELECT name, setting 
        FROM pg_settings 
        WHERE name IN (
          'shared_buffers',
          'effective_cache_size',
          'work_mem',
          'maintenance_work_mem',
          'max_connections',
          'random_page_cost'
        )
      `;

      const settingsMap = settings.reduce((acc, s) => {
        acc[s.name] = s.setting;
        return acc;
      }, {} as Record<string, string>);

      // Analyze settings and provide recommendations
      const sharedBuffers = parseInt(settingsMap.shared_buffers || '0');
      const maxConnections = parseInt(settingsMap.max_connections || '0');

      if (sharedBuffers < 128 * 1024) {
        // Less than 128MB
        recommendations.push(
          'Consider increasing shared_buffers to 25% of available RAM',
        );
      }

      if (maxConnections > 200) {
        recommendations.push(
          'High max_connections may impact performance. Consider connection pooling.',
        );
      }

      return {settings: settingsMap, recommendations};
    } catch (error) {
      logger(`Error checking database config: ${error}`, 'error');
      return {
        settings: {},
        recommendations: [
          'Unable to check database configuration. Check permissions.',
        ],
      };
    }
  },
};
