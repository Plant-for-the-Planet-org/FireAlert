import {
    type GeoEventProviderConfig,
    type GeoEventProviderClientId,
    type GeoEventProviderConfigGeneral,
    type GeoEventProviderClass
} from '../../../Interfaces/GeoEventProvider';
import { type geoEventInterface as GeoEvent } from "../../../Interfaces/GeoEvent"
import {Confidence} from '../../../Interfaces/GeoEvent';
import {determineSlice} from "../../../utils/geometry"
import ee from '@google/earthengine'
import {logger} from "../../../server/logger"

type FireDataEntry = [number, number, Date];
type AllFireData = FireDataEntry[];
interface PrivateKeyJson {
    "type": string;
    "project_id": string;
    "private_key_id": string;
    "private_key": string;
    "client_email": string;
    "client_id": string;
    "auth_uri": string;
    "token_uri": string;
    "auth_provider_x509_cert_url": string;
    "client_x509_cert_url": string;
    "universe_domain": string;
}

interface GOES16GeoEventProviderConfig extends GeoEventProviderConfig {
    // Add any additional config properties if needed
    privateKey: PrivateKeyJson;
}

class GOES16GeoEventProviderClass implements GeoEventProviderClass {
    private config: GeoEventProviderConfigGeneral | undefined;

    constructor() {
        this.getLatestGeoEvents = this.getLatestGeoEvents.bind(this);
    }

    getKey(): string {
        return 'GOES-16';
    }

    initialize(config?: GeoEventProviderConfigGeneral): void {
        this.config = config;
    }

    async authenticateEarthEngine(): Promise<void> {
        const {privateKey} = this.getConfig()
        const private_key = JSON.parse(JSON.stringify(privateKey))
        return new Promise<void>((resolve, reject) => {
            ee.data.authenticateViaPrivateKey(
                private_key,
                () => {
                    ee.initialize(
                        null,
                        null,
                        () => {
                            console.log('Google Earth Engine authentication successful');
                            logger(`Google Earth Engine authentication successful`, "info");
                            resolve();
                        },
                        (err) => {
                            console.error('Google Earth Engine initialization error', err);
                            logger(`Google Earth Engine initialization error`, "error");
                            reject(err);
                        }
                    );
                },
                (err) => {
                    console.error('Google Earth Engine authentication error', err);
                    logger(`Google Earth Engine authentication error`, "error");
                    reject(err);
                }
            );
        });
    }

