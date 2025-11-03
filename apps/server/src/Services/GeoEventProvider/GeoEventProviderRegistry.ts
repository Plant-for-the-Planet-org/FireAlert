import {type GeoEventProviderClass} from '../../Interfaces/GeoEventProvider';
import NasaGeoEventProvider from './ProviderClass/NasaGeoEventProviderClass';
import GOES16GeoEventProvider from './ProviderClass/GOES16GeoEventProviderClass';
// import additional GeoEvent provider implementations below

const createGeoEventProviderClassRegistry = function (
  geoEventProviders: Array<GeoEventProviderClass>,
) {
  const registry: {[client: string]: GeoEventProviderClass} = {};

  geoEventProviders.forEach((geoEventProvider: GeoEventProviderClass) => {
    const client = geoEventProvider.getKey();
    if (registry[client]) {
      throw new Error(
        `Provider for client '${client}' has already been registered`,
      );
    }
    registry[client] = geoEventProvider;
  });

  return {
    /**
     * Gets a provider by its client key
     * @param client - The client key to look up
     * @returns The provider class instance
     * @throws Error if provider not found
     */
    get: (client: string): GeoEventProviderClass => {
      const provider = registry[client];
      if (!provider) {
        const availableProviders = Object.keys(registry).join(', ');
        throw new Error(
          `Provider with key '${client}' not found. Available providers: ${availableProviders}`,
        );
      }
      return provider;
    },

    /**
     * Gets a list of all available provider keys
     * @returns Array of registered provider keys
     */
    getAvailableProviders: (): string[] => {
      return Object.keys(registry);
    },
  };
};

const GeoEventProviderClassRegistry = createGeoEventProviderClassRegistry([
  new NasaGeoEventProvider(),
  new GOES16GeoEventProvider(),
  // add new alert providers here
]);

export default GeoEventProviderClassRegistry;
