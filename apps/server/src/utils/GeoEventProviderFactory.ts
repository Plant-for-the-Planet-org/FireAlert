import {type GeoEventProvider} from '@prisma/client';
import {
  type GeoEventProviderClass,
  type GeoEventProviderConfig,
} from '../Interfaces/GeoEventProvider';
import GeoEventProviderClassRegistry from '../Services/GeoEventProvider/GeoEventProviderClassRegistry';

/**
 * Factory for instantiating and initializing GeoEventProvider classes.
 * Handles config parsing and provider class registry lookup.
 */
export class GeoEventProviderFactory {
  /**
   * Creates and initializes a provider instance based on the provider configuration.
   * @param provider - The GeoEventProvider database record
   * @returns Initialized GeoEventProviderClass instance
   * @throws Error if provider client is not found in registry
   */
  create(provider: GeoEventProvider): GeoEventProviderClass {
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