    async getLatestGeoEvents(geoEventProviderClientId: string, geoEventProviderId: string, slice: string, clientApiKey: string, lastRun: Date | null): Promise<GeoEvent[]> {
        return new Promise<GeoEvent[]>(async (resolve, reject) => {
            try {
                // Ensure Earth Engine is authenticated and initialized before fetching data
                await this.authenticateEarthEngine();
                let allFireData: AllFireData = [];
                
                // If lastRun is more than 2 hours ago or null, then start from 2 hours ago, else start from lastRunDate
                const currentDateTime = new Date();
                const lastRunDate = lastRun ? new Date(lastRun) : null;
                const twoHoursAgo = new Date(currentDateTime.getTime() - 2 * 3600 * 1000);
                const fromDateTime = (!lastRunDate || (currentDateTime.getTime() - lastRunDate.getTime()) > 2 * 3600 * 1000) ? twoHoursAgo : lastRunDate;

                const images = ee.ImageCollection("NOAA/GOES/16/FDCF").filterDate(fromDateTime, currentDateTime);
                logger(`Images from imagescollection: ${images}`, "info")
                // Fetch and process images here...
                // The process includes fetching image IDs, processing them to extract fire data, etc.
                // This is a simplified outline; integrate the logic from your initial example here.
                const getImagesId = () => {
                    return new Promise((resolve, reject) => {
                        images.evaluate((imageCollection) => {
                            if (imageCollection && imageCollection.features) {
                                const imagesData = imageCollection.features.map(feature => feature.id);
                                logger('Successfully retrieved image IDs', 'info');
                                resolve(imagesData);
                            } else {
                                logger('No features found in image collection', 'error');
                                reject(new Error("No features found"));
                            }
                        });
                    });
                };
                async function getDateTimeInfo(image) {
                    return new Promise((resolve, reject) => {
                        ee.Date(image.get('system:time_start')).getInfo((info, error) => {
                            if (error) {
                                reject(error);
                                return;
                            }
                            resolve(info);
                        });
                    });
                }
                try {
                    const array_imagesId = await getImagesId() as string[];
                    logger(`ImageIds ${array_imagesId}`,"info")
                    let i = 1
                    for (const imageId of array_imagesId) {
                        const image = ee.Image(`${imageId}`)
                        logger(`Image ${i}: ${image}`, "info")
                        const datetimeInfo = await getDateTimeInfo(image);
                        const datetime = new Date(datetimeInfo.value);
                        logger(`Image ${i} datetimeInfo: ${datetimeInfo}`, "info")
                        logger(`Image ${i} datetime: ${datetime}`, "info")
                        
                        
                    

                        const temperatureImage = image.select('Temp');
                        logger(`Image ${i} temperatureImage: ${temperatureImage}`, "info")
                        const xMin = -142;  // On station as GOES-E
                        const xMax = xMin + 135;
                        const geometry = ee.Geometry.Rectangle([xMin, -65, xMax, 65], null, true);
                        var temperatureVector = temperatureImage.reduceToVectors({
                            geometry: geometry,
                            scale: 2000,
                            geometryType: 'centroid',
                            labelProperty: 'temp',
                            maxPixels: 1e10,
                        });
                        logger(`Image ${i} temperatureVector: ${temperatureVector}`, "info")
                        const fireData = await new Promise((resolve, reject) => {
                            temperatureVector.evaluate((featureCollection) => {
                                if (featureCollection && featureCollection.features) {
                                    // Map each feature to include datetime in its data
                                    // [long, lat, eventDate]
                                    const fireDataWithTime = featureCollection.features.map(feature => [...feature.geometry.coordinates, datetime]);
                                    logger(`Image ${i}: fireDataWithTime`, "info")
                                    resolve(fireDataWithTime);
                                } else {
                                    logger(`Image ${i}: No features found`, "info")          
                                    reject(new Error("No features found"));
                                }
                            });
                        }) as FireDataEntry;
                        logger(`Image ${i} fireData: ${fireData}`, "info")
                        // Concatenate the current image's fire data with the master array
                        allFireData = allFireData.concat(fireData);
                        logger(`Image ${i} allFireData: ${allFireData}`, "info")
                        i++;
                    };
                } catch (error) {
                    console.error("Error fetching fire data:", error);
                    logger(`Error fetching fire data: ${error}`, "error");
                }

                // Normalize the fire data into GeoEvent format
                const geoEventsData: GeoEvent[] = allFireData.map((fireData: FireDataEntry) => ({
                    type: 'fire',
                    latitude: fireData[1],
                    longitude: fireData[0],
                    eventDate: new Date(fireData[2]),
                    confidence: Confidence.High,
                    isProcessed: false,
                    geoEventProviderClientId: geoEventProviderClientId as GeoEventProviderClientId,
                    geoEventProviderId: geoEventProviderId,
                    slice: determineSlice(fireData[1], fireData[0]),
                    data: {'satellite': clientApiKey, 'slice': slice}
                }));

                resolve(geoEventsData);
            } catch (error) {
                console.error('Failed to fetch or process GOES-16 data', error);
                logger(`Failed to fetch or process GOES-16 data`, "error");
                reject(error);
            }
        });
    }

    getConfig(): GOES16GeoEventProviderConfig {
        if (typeof this.config === 'undefined') {
            throw new Error(`Invalid or incomplete GOES-16 event provider configuration`);
        }
        const config = this.config
        if (typeof config.client === "undefined") {
            throw new Error(`Missing property 'client' in alert provider configuration`);
        }
        if (typeof config.bbox === "undefined") {
            throw new Error(`Missing property 'bbox' in alert provider configuration`);
        }
        if (typeof config.slice === "undefined") {
            throw new Error(`Missing property 'slice' in alert provider configuration`);
        }
        if (typeof config.privateKey === "undefined") {
            throw new Error(`Missing property 'satelliteType' in alert provider configuration`);
        }
        return {
            client: config.client,
            bbox: config.bbox,
            slice: config.slice,
            privateKey: config.privateKey
        };
    }
}

export default GOES16GeoEventProviderClass;
