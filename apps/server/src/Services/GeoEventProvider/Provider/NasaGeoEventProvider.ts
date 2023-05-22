import GeoEventProvider from '../GeoEventProvider';
import GeoEventProviderConfig from '../GeoEventProviderConfig';
import GeoEvent from "../../../Interfaces/GeoEvent"
import { parse } from 'csv-parse'
import { AlertType } from '@prisma/client';
import DataRecord from '../../../Interfaces/DataRecord';

interface NasaGeoEventProviderConfig {
    apiUrl: string,
    mapKey: string,
    sourceKey: string
}

class NasaGeoEventProvider implements GeoEventProvider {

    private config: GeoEventProviderConfig | undefined;

    getKey(): string {
        return 'FIRMS';
    }

    getIdentityGroup(): string | null {
        const identityMap = new Map<string, string>([
            ["MODIS_NRT", "MODIS"],
            ["VIIRS_NOAA20_NRT", "VIIRS"],
            ["VIIRS_SNPP_NRT", "VIIRS"],
            ["LANDSAT_NRT", "LANDSAT"],
            ["GEOSTATIONARY", "GEOSTATIONARY"],
            ["MODIS_SP", "MODIS"],
            ["VIIRS_SNPP_SP", "VIIRS"],
        ]);

        // the returned identityGroup is being used by the caller of this provider to identify duplicate GeoEvents
        // events from multiple sources but same satellite with the same identityGroup will be considered duplicates
        return identityMap.get(this.config?.sourceKey) ?? null;
    }

    initialize(config?: GeoEventProviderConfig): void {
        this.config = config;
    }

    async getLatestGeoEvents(): Promise<GeoEvent[]> {

        const normalize = (record: DataRecord, source: string): GeoEvent => {
            const longitude = parseFloat(record.longitude);
            const latitude = parseFloat(record.latitude);
            const date = new Date(record.acq_date) ?? new Date();

            interface ConfidenceLevels {
                [key: string]: {
                    [key: string]: string;
                };
            }
            enum Confidence {
                High = "high",
                Medium = "medium",
                Low = "low",
            }
            const confidenceLevels: ConfidenceLevels = {
                "MODIS": {
                    "h": Confidence.High,
                    "m": Confidence.Medium,
                    "l": Confidence.Low,
                },
                "VIIRS": {
                    "h": Confidence.High,
                    "n": Confidence.Medium, // is this correct?
                    "l": Confidence.Low,
                },
                "LANDSAT": {
                    "H": Confidence.High,
                    "M": Confidence.Medium,
                    "L": Confidence.Low,
                },
                "GEOSTATIONARY": {
                    "10": Confidence.High,
                    "30": Confidence.High,
                    "11": Confidence.High,
                    "31": Confidence.High,
                    "13": Confidence.High,
                    '33': Confidence.High,
                    '14': Confidence.High,
                    '34': Confidence.High,
                    "12": Confidence.Medium,
                    "15": Confidence.Low,
                    "35": Confidence.Low
                },
            }

            return {
                type: AlertType.fire,
                latitude: latitude,
                longitude: longitude,
                eventDate: date,
                confidence: confidenceLevels?.[source]?.[record.confidence] ?? Confidence.Medium,
                detectedBy: source,
                data: record
            };
        }

        return new Promise<GeoEvent[]>(async (resolve, reject) => {
            try {
                const sourceKey = this.config?.sourceKey;
                const url = this.getUrl(sourceKey);
                const response = await fetch(url);
                const csv = await response.text();
                const parser = parse(csv, { columns: true });

                const records: GeoEvent[] = [];
                parser
                    .on("readable", () => {
                        let record: DataRecord;
                        while (record = parser.read()) {
                            records.push(normalize(record, record.instrument));
                        }
                    })
                    .on("end", () => {
                        resolve(records)
                    })
                    .on("error", error => {
                        throw new Error("Error parsing CSV file: " + error.message)
                    });
            } catch (error) {
                reject(error);
            }
        });
    }

    getUrl(source: string): string {
        const { apiUrl, mapKey, sourceKey } = this.getConfig()
        // TODO: revert the 2 lines below after testing
        // const currentDate = new Date().toISOString().split("T")[0];
        const currentDate = '2023-01-01';

        return `${apiUrl}/api/area/csv/${mapKey}/${source}/-180,-90,180,90/1/${currentDate}`;
    }

    getConfig(): NasaGeoEventProviderConfig {
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

        if (typeof config.sourceKey === 'undefined') {
            throw new Error(`Missing property 'sourceKey' in alert provider configuration`);
        }

        return {
            apiUrl: config.apiUrl,
            mapKey: config.mapKey,
            sourceKey: config.sourceKey
        }
    }
}

export default NasaGeoEventProvider;