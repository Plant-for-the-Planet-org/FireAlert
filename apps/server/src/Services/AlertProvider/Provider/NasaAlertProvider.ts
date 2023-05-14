import AlertProviderInterface from '../AlertProviderInterface';
import AlertProviderConfig from '../AlertProviderConfig';

class NasaAlertProvider implements AlertProviderInterface {
    private config?: AlertProviderConfig;

    getSources(): Array<string> {
        return ['MODIS_NRT', 'MODIS_SP', 'VIIRS_NOAA20_NRT', 'VIIRS_SNPP_NRT', 'VIIRS_SNPP_SP', 'LANDSAT_NRT'];
    }

    initialize(config: AlertProviderConfig): void {
        this.config = config;
    }

    async getLatestAlerts(source: string): Promise<any[]> {
        if(typeof this.config === 'undefined') {
            throw new Error(`Invalid or incomplete alert provider configuration for source ${source}`);
        }
        const config = this.config
        if(typeof config.apiUrl === 'undefined') {
            throw new Error(`Missing property 'apiUrl' in alert provider configuration`);
        }
        if(typeof config.mapKey === 'undefined') {
            throw new Error(`Missing property 'mapKey' in alert provider configuration`);
        }
        const apiUrl = config.apiUrl
        const mapKey = config.mapKey
        const currentDate = new Date().toISOString().split("T")[0];

        const url = `${apiUrl}/${mapKey}/${source}/-180,-90,180,90/1/${currentDate}`;

        const response = await fetch(this.config.mapKey);
        const data = await response.json();
        return data.alerts;
    }
}

export default NasaAlertProvider;