/**
 * Database Index Analysis Script
 * Analyzes existing indexes and identifies missing ones for optimal performance
 */

import {PrismaClient} from '@prisma/client';

export interface IndexAnalysis {
  tableName: string;
  indexName: string;
  indexDef: string;
  columns: string[];
  indexType: string;
  isUnique: boolean;
}

export interface MissingIndex {
  tableName: string;
  columns: string[];
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedImpact: string;
}

/**
 * Analyzes database indexes for performance optimization
 */
export class DatabaseIndexAnalyzer {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get all existing indexes from the database
   */
  async getExistingIndexes(): Promise<IndexAnalysis[]> {
    const query = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;

    const rawIndexes = await this.prisma.$queryRawUnsafe<any[]>(query);

    return rawIndexes.map(index => ({
      tableName: index.tablename,
      indexName: index.indexname,
      indexDef: index.indexdef,
      columns: this.extractColumnsFromIndexDef(index.indexdef),
      indexType: this.extractIndexType(index.indexdef),
      isUnique: index.indexdef.includes('UNIQUE'),
    }));
  }

  /**
   * Analyze critical missing indexes for GeoEvent processing
   */
  async analyzeMissingIndexes(): Promise<MissingIndex[]> {
    const existing = await this.getExistingIndexes();
    const missingIndexes: MissingIndex[] = [];

    // Check for GeoEvent indexes
    const geoEventIndexes = existing.filter(
      idx => idx.tableName === 'GeoEvent',
    );

    if (!this.hasIndex(geoEventIndexes, ['geoEventProviderId'])) {
      missingIndexes.push({
        tableName: 'GeoEvent',
        columns: ['geoEventProviderId'],
        reason: 'Used in fetchExistingIds query for duplicate checking',
        priority: 'HIGH',
        estimatedImpact:
          'Significant improvement in duplicate detection performance',
      });
    }

    if (!this.hasIndex(geoEventIndexes, ['eventDate'])) {
      missingIndexes.push({
        tableName: 'GeoEvent',
        columns: ['eventDate'],
        reason: 'Used in time-based queries (30-hour window)',
        priority: 'HIGH',
        estimatedImpact: 'Faster time-range filtering for duplicate detection',
      });
    }

    if (!this.hasIndex(geoEventIndexes, ['geoEventProviderId', 'eventDate'])) {
      missingIndexes.push({
        tableName: 'GeoEvent',
        columns: ['geoEventProviderId', 'eventDate'],
        reason: 'Composite index for provider + time filtering',
        priority: 'HIGH',
        estimatedImpact: 'Optimal performance for fetchExistingIds query',
      });
    }

    if (!this.hasIndex(geoEventIndexes, ['isProcessed'])) {
      missingIndexes.push({
        tableName: 'GeoEvent',
        columns: ['isProcessed'],
        reason: 'Used in findUnprocessedByProvider query',
        priority: 'MEDIUM',
        estimatedImpact: 'Faster filtering of unprocessed events',
      });
    }

    if (
      !this.hasIndex(geoEventIndexes, ['geoEventProviderId', 'isProcessed'])
    ) {
      missingIndexes.push({
        tableName: 'GeoEvent',
        columns: ['geoEventProviderId', 'isProcessed'],
        reason: 'Composite index for provider + processing status',
        priority: 'HIGH',
        estimatedImpact: 'Optimal performance for alert creation queries',
      });
    }

    // Check for Site indexes (spatial indexes are already present)
    const siteIndexes = existing.filter(idx => idx.tableName === 'Site');

    if (!this.hasIndex(siteIndexes, ['userId'])) {
      missingIndexes.push({
        tableName: 'Site',
        columns: ['userId'],
        reason: 'User-specific site queries',
        priority: 'MEDIUM',
        estimatedImpact: 'Faster user site lookups',
      });
    }

    // Check for SiteAlert indexes
    const siteAlertIndexes = existing.filter(
      idx => idx.tableName === 'SiteAlert',
    );

    if (!this.hasIndex(siteAlertIndexes, ['siteId'])) {
      missingIndexes.push({
        tableName: 'SiteAlert',
        columns: ['siteId'],
        reason: 'Site-specific alert queries',
        priority: 'MEDIUM',
        estimatedImpact: 'Faster site alert lookups',
      });
    }

    return missingIndexes;
  }

  /**
   * Generate SQL statements to create missing indexes
   */
  generateIndexCreationSQL(missingIndexes: MissingIndex[]): string[] {
    return missingIndexes.map(missing => {
      const indexName = `idx_${missing.tableName.toLowerCase()}_${missing.columns
        .join('_')
        .toLowerCase()}`;
      const columns = missing.columns.map(col => `"${col}"`).join(', ');

      return `CREATE INDEX CONCURRENTLY "${indexName}" ON "${missing.tableName}" (${columns});`;
    });
  }

