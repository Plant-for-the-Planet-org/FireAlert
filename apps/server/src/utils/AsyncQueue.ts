/**
 * Simple async queue implementation for controlling concurrency.
 * Processes tasks with a maximum concurrency limit.
 */
export class AsyncQueue {
  private running = 0;
  private queue: Array<() => Promise<void>> = [];

  constructor(private readonly concurrency: number) {}

  /**
   * Adds a task to the queue and returns a promise that resolves with the result.
   * @param fn - Async function to execute
   * @returns Promise that resolves with the function's result
   */
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task = async () => {
        try {
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
      this.running++;
      task();
    }
  }
}
