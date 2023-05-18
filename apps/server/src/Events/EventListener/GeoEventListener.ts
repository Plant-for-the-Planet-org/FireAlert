import { GEO_EVENTS_CREATED, GEO_EVENTS_PROCESSED } from '../messageConstants'
import geoEventEmitter from '../EventEmitter/GeoEventEmitter';
import processGeoEvents from '../../Services/GeoEventHandler';
import matchGeoEvents from '../../Services/GeoEventMatcher'

geoEventEmitter.on(GEO_EVENTS_CREATED, processGeoEvents);
geoEventEmitter.on(GEO_EVENTS_PROCESSED, matchGeoEvents);