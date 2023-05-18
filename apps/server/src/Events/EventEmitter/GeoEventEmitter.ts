import EventEmitter from "eventemitter3"
import { GEO_EVENTS_CREATED, GEO_EVENTS_PROCESSED } from '../messageConstants'
import { GeoEventsCreatedMessage } from '../Messages/GeoEventsCreatedMessage'
import processGeoEvents from '../../Services/GeoEventHandler';
import matchGeoEvents from '../../Services/GeoEventMatcher'

const geoEventEmitter = new EventEmitter();

geoEventEmitter
    .on(GEO_EVENTS_CREATED, (message: GeoEventsCreatedMessage) => {
        processGeoEvents(message)
    })
    .on(GEO_EVENTS_PROCESSED, matchGeoEvents);

export default geoEventEmitter;