import AlertProviderConfig from "./AlertProviderConfig";

interface AlertProviderInterface {
    getSources: () => Array<string>;
    initialize: (config: AlertProviderConfig) => void;
    getLatestAlerts: (source: string) => Promise<any[]>;
}

export default AlertProviderInterface;
