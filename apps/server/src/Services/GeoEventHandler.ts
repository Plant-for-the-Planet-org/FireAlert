import { PrismaClient } from "@prisma/client";
import { GEO_EVENTS_PROCESSED } from "../Events/messageConstants";
// import GeoEvent from "../Interfaces/GeoEvent";
import geoEventEmitter from "../Events/EventEmitter/GeoEventEmitter";
import md5 from "md5";
import { GeoEvent } from "@prisma/client";

const processGeoEvents = async (
  detectedBy: "MODIS" | "VIIRS" | "LANDSAT" | "GEOSTATIONARY",
  geoEvents: Array<GeoEvent>
) => {
  const buildChecksum = (geoEvent: GeoEvent): string => {
    return md5(
      geoEvent.type +
      geoEvent.latitude.toString() +
      geoEvent.longitude.toString() +
      geoEvent.eventDate.toISOString() +
      geoEvent.detectedBy
    );
  };

  const compareIds = (currentEventIds: string[], detectedEvents: GeoEvent[]): {
    newGeoEvents: GeoEvent[];
    deletedIds: string[];
  } => {
    const newGeoEvents: GeoEvent[] = [];
    const detectedIds: string[] = [];
    const deletedIds: string[] = [];

    // Identify new hashes
    detectedEvents.forEach((detectedEvent: GeoEvent) => {
      const id = buildChecksum(detectedEvent);
      detectedIds.push(id);
      if (!currentEventIds.includes(id)) {
        detectedEvent.id = id;
        newGeoEvents.push(detectedEvent);
      }
    });

    // Identify existing hashes
    currentEventIds.forEach((currentId) => {
      if (detectedIds.includes(currentId)) {
        deletedIds.push(currentId);
      }
    });

    return { newGeoEvents, deletedIds };
  };

  const prisma = new PrismaClient();

  const fetchCurrentEventIds = async (
    detectedBy: "MODIS" | "VIIRS" | "LANDSAT" | "GEOSTATIONARY"
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

  const { newGeoEvents, deletedIds } = compareIds(await fetchCurrentEventIds(detectedBy), geoEvents);

  // Create new GeoEvents in the database
  // TODO: save GeoEvents stored in newGeoEvents to the database
  if (newGeoEvents.length > 0) {
    await prisma.geoEvent.createMany({
      data: newGeoEvents.map((geoEvent) => ({
        id: geoEvent.id,
        type: geoEvent.type,
        latitude: geoEvent.latitude,
        longitude: geoEvent.longitude,
        eventDate: geoEvent.eventDate,
        confidence: geoEvent.confidence,
        isProcessed: false,
        source: geoEvent.source,
        detectedBy: detectedBy,
        radius: geoEvent.radius,
        data: JSON.stringify(geoEvent.data),
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

  geoEventEmitter.emit(GEO_EVENTS_PROCESSED);
};

export default processGeoEvents;
