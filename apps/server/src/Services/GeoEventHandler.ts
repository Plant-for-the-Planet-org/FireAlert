import { PrismaClient } from '@prisma/client'
import GeoEvent from '../Interfaces/GeoEvent';
import { GeoEventsCreatedMessage } from '../Events/Messages/GeoEventsCreatedMessage';
import {GEO_EVENTS_PROCESSED} from '../Events/messageConstants' 
import geoEventEmitter from '../Events/EventEmitter/GeoEventEmitter'
import md5 from 'md5';

const processGeoEvents = function (message: GeoEventsCreatedMessage) {

  debugger;

  const fetchCurrentEventIds = function (source: string) {
    // the the ids of all events from AreaEvent that are either 'pending' or 'notfied'
    // having the provided providerKey
  }

  const { source, geoEvents } = message;

  const buildChecksum = (geoEvent: GeoEvent): string => {
    return md5(geoEvent.latitude.toString() + geoEvent.longitude.toString())
  }

  // TODO: add a hash/checksum to geoEvents
  // check duplicates by fetching all ids 
  geoEvents.forEach((geoEvent: GeoEvent) => {
    const id = buildChecksum(geoEvent)
    geoEvent.id = id;
  })

  fetchCurrentEventIds(source);

  // TODO: implement the storing of new GeoEvents

  // 

  geoEventEmitter.emit(GEO_EVENTS_PROCESSED)
}


export default processGeoEvents;