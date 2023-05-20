import { PrismaClient } from "@prisma/client";
import { GEO_EVENTS_PROCESSED } from "../Events/messageConstants";
import GeoEvent from "../Interfaces/GeoEvent";
import geoEventEmitter from "../Events/EventEmitter/GeoEventEmitter";
import md5 from "md5";

const processGeoEvents = async (
  detectedBy: string,
  geoEvents: Array<GeoEvent>
) => {
  debugger;

  const buildChecksum = (geoEvent: GeoEvent): string => {
    return md5(
      geoEvent.type +
        geoEvent.latitude.toString() +
        geoEvent.longitude.toString() +
        geoEvent.eventDate.toISOString() +
        geoEvent.detectedBy
    );
  };

  const compareHashes = (
    currentEventIds: string[],
    newEventIds: string[]
  ): {
    newHashes: string[];
    existingHashes: string[];
    deletedHashes: string[];
  } => {
    const newHashes: string[] = [];
    const existingHashes: string[] = [];
    const deletedHashes: string[] = [];

    // Identify new hashes
    newEventIds.forEach((newHash) => {
      if (!currentEventIds.includes(newHash)) {
        newHashes.push(newHash);
      }
    });

    // Identify existing hashes
    currentEventIds.forEach((currentHash) => {
      if (newEventIds.includes(currentHash)) {
        existingHashes.push(currentHash);
      } else {
        deletedHashes.push(currentHash);
      }
    });

    return { newHashes, existingHashes, deletedHashes };
  };

  const prisma = new PrismaClient();

  const fetchCurrentEventIds = async (
    detectedBy: string
  ): Promise<Array<string>> => {
    // the the ids of all events from AreaEvent that are either 'pending' or 'notfied'
    // having the provided providerKey
    const geoEvents = await prisma.geoEvent.findMany({
      select: {
        id: true,
      },
      where: {
        detectedBy: detectedBy,
      },
    });

    return geoEvents.map((geoEvent) => geoEvent.id);
  };

  const { newHashes, existingHashes, deletedHashes } = compareHashes(
    await fetchCurrentEventIds(detectedBy),
    geoEvents.map((geoEvent: GeoEvent) => {
      return buildChecksum(geoEvent);
    })
  );

  // TODO:
  //  - implement the storing of new GeoEvents

  //  - implement the deletion of obsolete GeoEvents (mark as obsolete)

  
  geoEventEmitter.emit(GEO_EVENTS_PROCESSED);
};

export default processGeoEvents;
