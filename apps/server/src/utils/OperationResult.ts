import {PerformanceMetrics} from './PerformanceMetrics';

/**
 * Result object for aggregating operation metrics across all processing steps.
 * Provides a consistent way to track events processed, created, alerts generated, and errors.
 * Generic enough to be reused across different operation types.
 * Now includes performance metrics for timing and system health tracking.
 */
export class OperationResult {
  private eventsProcessed: number = 0;
  private eventsCreated: number = 0;
  private alertsCreated: number = 0;
  private resolvedIncidents: number = 0;
  private errors: Error[] = [];
  private metrics?: PerformanceMetrics;

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
   * Sets the count of resolved incidents.
   */
  setResolvedIncidents(count: number): void {
    this.resolvedIncidents = count;
  }

  /**
   * Records an error that occurred during processing.
   */
  addError(error: Error): void {
    this.errors.push(error);
  }

  /**
   * Sets the performance metrics for this operation.
   * @param metrics - PerformanceMetrics instance containing timing data
   */
  setMetrics(metrics: PerformanceMetrics): void {
    this.metrics = metrics;
  }

  /**
   * Gets the performance metrics for this operation.
   * @returns PerformanceMetrics instance or undefined if not set
   */
  getMetrics(): PerformanceMetrics | undefined {
    return this.metrics;
  }

  /**
   * Merges another OperationResult into this one.
   * @param other - Another OperationResult to merge
   * @returns This OperationResult instance for chaining
   */
  merge(other: OperationResult): OperationResult {
    this.eventsProcessed += other.eventsProcessed;
    this.eventsCreated += other.eventsCreated;
    this.alertsCreated += other.alertsCreated;
    this.resolvedIncidents += other.resolvedIncidents;
    this.errors.push(...other.errors);

    // Merge performance metrics if both have them
    if (this.metrics && other.metrics) {
      this.metrics = this.metrics.merge(other.metrics);
    } else if (other.metrics) {
      this.metrics = other.metrics;
    }

    return this;
  }

  /**
   * Converts the result to a JSON-serializable object.
   */
  toJSON(): {
    eventsProcessed: number;
    eventsCreated: number;
    alertsCreated: number;
    resolvedIncidents: number;
    errors: string[];
    metrics?: object;
  } {
    const result: any = {
      eventsProcessed: this.eventsProcessed,
      eventsCreated: this.eventsCreated,
      alertsCreated: this.alertsCreated,
      resolvedIncidents: this.resolvedIncidents,
      errors: this.errors.map(e => e.message),
    };

    // Include metrics if available
    if (this.metrics && !this.metrics.isEmpty()) {
      result.metrics = this.metrics.getMetrics();
    }

    return result;
  }

  /**
   * Creates an empty OperationResult.
   */
  static empty(): OperationResult {
    return new OperationResult();
  }
}
