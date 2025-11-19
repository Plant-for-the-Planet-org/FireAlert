import {createXXHash3, type XXHashAPI} from 'hash-wasm';
import {type GeoEventInterface as GeoEvent} from '../Interfaces/GeoEvent';
import {GeoEventChecksum} from '../domain/GeoEventChecksum';

/**
 * Centralized checksum generation utility using XXHash3.
 * Handles both single event and batch event checksum generation.
 */
export class ChecksumGenerator {
  private hasher: XXHashAPI | null = null;

  /**
   * Initializes the XXHash3 hasher.
   * Must be called before using generateSingle or generateForEvents.
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
        'ChecksumGenerator not initialized. Call initialize() first.',
      );
    }

    const checksum = new GeoEventChecksum(
      event.type,
      event.latitude,
      event.longitude,
      event.eventDate,
    );
    return checksum.generate(this.hasher);
  }

  /**
   * Generates checksums for multiple GeoEvents.
   * @param events - Array of GeoEvents to generate checksums for
   * @returns Map of GeoEvent to its checksum string
   * @throws Error if hasher is not initialized
   */
  generateForEvents(events: GeoEvent[]): Map<GeoEvent, string> {
    if (!this.hasher) {
      throw new Error(
        'ChecksumGenerator not initialized. Call initialize() first.',
      );
    }

    const map = new Map<GeoEvent, string>();
    for (const event of events) {
      map.set(event, this.generateSingle(event));
    }
    return map;
  }
}
