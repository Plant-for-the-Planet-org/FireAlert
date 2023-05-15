import AlertProviderConfig from "./AlertProviderConfig";

interface AlertProvider {
    getSources: () => Array<string>;
    initialize: (config: AlertProviderConfig) => void;
    getLatestAlerts: (source: string) => Promise<any[]>;
}

export default AlertProvider;
