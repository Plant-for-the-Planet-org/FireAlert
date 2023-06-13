import { AlertType, type GeoEventSource } from "@prisma/client";
import { type GeoEvent } from "@prisma/client";
import md5 from "md5";
import { prisma } from '../../server/db'
import createSiteAlerts from "../SiteAlert/CreateSiteAlert";
// import { CREATE_SITE_ALERTS } from "../../Events/messageConstants";
// import siteAlertEmitter from "../../Events/EventEmitter/SiteAlertEmitter";
// import GeoEvent from "../Interfaces/GeoEvent";

const processGeoEvents = async (providerKey: GeoEventSource, identityGroup: string | null, geoEventProviderId: string, slice: string, geoEvents: Array<Partial<GeoEvent>>) => {
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

  console.log(`Slice ${slice}: ${providerKey} Found ${filteredDuplicateNewGeoEvents.length} new Geo Events`)
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
    console.log(`Slice ${slice}: ${providerKey} Created ${geoEventsCreatedCount} Geo Events`)
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
  return geoEventsCreatedCount;
};

export default processGeoEvents;
