import GeoEventProvider from '../GeoEventProvider';
import GeoEventProviderConfig from '../GeoEventProviderConfig';

class SampleGeoEventProvider implements GeoEventProvider {
    private config?: GeoEventProviderConfig;

    getSources(): Array<string> {
        // Logic to retrieve available sources goes here
        return ['source1', 'source2', 'source3'];
    }

    initialize(config: GeoEventProviderConfig): void {
        // Logic to initialize the alert provider with the specified configuration goes here
        this.config = config;
    }

    async getLatestGeoEvents(): Promise<any[]> {
        // Logic to retrieve the latest alerts goes here
        if(typeof this.config === 'undefined') {
            throw new Error(`Invalid or incomplete alert provider configuration`);
        }

        const response = await fetch(this.config.apiUrl);
        const data = await response.json();
        return data.alerts;
    }
}

export default SampleGeoEventProvider;