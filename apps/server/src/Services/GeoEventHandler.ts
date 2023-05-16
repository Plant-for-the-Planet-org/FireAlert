import { PrismaClient } from '@prisma/client'
import GeoEvent from '../Interfaces/GeoEvent';
import { GeoEventsNotificationMessage } from '../Events/Messages/GeoEventsNotificationMessage';
import md5 from md5;

const handleGeoEvents = function (message: GeoEventsNotificationMessage) {
  const { source, geoEvents } = message;

  const buildChecksum = (geoEvent: GeoEvent): string => {
    return md5(geoEvent.latitude + geoEvent.longitude)
  }

  // TODO: add a hash/checksum to geoEvents
  // check duplicates by fetching all ids 
  geoEvents.forEach((geoEvent: GeoEvent) => {
    const id = buildChecksum(geoEvent)
    geoEvent.id = id;
  })

  fetchCurrentEventIds(source);
}


const fetchCurrentEventIds = function (source: string) {
  // the the ids of all events from AreaEvent that are either 'pending' or 'notfied'
  // having the provided providerKey
}

export default handleGeoEvents;