import AlertProvider from '../AlertProvider';
import AlertProviderConfig from '../AlertProviderConfig';

class SampleAlertProvider implements AlertProvider {
    private config?: AlertProviderConfig;

    getSources(): Array<string> {
        // Logic to retrieve available sources goes here
        return ['source1', 'source2', 'source3'];
    }

    initialize(config: AlertProviderConfig): void {
        // Logic to initialize the alert provider with the specified configuration goes here
        this.config = config;
    }

    async getLatestAlerts(): Promise<any[]> {
        // Logic to retrieve the latest alerts goes here
        if(typeof this.config === 'undefined') {
            throw new Error(`Invalid or incomplete alert provider configuration`);
        }

        const response = await fetch(this.config.apiUrl);
        const data = await response.json();
        return data.alerts;
    }
}

export default SampleAlertProvider;