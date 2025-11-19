/**
 * Generic batch processing utility for handling large arrays in chunks.
 * Provides both parallel and sequential processing strategies.
 */
export class BatchProcessor {
  /**
   * Processes items in batches with parallel execution.
   * @param items - Array of items to process
   * @param batchSize - Number of items per batch
   * @param handler - Async function to process each batch
   * @returns Array of results from each batch
   */
  async processBatches<T, R>(
    items: T[],
    batchSize: number,
    handler: (batch: T[]) => Promise<R>,
  ): Promise<R[]> {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return await Promise.all(batches.map(batch => handler(batch)));
  }

  /**
   * Processes items in batches sequentially (one after another).
   * Useful when order matters or to avoid overwhelming resources.
   * @param items - Array of items to process
   * @param batchSize - Number of items per batch
   * @param handler - Async function to process each batch
   * @returns Array of results from each batch
   */
  async processSequentially<T, R>(
    items: T[],
    batchSize: number,
    handler: (batch: T[]) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const result = await handler(batch);
      results.push(result);
    }
    return results;
  }
}
