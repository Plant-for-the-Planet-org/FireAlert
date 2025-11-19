import {type GeoEventProvider} from '@prisma/client';

/**
 * Utility for shuffling and selecting a subset of providers.
 * Uses Fisher-Yates shuffle algorithm for randomization.
 */
export class ProviderSelector {
  /**
   * Shuffles an array of providers and selects up to the specified limit.
   * @param providers - Array of GeoEventProvider instances
   * @param limit - Maximum number of providers to select
   * @returns Array of randomly selected providers
   */
  shuffleAndSelect(
    providers: GeoEventProvider[],
    limit: number,
  ): GeoEventProvider[] {
    // Create a copy to avoid mutating the original array
    const shuffled = [...providers];

    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, limit);
  }
}
