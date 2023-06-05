import EventEmitter from "eventemitter3"
import { GeoEvent, GeoEventSource } from "@prisma/client";
import { GEO_EVENTS_CREATED } from '../messageConstants'
import processGeoEvents from '../../Services/GeoEvent/GeoEventHandler';

const geoEventEmitter = new EventEmitter();

geoEventEmitter
    .on(GEO_EVENTS_CREATED, (providerKey: GeoEventSource, identityGroup: string, geoEventProviderId:string, geoEvents: Array<GeoEvent>) => {
        processGeoEvents(providerKey, identityGroup, geoEventProviderId, geoEvents)
    })

export default geoEventEmitter;