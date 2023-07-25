import { type GeoEventProviderClass } from "../../Interfaces/GeoEventProvider";
import NasaGeoEventProvider from "./ProviderClass/NasaGeoEventProviderClass";
// import additional GeoEvent provider implementations below

const createGeoEventProviderClassRegistry = function (geoEventProviders: Array<GeoEventProviderClass>) {

    const registry: { [client: string]: GeoEventProviderClass } = {};

    geoEventProviders.forEach((geoEventProvider: GeoEventProviderClass) => {
        const client = geoEventProvider.getKey()
        if (registry[client]) {
            // Better logic?: break out of that geoEventProvider and move to the next one instead of throwing an error!
            throw new Error(`Provider for client '${client}' has already been registered`);
        }
        registry[client] = geoEventProvider;
    });

    return {
        get: (client: string): GeoEventProviderClass => {
            const provider = registry[client];
            if (!provider) {
                throw new Error(`Provider with key '${client}' not found`);
            }
            return provider;
        }
    };
}

const GeoEventProviderClassRegistry = createGeoEventProviderClassRegistry([
    new NasaGeoEventProvider()
    // add new alert providers here
]);

export default GeoEventProviderClassRegistry;