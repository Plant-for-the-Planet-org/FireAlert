import AlertProviderInterface from "./AlertProvider";
import NasaAlertProvider from "./Provider/NasaAlertProvider";
// import additional alert provider implementations below


const createAlertProviderRegistry = function (...alertProviders: Array<AlertProviderInterface>) {
    debugger;
    const registry: { [source: string]: AlertProviderInterface } = {};

    alertProviders.forEach((alertProvider: AlertProviderInterface) => {
        alertProvider.getSources().map(function (source: string) {
            if (registry[source]) {
                throw new Error(`Provider for source '${source}' has already been registered`);
            }
            registry[source] = alertProvider;
        })
    });

    return {
        get: (source: string): AlertProviderInterface => {
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
const alertProviders: AlertProviderInterface[] = [
    new NasaAlertProvider()
    // list new alert providers here
];

// pass the array of alert provider instances to the createAlertProviderRegistry function
const AlertProviderRegistry = createAlertProviderRegistry(...alertProviders);

export default AlertProviderRegistry;