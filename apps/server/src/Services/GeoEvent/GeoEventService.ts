import {type GeoEventInterface as GeoEvent} from '../../Interfaces/GeoEvent';
import {type GeoEventRepository} from './GeoEventRepository';
import {type EventProcessor} from '../../utils/EventProcessor';
import {type BatchProcessor} from '../../utils/BatchProcessor';
import {PerformanceMetrics} from '../../utils/PerformanceMetrics';
import {logger} from '../../server/logger';

/**
 * Service for coordinating GeoEvent processing pipeline.
 * Handles checksum generation, deduplication, and persistence.
 */
export class GeoEventService {
  constructor(
    public readonly repository: GeoEventRepository, // Made public for optimization access
    private readonly eventProcessor: EventProcessor,
    private readonly batchProcessor: BatchProcessor,
  ) {}

  /**
   * Deduplicates events and saves new ones to the database.
   * Process:
   * 1. Generate checksums for all events
   * 2. Fetch existing IDs from DB (last 12 hours, optimized)
   * 3. Filter out duplicates against DB
   * 4. Filter out in-memory duplicates
   * 5. Bulk insert in batches
   *
   * @param events - Array of GeoEvents to process
   * @param providerId - The provider ID
   * @param preFetchedIds - Optional pre-fetched existing IDs to avoid re-querying
   * @returns Object with created count and new event count
   */
  async deduplicateAndSave(
    events: GeoEvent[],
    providerId: string,
    preFetchedIds?: string[],
  ): Promise<{created: number; new: number}> {
    const metrics = new PerformanceMetrics();
    metrics.startTimer('deduplication_total');
    metrics.recordMemorySnapshot('dedup_start');

    // Generate checksums for all events
    metrics.startTimer('checksum_generation');
    const checksumMap = this.eventProcessor.generateChecksums(events);
    const checksumDuration = metrics.endTimer('checksum_generation');

    // Assign IDs to events
    const eventsWithIds = Array.from(checksumMap.entries()).map(
      ([event, checksum]) => ({
        ...event,
        id: checksum,
      }),
    );

    // Fetch existing IDs from DB (last 12 hours, optimized) or use pre-fetched
    let existingIds: string[];
    let dbFetchDuration: number;

    if (preFetchedIds) {
      existingIds = preFetchedIds;
      dbFetchDuration = 0; // No DB query needed
      logger(
        `Using pre-fetched ${existingIds.length} existing IDs for provider ${providerId}`,
        'debug',
      );
    } else {
      metrics.startTimer('db_fetch_existing');
      const fetchResult = await this.repository.fetchExistingIdsWithTiming(
        providerId,
        12,
      );
      existingIds = fetchResult.ids;
      dbFetchDuration = metrics.endTimer('db_fetch_existing');

      // Log slow queries
      if (fetchResult.queryTimeMs > 1000) {
        // >1 second
        logger(
          `SLOW QUERY: fetchExistingIds took ${fetchResult.queryTimeMs}ms for ${fetchResult.count} IDs`,
          'warn',
        );
      }
    }

    // Filter duplicates against DB
    metrics.startTimer('db_duplicate_filter');
    const newEvents = this.eventProcessor.filterDuplicates(
      eventsWithIds,
      existingIds,
    );
    const dbFilterDuration = metrics.endTimer('db_duplicate_filter');

    // Filter in-memory duplicates
    metrics.startTimer('memory_duplicate_filter');
    const uniqueEvents = this.eventProcessor.filterInMemory(newEvents);
    const memoryFilterDuration = metrics.endTimer('memory_duplicate_filter');

    // Early exit if no unique events
    if (uniqueEvents.length === 0) {
      logger(`No unique events to insert for provider ${providerId}`, 'debug');
      return {
        created: 0,
        new: 0,
      };
    }

    // Bulk insert in batches of 1000
    metrics.startTimer('bulk_insert');
    const created = await this.repository.bulkCreate(uniqueEvents, 1000);
    const insertDuration = metrics.endTimer('bulk_insert');

    const totalDuration = metrics.endTimer('deduplication_total');
    metrics.recordMemorySnapshot('dedup_end');

    // Record additional metrics
    metrics.recordMetric('events_input', events.length);
    metrics.recordMetric('events_after_db_filter', newEvents.length);
    metrics.recordMetric('events_unique', uniqueEvents.length);
    metrics.recordMetric('events_created', created);
    metrics.recordMetric('existing_ids_count', existingIds.length);
    metrics.recordMetric(
      'duplicate_ratio',
      events.length > 0
        ? Math.round((1 - uniqueEvents.length / events.length) * 100) / 100
        : 0,
    );

    // Log performance information
    logger(
      `Deduplication completed in ${totalDuration}ms: ` +
        `${events.length} input → ${uniqueEvents.length} unique → ${created} created ` +
        `(checksum: ${checksumDuration}ms, db_fetch: ${dbFetchDuration}ms, ` +
        `db_filter: ${dbFilterDuration}ms, mem_filter: ${memoryFilterDuration}ms, ` +
        `insert: ${insertDuration}ms)`,
      'debug',
    );

    return {
      created,
      new: uniqueEvents.length,
    };
  }
}
