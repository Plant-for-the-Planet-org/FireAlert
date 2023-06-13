import EventEmitter from "eventemitter3"
import { GeoEvent, GeoEventSource } from "@prisma/client";
import { CREATE_GEO_EVENTS } from '../messageConstants'
import processGeoEvents from '../../Services/GeoEvent/GeoEventHandler';

const geoEventEmitter = new EventEmitter();

geoEventEmitter
    .on(CREATE_GEO_EVENTS, (providerKey: GeoEventSource, identityGroup: string, geoEventProviderId:string, slice: string, geoEvents: Array<GeoEvent>) => {
        processGeoEvents(providerKey, identityGroup, geoEventProviderId, slice, geoEvents)
    })

export default geoEventEmitter;