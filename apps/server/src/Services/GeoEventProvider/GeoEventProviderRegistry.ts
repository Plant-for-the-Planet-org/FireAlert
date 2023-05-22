import GeoEventProvider from "./GeoEventProvider";
import NasaGeoEventProvider from "./Provider/NasaGeoEventProvider";
// import additional GeoEvent provider implementations below

const createGeoEventProviderRegistry = function (geoEventProviders: Array<GeoEventProvider>) {

    const registry: { [source: string]: GeoEventProvider } = {};

    geoEventProviders.forEach((geoEventProvider: GeoEventProvider) => {
        let providerKey = geoEventProvider.getKey()
        if (registry[providerKey]) {
            throw new Error(`Provider for source '${providerKey}' has already been registered`);
        }
        registry[providerKey] = geoEventProvider;
    });

    return {
        get: (source: string): GeoEventProvider => {
            const provider = registry[source];
            if (!provider) {
                throw new Error(`Provider with key '${source}' not found`);
            }
            return provider;
        }
    };
}

const GeoEventProviderRegistry = createGeoEventProviderRegistry([
    new NasaGeoEventProvider()
    // add new alert providers here
]);

export default GeoEventProviderRegistry;