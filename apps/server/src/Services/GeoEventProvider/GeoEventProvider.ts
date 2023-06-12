import type GeoEventProviderConfig from "./GeoEventProviderConfig";
import type GeoEvent from "../../Interfaces/GeoEvent"

interface GeoEventProvider {
    getKey: () => string;
    getIdentityGroup: () => string | null;
    initialize: (config?: GeoEventProviderConfig) => void;
    getLatestGeoEvents: (geoEventProviderId: string, slice: string) => Promise<GeoEvent[]>;
}

export default GeoEventProvider;
