import type {Confidence} from './GeoEvent';

interface DataRecord {
  longitude: string;
  latitude: string;
  acq_date: string;
  acq_time: number;
  confidence: Confidence | string;
  [key: string]: any;
}

export default DataRecord;
