import {createXXHash3, type XXHashAPI} from 'hash-wasm';
import {type GeoEventInterface as GeoEvent} from '../Interfaces/GeoEvent';
import {EventId} from './EventId';

/**
 * Consolidated utility for event processing: checksum generation and deduplication.
 * Handles both single event and batch event operations.
 */
export class EventProcessor {
  private hasher: XXHashAPI | null = null;

  /**
   * Initializes the XXHash3 hasher.
   * Must be called before using generateChecksums or filterDuplicates.
   */
  async initialize(): Promise<void> {
    this.hasher = await createXXHash3();
  }

  /**
   * Generates a checksum for a single GeoEvent.
   * @param event - The GeoEvent to generate a checksum for
   * @returns Hexadecimal string representation of the checksum
   * @throws Error if hasher is not initialized
   */
  generateSingle(event: GeoEvent): string {
    if (!this.hasher) {
      throw new Error(
        'EventProcessor not initialized. Call initialize() first.',
      );
    }

    const eventId = new EventId(
      event.type,
      event.latitude,
      event.longitude,
      event.eventDate,
    );
    return eventId.generate(this.hasher);
  }

  /**
   * Generates checksums for multiple GeoEvents.
   * @param events - Array of GeoEvents to generate checksums for
   * @returns Map of GeoEvent to its checksum string
   * @throws Error if hasher is not initialized
   */
  generateChecksums(events: GeoEvent[]): Map<GeoEvent, string> {
    if (!this.hasher) {
      throw new Error(
        'EventProcessor not initialized. Call initialize() first.',
      );
    }

    const map = new Map<GeoEvent, string>();
    for (const event of events) {
      map.set(event, this.generateSingle(event));
    }
    return map;
  }

  /**
   * Filters out events that already exist in the database.
   * @param events - Array of GeoEvents to filter
   * @param existingIds - Array of IDs that already exist in the database
   * @returns Array of GeoEvents that don't exist in the database
   */
  filterDuplicates(events: GeoEvent[], existingIds: string[]): GeoEvent[] {
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
