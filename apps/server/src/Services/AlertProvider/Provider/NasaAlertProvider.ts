import AlertProvider from '../AlertProvider';
import AlertProviderConfig from '../AlertProviderConfig';

interface NasaAlertProviderConfig {
    apiUrl: string,
    mapKey: string
}

class NasaAlertProvider implements AlertProvider {

    private config: AlertProviderConfig | undefined;

    getSources(): Array<string> {
        return ['MODIS_NRT', 'MODIS_SP', 'VIIRS_NOAA20_NRT', 'VIIRS_SNPP_NRT', 'VIIRS_SNPP_SP', 'LANDSAT_NRT'];
    }

    initialize(config?: AlertProviderConfig): void {
        this.config = config
    }

    async getLatestAlerts(source: string): Promise<any[]> {

        const response = await fetch(this.getUrl(source));
        const data = await response.json();
        // TODO: normalize each record

        return data;
    }

    getUrl(source: string): string {
        const { apiUrl, mapKey } = this.getConfig()
        const currentDate = new Date().toISOString().split("T")[0];

        return `${apiUrl}/${mapKey}/${source}/-180,-90,180,90/1/${currentDate}`;
    }

    getConfig(): NasaAlertProviderConfig {
        if (typeof this.config === 'undefined') {
            throw new Error(`Invalid or incomplete alert provider configuration`);
        }
        const config = this.config
        if (typeof config.apiUrl === 'undefined') {
            throw new Error(`Missing property 'apiUrl' in alert provider configuration`);
        }
        if (typeof config.mapKey === 'undefined') {
            throw new Error(`Missing property 'mapKey' in alert provider configuration`);
        }

        return {
            apiUrl: config.apiUrl,
            mapKey: config.mapKey
        }
    }
}

export default NasaAlertProvider;