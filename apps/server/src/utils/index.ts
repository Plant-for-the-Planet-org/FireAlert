/**
 * Barrel export for all utility modules.
 * Provides clean, centralized imports for utilities across the application.
 */

// Domain models
export {EventId} from './EventId';
export {OperationResult} from './OperationResult';
export {PerformanceMetrics} from './PerformanceMetrics';

// Event processing
export {EventProcessor} from './EventProcessor';

// Provider management
export {ProviderManager} from './ProviderManager';

// Request handling
export {RequestHandler} from './RequestHandler';

// Batch processing
export {BatchProcessor} from './BatchProcessor';

// Queue utilities
export {PQueue} from './PQueue';
export {AsyncQueue} from './AsyncQueue';

// Optimized logging
export {
  OptimizedLogger,
  optimizedLogger,
  logPerformance,
  logProvider,
  logChunk,
  logDatabase,
  logMemory,
  logStructured,
} from './OptimizedLogger';

// Micro-optimizations
export {
  ArrayOptimizations,
  ObjectOptimizations,
  StringOptimizations,
  NumberOptimizations,
  MemoryOptimizations,
  MicroOpts,
} from './MicroOptimizations';

// Prisma optimization
export {
  PrismaOptimizationAnalyzer,
  PrismaOptimizationUtils,
  PrismaOptimizationReport,
} from './prisma-optimization-analysis';

// Site caching
export {
  SiteCache,
  SiteCacheManager,
  CachedSite,
  SiteCacheMetrics,
} from './SiteCache';
