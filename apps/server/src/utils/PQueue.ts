/**
 * Simple priority queue implementation for controlling concurrency.
 * Limits the number of concurrent async operations.
 */
export class PQueue {
  private readonly concurrency: number;
  private running: number = 0;
  private queue: Array<() => Promise<void>> = [];

  constructor(options: {concurrency: number}) {
    if (!Number.isInteger(options.concurrency) || options.concurrency < 1) {
      throw new RangeError('concurrency must be a positive integer');
    }
    this.concurrency = options.concurrency;
  }

  /**
   * Adds a task to the queue.
   * @param fn - Async function to execute
   * @returns Promise that resolves with the function's result
   */
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task = async () => {
        try {
          this.running++;
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          this.processNext();
        }
      };

      this.queue.push(task);
      this.processNext();
    });
  }

  /**
   * Processes the next task in the queue if concurrency allows.
   */
  private processNext(): void {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (task) {
      void task();
    }
  }
}
