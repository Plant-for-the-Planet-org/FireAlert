import {type GeoEventProvider} from '@prisma/client';
import {
  type GeoEventProviderClass,
  type GeoEventProviderConfig,
} from '../Interfaces/GeoEventProvider';
import GeoEventProviderClassRegistry from '../Services/GeoEventProvider/GeoEventProviderClassRegistry';

/**
 * Consolidated utility for provider management: selection and instantiation.
 * Handles provider shuffling, selection, and factory creation.
 */
export class ProviderManager {
  /**
   * Shuffles an array of providers and selects up to the specified limit.
   * Uses Fisher-Yates shuffle algorithm for randomization.
   * @param providers - Array of GeoEventProvider instances
   * @param limit - Maximum number of providers to select
   * @returns Array of randomly selected providers
   */
  selectProviders(
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

  /**
   * Creates and initializes a provider instance based on the provider configuration.
   * @param provider - The GeoEventProvider database record
   * @returns Initialized GeoEventProviderClass instance
   * @throws Error if provider client is not found in registry
   */
  createProvider(provider: GeoEventProvider): GeoEventProviderClass {
    const {config} = provider;

    // Parse the config (handles both JSON string and object)
    const parsedConfig: GeoEventProviderConfig = JSON.parse(
      JSON.stringify(config),
    );

    const client = parsedConfig.client;

    // Get the provider class from the registry
    const ProviderClass = GeoEventProviderClassRegistry.get(client);

    // Initialize the provider with the parsed config
    ProviderClass.initialize(parsedConfig);

    return ProviderClass;
  }
}
