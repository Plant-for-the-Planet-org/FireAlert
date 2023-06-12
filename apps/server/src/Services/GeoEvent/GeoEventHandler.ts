import { AlertType, type GeoEventSource, PrismaClient } from "@prisma/client";
import { SITE_ALERTS_CREATED } from "../../Events/messageConstants";
// import GeoEvent from "../Interfaces/GeoEvent";
import { type GeoEvent } from "@prisma/client";
import siteAlertEmitter from "../../Events/EventEmitter/SiteAlertEmitter";
import md5 from "md5";

const processGeoEvents = async (providerKey: GeoEventSource, identityGroup: string, geoEventProviderId: string, slice: string, geoEvents: Array<GeoEvent>) => {
  const buildChecksum = (geoEvent: GeoEvent): string => {
    return md5(
      geoEvent.type +
      geoEvent.latitude.toString() +
      geoEvent.longitude.toString() +
      geoEvent.eventDate.toISOString()
    );
  };
  // events from multiple sources but same satellite with the same geoEventProviderId will be considered duplicates

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
    geoEventProviderId: string
  ): Promise<Array<string>> => {
    // the the ids of all events from AreaEvent that are either 'pending' or 'notfied'
    // having the provided providerKey
    const geoEvents = await prisma.geoEvent.findMany({
      select: { id: true },
      where: { geoEventProviderId: geoEventProviderId }
    });
    return geoEvents.map(geoEvent => geoEvent.id);
  };

  const { newGeoEvents, deletedIds } = compareIds(await fetchDbEventIds(geoEventProviderId), geoEvents);

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

  console.log(`Found ${filteredDuplicateNewGeoEvents.length} non-duplicate geoEvents for geoEventProvider No.${geoEventProviderId}`)
  let geoEventsCreatedCount: number = 0;
  // Create new GeoEvents in the database
  // TODO: save GeoEvents stored in newGeoEvents to the database
  if (filteredDuplicateNewGeoEvents.length > 0) {
    const geoEventsToBeCreated = filteredDuplicateNewGeoEvents.map(geoEvent => ({
      id: geoEvent.id,
      type: AlertType.fire,
      latitude: geoEvent.latitude,
      longitude: geoEvent.longitude,
      eventDate: geoEvent.eventDate,
      confidence: geoEvent.confidence,
      isProcessed: false,
      providerKey: providerKey,
      identityGroup: identityGroup,
      geoEventProviderId: geoEventProviderId,
      radius: 0,
      slice: slice,
      data: geoEvent.data,
    }))
    const geoEventsCreated = await prisma.geoEvent.createMany({
      data: geoEventsToBeCreated,
    });
    geoEventsCreatedCount = geoEventsCreated.count
    console.log(`Created ${geoEventsCreatedCount} geoEvents for geoEventProvider No.${geoEventProviderId}`)
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
  if(geoEventsCreatedCount > 0){
    siteAlertEmitter.emit(SITE_ALERTS_CREATED, geoEventProviderId, slice);
  } else {
    console.log(`No geoEvents created. Terminate cron for geoEventProvider No.${geoEventProviderId}`)
    return;
  }
};

export default processGeoEvents;
