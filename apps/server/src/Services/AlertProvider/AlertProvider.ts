import AlertProviderConfig from "./AlertProviderConfig";
import GeoEvent from "../../Interfaces/GeoEvent"

interface AlertProvider {
    getSources: () => Array<string>;
    initialize: (config: AlertProviderConfig) => void;
    getLatestGeoEvents: (source: string) => Promise<GeoEvent[]>;
}

export default AlertProvider;
