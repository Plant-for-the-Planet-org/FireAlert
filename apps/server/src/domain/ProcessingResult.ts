/**
 * Result object for aggregating processing metrics across all operations.
 * Provides a consistent way to track events processed, created, alerts generated, and errors.
 */
export class ProcessingResult {
  private eventsProcessed: number = 0;
  private eventsCreated: number = 0;
  private alertsCreated: number = 0;
  private errors: Error[] = [];

  /**
   * Adds to the count of events processed.
   */
  addEventsProcessed(count: number): void {
    this.eventsProcessed += count;
  }

  /**
   * Adds to the count of events created in the database.
   */
  addEventsCreated(count: number): void {
    this.eventsCreated += count;
  }

  /**
   * Adds to the count of alerts created.
   */
  addAlertsCreated(count: number): void {
    this.alertsCreated += count;
  }

  /**
   * Records an error that occurred during processing.
   */
  addError(error: Error): void {
    this.errors.push(error);
  }

  /**
   * Merges another ProcessingResult into this one.
   * @param other - Another ProcessingResult to merge
   * @returns This ProcessingResult instance for chaining
   */
  merge(other: ProcessingResult): ProcessingResult {
    this.eventsProcessed += other.eventsProcessed;
    this.eventsCreated += other.eventsCreated;
    this.alertsCreated += other.alertsCreated;
    this.errors.push(...other.errors);
    return this;
  }

  /**
   * Converts the result to a JSON-serializable object.
   */
  toJSON(): {
    eventsProcessed: number;
    eventsCreated: number;
    alertsCreated: number;
    errors: string[];
  } {
    return {
      eventsProcessed: this.eventsProcessed,
      eventsCreated: this.eventsCreated,
      alertsCreated: this.alertsCreated,
      errors: this.errors.map(e => e.message),
    };
  }

  /**
   * Creates an empty ProcessingResult.
   */
  static empty(): ProcessingResult {
    return new ProcessingResult();
  }
}
