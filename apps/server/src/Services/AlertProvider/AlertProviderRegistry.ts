import AlertProvider from "./AlertProvider";
import NasaAlertProvider from "./Provider/NasaAlertProvider";
// import additional alert provider implementations below


const createAlertProviderRegistry = function (...alertProviders: Array<AlertProvider>) {
    debugger;
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
        },
        ...registry
    };
}

// create an array of alert provider instances
const alertProviders: AlertProvider[] = [
    new NasaAlertProvider()
    // list new alert providers here
];

// pass the array of alert provider instances to the createAlertProviderRegistry function
const AlertProviderRegistry = createAlertProviderRegistry(...alertProviders);

export default AlertProviderRegistry;