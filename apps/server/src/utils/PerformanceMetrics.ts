/**
 * PerformanceMetrics - Domain model for tracking timing and performance metrics
 *
 * Provides functionality to:
 * - Start/end timers for operations
 * - Record custom metrics
 * - Support nested timing (e.g., provider → chunks → deduplication)
 * - Merge metrics from multiple operations
 * - Memory snapshots (if feasible)
 */
export class PerformanceMetrics {
  private timers: Map<string, number> = new Map();
  private metrics: Map<string, number> = new Map();
  private nestedMetrics: Map<string, any> = new Map();

  /**
   * Start a named timer
   * @param label - Timer label/name
   */
  startTimer(label: string): void {
    this.timers.set(label, Date.now());
  }

  /**
   * End a named timer and return duration
   * @param label - Timer label/name
   * @returns Duration in milliseconds
   */
  endTimer(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      throw new Error(`Timer '${label}' was not started`);
    }

    const duration = Date.now() - startTime;
    this.timers.delete(label);
    this.recordMetric(`${label}_ms`, duration);

    return duration;
  }

  /**
   * Record a custom metric
   * @param label - Metric label/name
   * @param value - Metric value
   */
  recordMetric(label: string, value: number): void {
    this.metrics.set(label, value);
  }

  /**
   * Record a nested metric (for complex hierarchical data)
   * @param label - Metric label/name
   * @param value - Metric value (can be object or number)
   */
  recordNestedMetric(label: string, value: any): void {
    this.nestedMetrics.set(label, value);
  }

  /**
   * Get memory usage snapshot
   * @returns Memory usage in MB
   */
  getMemoryUsage(): number {
    const memUsage = process.memoryUsage();
    return Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100; // MB with 2 decimal places
  }

  /**
   * Record current memory usage
   * @param label - Label for the memory snapshot
   */
  recordMemorySnapshot(label: string): void {
    this.recordMetric(`${label}_memory_mb`, this.getMemoryUsage());
  }

  /**
   * Get all recorded metrics
   * @returns Object containing all metrics
   */
  getMetrics(): object {
    const result: any = {};

    // Add simple metrics
    for (const [key, value] of this.metrics.entries()) {
      result[key] = value;
    }

    // Add nested metrics
    for (const [key, value] of this.nestedMetrics.entries()) {
      result[key] = value;
    }

    return result;
  }

  /**
   * Merge metrics from another PerformanceMetrics instance
   * @param other - Another PerformanceMetrics instance
   * @returns New PerformanceMetrics instance with merged data
   */
  merge(other: PerformanceMetrics): PerformanceMetrics {
    const merged = new PerformanceMetrics();

    // Merge simple metrics
    for (const [key, value] of this.metrics.entries()) {
      merged.recordMetric(key, value);
    }
    for (const [key, value] of other.metrics.entries()) {
      merged.recordMetric(key, value);
    }

    // Merge nested metrics
    for (const [key, value] of this.nestedMetrics.entries()) {
      merged.recordNestedMetric(key, value);
    }
    for (const [key, value] of other.nestedMetrics.entries()) {
      merged.recordNestedMetric(key, value);
    }

    return merged;
  }

  /**
   * Calculate average from multiple values
   * @param values - Array of numbers
   * @returns Average value
   */
  static calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return (
      Math.round(
        (values.reduce((sum, val) => sum + val, 0) / values.length) * 100,
      ) / 100
    );
  }

  /**
   * Find maximum value from array
   * @param values - Array of numbers
   * @returns Maximum value
   */
  static findMax(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.max(...values);
  }

  /**
   * Create empty PerformanceMetrics instance
   * @returns New empty PerformanceMetrics instance
   */
  static empty(): PerformanceMetrics {
    return new PerformanceMetrics();
  }

  /**
   * Check if metrics instance is empty
   * @returns True if no metrics recorded
   */
  isEmpty(): boolean {
    return this.metrics.size === 0 && this.nestedMetrics.size === 0;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.timers.clear();
    this.metrics.clear();
    this.nestedMetrics.clear();
  }

  /**
   * Get count of recorded metrics
   * @returns Number of metrics recorded
   */
  getMetricCount(): number {
    return this.metrics.size + this.nestedMetrics.size;
  }
}