  /**
   * Analyze query performance for critical operations
   */
  async analyzeQueryPerformance(): Promise<any[]> {
    const queries = [
      {
        name: 'fetchExistingIds',
        sql: `
          EXPLAIN ANALYZE 
          SELECT id FROM "GeoEvent" 
          WHERE "geoEventProviderId" = $1 
          AND "eventDate" >= (NOW() - INTERVAL '30 hours')
        `,
        params: ['sample-provider-id'],
      },
      {
        name: 'findUnprocessedByProvider',
        sql: `
          EXPLAIN ANALYZE 
          SELECT * FROM "GeoEvent" 
          WHERE "geoEventProviderId" = $1 
          AND "isProcessed" = false 
          LIMIT 1000
        `,
        params: ['sample-provider-id'],
      },
      {
        name: 'spatialJoinGeostationary',
        sql: `
          EXPLAIN ANALYZE 
          SELECT COUNT(*) FROM "GeoEvent" ge
          CROSS JOIN "Site" s
          WHERE ge.id = ANY($1::text[])
          AND ST_Within(ge.geometry, s."detectionGeometry")
        `,
        params: [['sample-event-id']],
      },
    ];

    const results = [];
    for (const query of queries) {
      try {
        const result = await this.prisma.$queryRawUnsafe(
          query.sql,
          ...query.params,
        );
        results.push({
          queryName: query.name,
          executionPlan: result,
        });
      } catch (error) {
        results.push({
          queryName: query.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Generate comprehensive performance audit report
   */
  async generatePerformanceAuditReport(): Promise<{
    existingIndexes: IndexAnalysis[];
    missingIndexes: MissingIndex[];
    indexCreationSQL: string[];
    queryPerformance: any[];
    recommendations: string[];
  }> {
    const existingIndexes = await this.getExistingIndexes();
    const missingIndexes = await this.analyzeMissingIndexes();
    const indexCreationSQL = this.generateIndexCreationSQL(missingIndexes);
    const queryPerformance = await this.analyzeQueryPerformance();

    const recommendations = [
      'Create composite index on GeoEvent(geoEventProviderId, eventDate) for optimal fetchExistingIds performance',
      'Create index on GeoEvent(geoEventProviderId, isProcessed) for alert creation queries',
      'Monitor query execution times after index creation',
      'Consider partitioning GeoEvent table by eventDate if data volume grows significantly',
      'Verify that spatial indexes on Site.detectionGeometry are using GIST properly',
      'Consider connection pooling optimization in Prisma configuration',
    ];

    return {
      existingIndexes,
      missingIndexes,
      indexCreationSQL,
      queryPerformance,
      recommendations,
    };
  }

  private extractColumnsFromIndexDef(indexDef: string): string[] {
    const match = indexDef.match(/\((.*?)\)/);
    if (!match) return [];

    return match[1]
      .split(',')
      .map(col => col.trim().replace(/"/g, ''))
      .filter(col => col.length > 0);
  }

  private extractIndexType(indexDef: string): string {
    if (indexDef.includes('USING gist')) return 'GIST';
    if (indexDef.includes('USING gin')) return 'GIN';
    if (indexDef.includes('USING hash')) return 'HASH';
    return 'BTREE';
  }

  private hasIndex(indexes: IndexAnalysis[], columns: string[]): boolean {
    return indexes.some(
      idx =>
        idx.columns.length === columns.length &&
        columns.every(col => idx.columns.includes(col)),
    );
  }
}

/**
 * Run database index analysis
 */
export async function runDatabaseIndexAnalysis(
  prisma: PrismaClient,
): Promise<void> {
  console.log('=== Database Index Analysis ===\n');

  const analyzer = new DatabaseIndexAnalyzer(prisma);
  const report = await analyzer.generatePerformanceAuditReport();

  console.log('📊 EXISTING INDEXES:');
  console.log('====================');
  report.existingIndexes.forEach(idx => {
    console.log(
      `${idx.tableName}.${idx.indexName}: [${idx.columns.join(', ')}] (${
        idx.indexType
      })`,
    );
  });

  console.log('\n🚨 MISSING CRITICAL INDEXES:');
  console.log('=============================');
  report.missingIndexes.forEach(missing => {
    console.log(
      `${missing.priority}: ${missing.tableName}(${missing.columns.join(
        ', ',
      )})`,
    );
    console.log(`   Reason: ${missing.reason}`);
    console.log(`   Impact: ${missing.estimatedImpact}\n`);
  });

  console.log('🔧 SQL TO CREATE MISSING INDEXES:');
  console.log('==================================');
  report.indexCreationSQL.forEach(sql => {
    console.log(sql);
  });

  console.log('\n📈 QUERY PERFORMANCE ANALYSIS:');
  console.log('===============================');
  report.queryPerformance.forEach(perf => {
    console.log(`Query: ${perf.queryName}`);
    if (perf.error) {
      console.log(`   Error: ${perf.error}`);
    } else {
      console.log(`   Execution plan available`);
    }
  });

  console.log('\n💡 RECOMMENDATIONS:');
  console.log('===================');
  report.recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });

  console.log('\n=== Analysis Complete ===');
}

// Export for use in other modules
export default DatabaseIndexAnalyzer;
