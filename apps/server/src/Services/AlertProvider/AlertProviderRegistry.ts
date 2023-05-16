import AlertProvider from "./AlertProvider";
import NasaAlertProvider from "./Provider/NasaAlertProvider";
// import additional alert provider implementations below

const createAlertProviderRegistry = function (alertProviders: Array<AlertProvider>) {

    const registry: { [source: string]: AlertProvider } = {};

    alertProviders.forEach((alertProvider: AlertProvider) => {
        alertProvider.getSources().map(function (source: string) {
            if (registry[source]) {
                throw new Error(`Provider for source '${source}' has already been registered`);
            }
            registry[source] = alertProvider;
        })
    });

    return {
        get: (source: string): AlertProvider => {
            const provider = registry[source];
            if (!provider) {
                throw new Error(`Provider with key '${source}' not found`);
            }
            return provider;
        }
    };
}

const AlertProviderRegistry = createAlertProviderRegistry([
    new NasaAlertProvider()
    // add new alert providers here
]);

export default AlertProviderRegistry;