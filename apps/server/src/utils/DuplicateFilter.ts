import {type GeoEventInterface as GeoEvent} from '../Interfaces/GeoEvent';

/**
 * Utility for removing duplicate events against database records and within batches.
 * Provides both database-based and in-memory deduplication strategies.
 */
export class DuplicateFilter {
  /**
   * Filters out events that already exist in the database.
   * @param events - Array of GeoEvents to filter
   * @param existingIds - Array of IDs that already exist in the database
   * @returns Array of GeoEvents that don't exist in the database
   */
  filter(events: GeoEvent[], existingIds: string[]): GeoEvent[] {
    const dbIdsSet = new Set(existingIds);
    return events.filter(e => e.id && !dbIdsSet.has(e.id));
  }

  /**
   * Filters out duplicate events within the same batch (in-memory deduplication).
   * Keeps the first occurrence of each unique event ID.
   * @param events - Array of GeoEvents to filter
   * @returns Array of unique GeoEvents
   */
  filterInMemory(events: GeoEvent[]): GeoEvent[] {
    const seen = new Set<string>();
    const filtered: GeoEvent[] = [];

    for (const event of events) {
      if (event.id && !seen.has(event.id)) {
        filtered.push(event);
        seen.add(event.id);
      }
    }
    return filtered;
  }
}
