import EventEmitter from "eventemitter3"
import { GeoEvent, GeoEventSource } from "@prisma/client";
import { GEO_EVENTS_CREATED } from '../messageConstants'
import processGeoEvents from '../../Services/GeoEvent/GeoEventHandler';

const geoEventEmitter = new EventEmitter();

geoEventEmitter
    .on(GEO_EVENTS_CREATED, (providerKey: GeoEventSource, identityGroup: string, geoEventProviderId:string, slice: string, geoEvents: Array<GeoEvent>) => {
        processGeoEvents(providerKey, identityGroup, geoEventProviderId, slice, geoEvents)
    })

export default geoEventEmitter;