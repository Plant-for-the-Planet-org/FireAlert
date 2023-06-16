import { GeoEventProviderConfigGeneral, type GeoEventProvider } from '../../../Interfaces/GeoEventProvider';
import { type GeoEventProviderConfig } from '../../../Interfaces/GeoEventProvider';
import { GeoEventSource, type GeoEventData as GeoEvent } from "../../../Interfaces/GeoEvent"
import { parse } from 'csv-parse'
import { AlertType } from "../../../Interfaces/SiteAlert";
import type DataRecord from '../../../Interfaces/DataRecord';
import { Confidence } from '../../../Interfaces/GeoEvent';

interface NasaGeoEventProviderConfig extends GeoEventProviderConfig {
    mapKey: string,
    sourceKey: string
}

class NasaGeoEventProvider implements GeoEventProvider {

    private config: GeoEventProviderConfigGeneral | undefined;

    constructor() {
        this.getLatestGeoEvents = this.getLatestGeoEvents.bind(this);
    }

    getKey(): string {
        return 'FIRMS';
    }

    getIdentityGroup(): string {
        const identityMap = new Map<string, string>([
            ["MODIS_NRT", "MODIS"],
            ["VIIRS_NOAA20_NRT", "VIIRS"],
            ["VIIRS_SNPP_NRT", "VIIRS"],
            ["LANDSAT_NRT", "LANDSAT"],
            ["GEOSTATIONARY", "GEOSTATIONARY"],
            ["MODIS_SP", "MODIS"],
            ["VIIRS_SNPP_SP", "VIIRS"],
        ]);
        // this returned Identity group is being used as a detectedBy in siteAlert.
        return identityMap.get(this.config!.sourceKey)!;
    }


    initialize(config?: GeoEventProviderConfigGeneral): void {
        this.config = config;
    }

    async getLatestGeoEvents(providerKey: string, geoEventProviderId: string, slice: string): Promise<GeoEvent[]> {
        const normalize = (record: DataRecord, source: string): GeoEvent => {
            const longitude = parseFloat(record.longitude);
            const latitude = parseFloat(record.latitude);
            // Use both acq_date and acq_time to construct date for new geoEvent
            const [year, month, day] = record.acq_date.split('-');
            // acq_time is in a format of time, where '44' means 00:44, and '2309' means 23:09
            const time = record.acq_time;
            const hours = Math.floor(time / 100); // Extract hours from the time
            const minutes = time % 100; // Extract minutes from the time
            const date = new Date(year, month - 1, day, hours, minutes) ?? new Date();

            interface ConfidenceLevels {
                [key: string]: {
                    [key: string]: string;
                };
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
                confidence: confidenceLevels?.[source]?.[record.confidence] as Confidence ?? Confidence.Medium,
                identityGroup: source,
                geoEventProviderId: geoEventProviderId,
                slice: slice,
                providerKey: providerKey as GeoEventSource,
                data: record
            };
        }

        return new Promise<GeoEvent[]>(async (resolve, reject) => {
            try {
                const url = this.getUrl();
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const csv = await response.text();
                const parser = parse(csv, { columns: true });

                const records: GeoEvent[] = [];
                let recordCount = 0;

                parser
                    .on("readable", () => {
                        let record: DataRecord;
                        while (record = parser.read()) {
                            records.push(normalize(record, record.instrument));
                            recordCount++;
                        }
                    })
                    .on("end", () => {
                        resolve(records)
                    })
                    .on("error", error => {
                        reject(new Error("Error parsing CSV file: " + error.message))
                    });
            } catch (error) {
                reject(error);
            }
        });
    }

    getUrl(): string {
        const { apiUrl, mapKey, sourceKey, bbox } = this.getConfig()
        // const currentDate = new Date().toISOString().split("T")[0];
        // If Date isn't passed API returns most recent data
        return `${apiUrl}/api/area/csv/${mapKey}/${sourceKey}/${bbox}/1/`;
    }

    getConfig(): NasaGeoEventProviderConfig {
        if (typeof this.config === 'undefined') {
            throw new Error(`Invalid or incomplete alert provider configuration`);
        }
        const config = this.config
        if (typeof config.apiUrl === "undefined") {
            throw new Error(`Missing property 'apiUrl' in alert provider configuration`);
        }
        if (typeof config.mapKey === "undefined") {
            throw new Error(`Missing property 'mapKey' in alert provider configuration`);
        }
        if (typeof config.sourceKey === "undefined") {
            throw new Error(`Missing property 'sourceKey' in alert provider configuration`);
        }
        if (typeof config.bbox === "undefined") {
            throw new Error(`Missing property 'bbox' in alert provider configuration`);
        }
        if (typeof config.slice === "undefined") {
            throw new Error(`Missing property 'slice' in alert provider configuration`);
        }

        return {
            bbox: config.bbox,
            slice: config.slice,
            apiUrl: config.apiUrl,
            mapKey: config.mapKey,
            sourceKey: config.sourceKey
        }
    }
}

export default NasaGeoEventProvider;