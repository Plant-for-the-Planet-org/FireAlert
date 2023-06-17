import {
  type GeoEventProviderConfig,
  type GeoEventProviderClientId,
  type GeoEventProviderConfigGeneral,
  type GeoEventProviderClass,
} from '../../../Interfaces/GeoEventProvider';
import {type geoEventInterface as GeoEvent} from '../../../Interfaces/GeoEvent';
import {parse} from 'csv-parse';
import {AlertType} from '../../../Interfaces/SiteAlert';
import type DataRecord from '../../../Interfaces/DataRecord';
import {Confidence} from '../../../Interfaces/GeoEvent';

interface NasaGeoEventProviderConfig extends GeoEventProviderConfig {}

class NasaGeoEventProviderClass implements GeoEventProviderClass {
  private config: GeoEventProviderConfigGeneral | undefined;

  constructor() {
    this.getLatestGeoEvents = this.getLatestGeoEvents.bind(this);
  }

  getKey(): string {
    return 'FIRMS';
  }

  initialize(config?: GeoEventProviderConfigGeneral): void {
    this.config = config;
  }

  async getLatestGeoEvents(
    geoEventProviderClientId: string,
    geoEventProviderId: string,
    slice: string,
    clientApiKey: string,
  ): Promise<GeoEvent[]> {
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
        MODIS: {
          h: Confidence.High,
          m: Confidence.Medium,
          l: Confidence.Low,
        },
        VIIRS: {
          h: Confidence.High,
          n: Confidence.Medium, // is this correct?
          l: Confidence.Low,
        },
        LANDSAT: {
          H: Confidence.High,
          M: Confidence.Medium,
          L: Confidence.Low,
        },
        GEOSTATIONARY: {
          '10': Confidence.High,
          '30': Confidence.High,
          '11': Confidence.High,
          '31': Confidence.High,
          '13': Confidence.High,
          '33': Confidence.High,
          '14': Confidence.High,
          '34': Confidence.High,
          '12': Confidence.Medium,
          '15': Confidence.Low,
          '35': Confidence.Low,
        },
      };

      return {
        type: AlertType.fire,
        latitude: latitude,
        longitude: longitude,
        eventDate: date,
        confidence:
          (confidenceLevels?.[source]?.[record.confidence] as Confidence) ??
          Confidence.Medium,
        geoEventProviderId: geoEventProviderId,
        slice: slice,
        geoEventProviderClientId:
          geoEventProviderClientId as GeoEventProviderClientId,
        data: record,
      };
    };

    return new Promise<GeoEvent[]>(async (resolve, reject) => {
      try {
        const url = this.getUrl(
          clientApiKey,
          geoEventProviderClientId as GeoEventProviderClientId,
        );
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csv = await response.text();
        const parser = parse(csv, {columns: true});

        const records: GeoEvent[] = [];
        let recordCount = 0;

        parser
          .on('readable', () => {
            let record: DataRecord;
            while ((record = parser.read())) {
              records.push(normalize(record, record.instrument));
              recordCount++;
            }
          })
          .on('end', () => {
            resolve(records);
          })
          .on('error', error => {
            reject(new Error('Error parsing CSV file: ' + error.message));
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  getUrl(clientApiKey: string, clientId: GeoEventProviderClientId): string {
    const {apiUrl, bbox} = this.getConfig();
    // const currentDate = new Date().toISOString().split("T")[0];
    // If Date isn't passed API returns most recent data
    return `${apiUrl}/api/area/csv/${clientApiKey}/${clientId}/${bbox}/1/`;
  }

  getConfig(): NasaGeoEventProviderConfig {
    if (typeof this.config === 'undefined') {
      throw new Error(`Invalid or incomplete alert provider configuration`);
    }
    const config = this.config;
    if (typeof config.apiUrl === 'undefined') {
      throw new Error(
        `Missing property 'apiUrl' in alert provider configuration`,
      );
    }
    if (typeof config.bbox === 'undefined') {
      throw new Error(
        `Missing property 'bbox' in alert provider configuration`,
      );
    }
    if (typeof config.slice === 'undefined') {
      throw new Error(
        `Missing property 'slice' in alert provider configuration`,
      );
    }
    if (typeof config.client === 'undefined') {
      throw new Error(
        `Missing property 'client' in alert provider configuration`,
      );
    }

    return {
      client: config.client,
      bbox: config.bbox,
      slice: config.slice,
      apiUrl: config.apiUrl,
    };
  }
}

export default NasaGeoEventProviderClass;
