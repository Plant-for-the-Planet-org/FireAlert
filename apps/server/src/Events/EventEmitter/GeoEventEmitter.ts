import EventEmitter from "eventemitter3"
import { GeoEvent, GeoEventSource } from "@prisma/client";
import { GEO_EVENTS_CREATED, GEO_EVENTS_PROCESSED } from '../messageConstants'
import processGeoEvents from '../../Services/GeoEventHandler';
import matchGeoEvents from '../../Services/GeoEventMatcher'

const geoEventEmitter = new EventEmitter();

geoEventEmitter
    .on(GEO_EVENTS_CREATED, (providerKey: GeoEventSource, identityGroup: string, geoEvents: Array<GeoEvent>) => {
        processGeoEvents(providerKey, identityGroup, geoEvents)
    })
    .on(GEO_EVENTS_PROCESSED, matchGeoEvents);

export default geoEventEmitter;