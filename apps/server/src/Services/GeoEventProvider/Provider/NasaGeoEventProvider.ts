import GeoEventProvider from '../GeoEventProvider';
import GeoEventProviderConfig from '../GeoEventProviderConfig';
import GeoEvent from "../../../Interfaces/GeoEvent"
import { parse } from 'csv-parse'

interface NasaGeoEventProviderConfig {
    apiUrl: string,
    mapKey: string
}

interface CsvRecord {
    [key: string]: any;
}

class NasaGeoEventProvider implements GeoEventProvider {

    private config: GeoEventProviderConfig | undefined;

    getSources(): Array<string> {
        return ['MODIS_NRT', 'MODIS_SP', 'VIIRS_NOAA20_NRT', 'VIIRS_SNPP_NRT', 'VIIRS_SNPP_SP', 'LANDSAT_NRT'];
    }

    initialize(config?: GeoEventProviderConfig): void {
        this.config = config;
    }

    async getLatestGeoEvents(source: string): Promise<GeoEvent[]> {

        const normalize = (record: CsvRecord, source: string): GeoEvent => {
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
                latitude: latitude,
                longitude: longitude,
                date: date,
                confidence: confidenceLevels ? [source][record.confidence],
                detectedBy: source,
            };
        }

        return new Promise<GeoEvent[]>(async (resolve, reject) => {
            try {
                debugger;
                const response = await fetch(this.getUrl(source));
                const csv = await response.text();
                const parser = parse(csv, { columns: true });

                const records: GeoEvent[] = [];
                parser
                    .on("readable", () => {
                        let record: CsvRecord;
                        while (record = parser.read()) {
                            records.push(normalize(record, source));
                        }
                    })
                    .on("end", () => resolve(records))
                    .on("error", error => {
                        throw new Error("Error parsing CSV file: " + error.message)
                    });
            } catch (error) {
                reject(error);
            }
        });
    }

    getUrl(source: string): string {
        const { apiUrl, mapKey } = this.getConfig()
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

        return {
            apiUrl: config.apiUrl,
            mapKey: config.mapKey
        }
    }
}

export default NasaGeoEventProvider;