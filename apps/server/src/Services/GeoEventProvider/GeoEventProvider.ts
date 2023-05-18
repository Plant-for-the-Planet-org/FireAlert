import GeoEventProviderConfig from "./GeoEventProviderConfig";
import GeoEvent from "../../Interfaces/GeoEvent"

interface GeoEventProvider {
    getSources: () => Array<string>;
    initialize: (config?: GeoEventProviderConfig) => void;
    getLatestGeoEvents: (source: string) => Promise<GeoEvent[]>;
}

export default GeoEventProvider;
