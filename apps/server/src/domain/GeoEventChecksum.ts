import {type XXHashAPI} from 'hash-wasm';

/**
 * Value object for generating consistent event identifiers using XXHash3.
 * Immutable class that encapsulates the logic for creating checksums from GeoEvent data.
 */
export class GeoEventChecksum {
  constructor(
    private readonly type: string,
    private readonly latitude: number,
    private readonly longitude: number,
    private readonly eventDate: Date,
  ) {}

  /**
   * Generates a unique checksum for this event using XXHash3.
   * @param hasher - The XXHash3 hasher instance
   * @returns Hexadecimal string representation of the checksum
   */
  generate(hasher: XXHashAPI): string {
    hasher.init();
    return hasher
      .update(
        this.type +
          this.latitude.toString() +
          this.longitude.toString() +
          this.eventDate.toISOString(),
      )
      .digest('hex');
  }

  /**
   * Compares this checksum with another for equality.
   * @param other - Another GeoEventChecksum instance
   * @returns True if both checksums represent the same event
   */
  equals(other: GeoEventChecksum): boolean {
    return (
      this.type === other.type &&
      this.latitude === other.latitude &&
      this.longitude === other.longitude &&
      this.eventDate.getTime() === other.eventDate.getTime()
    );
  }
}
