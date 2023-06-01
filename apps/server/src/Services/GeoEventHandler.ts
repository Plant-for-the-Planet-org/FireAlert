import { AlertType, type GeoEventSource, PrismaClient } from "@prisma/client";
import { GEO_EVENTS_PROCESSED } from "../Events/messageConstants";
// import GeoEvent from "../Interfaces/GeoEvent";
import { type GeoEvent } from "@prisma/client";
import geoEventEmitter from "../Events/EventEmitter/GeoEventEmitter";
import md5 from "md5";

const processGeoEvents = async (providerKey: GeoEventSource, identityGroup: string, geoEvents: Array<GeoEvent>) => {
  const buildChecksum = (geoEvent: GeoEvent): string => {
    return md5(
      geoEvent.type +
      geoEvent.latitude.toString() +
      geoEvent.longitude.toString() +
      geoEvent.eventDate.toISOString()
    );
  };

  const compareIds = (dbEventIds: string[], fetchedEvents: GeoEvent[]): {
    newGeoEvents: GeoEvent[];
    // DeletedIds are those ids in the database, that are not being reported anymore, so the fire has probably ceased.
    deletedIds: string[];
  } => {
    const newGeoEvents: GeoEvent[] = [];
    const fetchedIds: string[] = [];
    const deletedIds: string[] = [];

    // Identify new hashes
    fetchedEvents.forEach((fetchedEvent: GeoEvent) => {
      const id = buildChecksum(fetchedEvent);
      fetchedIds.push(id);
      if (!dbEventIds.includes(id)) {
        fetchedEvent.id = id;
        newGeoEvents.push(fetchedEvent);
      }
    });

    // Identify existing hashes
    dbEventIds.forEach((dbEventId) => {
      if (!fetchedIds.includes(dbEventId)) {
        deletedIds.push(dbEventId);
      }
    });
    return { newGeoEvents, deletedIds };
  };

  const prisma = new PrismaClient();

  const fetchDbEventIds = async (
    identityGroup: string
  ): Promise<Array<string>> => {
    // the the ids of all events from AreaEvent that are either 'pending' or 'notfied'
    // having the provided providerKey
    const geoEvents = await prisma.geoEvent.findMany({
      select: { id: true },
      where: { identityGroup: identityGroup }
    });

    return geoEvents.map(geoEvent => geoEvent.id);
  };

  const { newGeoEvents, deletedIds } = compareIds(await fetchDbEventIds(identityGroup), geoEvents);

  const filterDuplicateEvents = (newGeoEvents: GeoEvent[]): GeoEvent[] => {
    const filteredNewGeoEvents: GeoEvent[] = [];
    const idsSet: Set<string> = new Set();
  
    for (const geoEvent of newGeoEvents) {
      if (!idsSet.has(geoEvent.id)) {
        filteredNewGeoEvents.push(geoEvent);
        idsSet.add(geoEvent.id);
      }
    }
  
    return filteredNewGeoEvents;
  };

  const filteredDuplicateNewGeoEvents = filterDuplicateEvents(newGeoEvents)
  
  // Create new GeoEvents in the database
  // TODO: save GeoEvents stored in newGeoEvents to the database
  if (filteredDuplicateNewGeoEvents.length > 0) {
    await prisma.geoEvent.createMany({
      data: filteredDuplicateNewGeoEvents.map(geoEvent => ({
        id: geoEvent.id,
        type: AlertType.fire,
        latitude: geoEvent.latitude,
        longitude: geoEvent.longitude,
        eventDate: geoEvent.eventDate,
        confidence: geoEvent.confidence,
        isProcessed: false,
        providerKey: providerKey,
        identityGroup: identityGroup,
        radius: 0,
        data: geoEvent.data,
      })),
    });
  }
  // Update deleted GeoEvents identified by deletedIdsHashes (set isProcessed to true)
  if (deletedIds.length > 0) {
    await prisma.geoEvent.updateMany({
      where: {
        id: { in: deletedIds },
      },
      data: {
        isProcessed: true,
      },
    });
  }

  geoEventEmitter.emit(GEO_EVENTS_PROCESSED, identityGroup);
};

export default processGeoEvents;
