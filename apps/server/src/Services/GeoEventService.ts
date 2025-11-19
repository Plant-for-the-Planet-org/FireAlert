import {type GeoEventInterface as GeoEvent} from '../Interfaces/GeoEvent';
import {GeoEventRepository} from '../repositories/GeoEventRepository';
import {ChecksumGenerator} from '../utils/ChecksumGenerator';
import {DuplicateFilter} from '../utils/DuplicateFilter';
import {BatchProcessor} from '../utils/BatchProcessor';

/**
 * Service for coordinating GeoEvent processing pipeline.
 * Handles checksum generation, deduplication, and persistence.
 */
export class GeoEventService {
  constructor(
    private readonly repository: GeoEventRepository,
    private readonly checksumGenerator: ChecksumGenerator,
    private readonly duplicateFilter: DuplicateFilter,
    private readonly batchProcessor: BatchProcessor,
  ) {}

  /**
   * Deduplicates events and saves new ones to the database.
   * Process:
   * 1. Generate checksums for all events
   * 2. Fetch existing IDs from DB (last 30 hours)
   * 3. Filter out duplicates against DB
   * 4. Filter out in-memory duplicates
   * 5. Bulk insert in batches
   *
   * @param events - Array of GeoEvents to process
   * @param providerId - The provider ID
   * @returns Object with created count and new event count
   */
  async deduplicateAndSave(
    events: GeoEvent[],
    providerId: string,
  ): Promise<{created: number; new: number}> {
    // Generate checksums for all events
    const checksumMap = this.checksumGenerator.generateForEvents(events);

    // Assign IDs to events
    const eventsWithIds = Array.from(checksumMap.entries()).map(
      ([event, checksum]) => ({
        ...event,
        id: checksum,
      }),
    );

    // Fetch existing IDs from DB (last 30 hours)
    const existingIds = await this.repository.fetchExistingIds(providerId, 30);

    // Filter duplicates against DB
    const newEvents = this.duplicateFilter.filter(eventsWithIds, existingIds);

    // Filter in-memory duplicates
    const uniqueEvents = this.duplicateFilter.filterInMemory(newEvents);

    // Bulk insert in batches of 1000
    const created = await this.repository.bulkCreate(uniqueEvents, 1000);

    return {
      created,
      new: uniqueEvents.length,
    };
  }
}
