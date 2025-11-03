import {type GeoEventProviderClientId} from '../../Interfaces/GeoEventProvider';
import {AlertType} from '../../Interfaces/SiteAlert';
import {type geoEventInterface as GeoEvent} from '../../Interfaces/GeoEvent';
import {createXXHash3} from 'hash-wasm';
import {prisma} from '../../server/db';

/**
 * Result interface for geo-event processing operations
 */
export interface GeoEventProcessingResult {
  geoEventCount: number;
  newGeoEventCount: number;
  processingDuration?: number;
  errors?: string[];
}

/**
 * Processes geo-events by deduplicating and storing them in the database
 * @param geoEventProviderClientId - The client ID of the geo-event provider
 * @param geoEventProviderId - The unique ID of the provider
 * @param slice - The geographic slice identifier
 * @param geoEvents - Array of geo-events to process
 * @returns Processing result with counts, duration, and any errors
 */
const processGeoEvents = async (
  geoEventProviderClientId: GeoEventProviderClientId,
  geoEventProviderId: string,
  slice: string,
  geoEvents: GeoEvent[],
): Promise<GeoEventProcessingResult> => {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    const hasher = await createXXHash3(); // Create the hasher outside the function
    const buildChecksum = (geoEvent: GeoEvent): string => {
      hasher.init(); // Reset the hasher
      return hasher
        .update(
          geoEvent.type +
            geoEvent.latitude.toString() +
            geoEvent.longitude.toString() +
            geoEvent.eventDate.toISOString(),
        )
        .digest('hex');
    };

    // events from multiple sources but same satellite with the same geoEventProviderId will be considered duplicates

    // Check whether the fetchId already exists in the database and returns only the ones that are not in the database in the variable newGeoEvents
    const compareIds = async (
      dbEventIds: string[],
      fetchedEvents: GeoEvent[],
    ): Promise<GeoEvent[]> => {
      const newGeoEvents: GeoEvent[] = [];
      const dbEventIdsSet = new Set(dbEventIds); // convert array to Set for efficient lookup

      // Identify new hashes
      const fetchedIds = await Promise.all(fetchedEvents.map(buildChecksum)); // compute all checksums concurrently

      for (let i = 0; i < fetchedEvents.length; i++) {
        const id = fetchedIds[i];
        if (!dbEventIdsSet.has(id)) {
          fetchedEvents[i]!.id = id;
          newGeoEvents.push(fetchedEvents[i]!);
        }
      }
      return newGeoEvents;
    };

    const fetchDbEventIds = async (
      geoEventProviderId: string,
    ): Promise<Array<string>> => {
      try {
        // the the ids of all events from AreaEvent that are either 'pending' or 'notified'
        // having the provided providerKey
        const geoEvents = await prisma.geoEvent.findMany({
          select: {id: true},
          // IMPROVEMENT: this code does not identify duplicate between providers,
          // It only identifies duplicate within a provider
          // To identify duplicates between providers, remove geoEventProviderId from the where clause
          // However, that would increase memory usage, and possibly freeze the process
          // Identify ways to test for duplication against the entire database.
          where: {
            geoEventProviderId: geoEventProviderId,
            eventDate: {gt: new Date(Date.now() - 30 * 60 * 60 * 1000)},
          },
        });
        // Only compare with data from last 30 hrs
        return geoEvents.map(geoEvent => geoEvent.id);
      } catch (error) {
        const errorMessage = `Failed to fetch existing event IDs: ${
          error instanceof Error ? error.message : String(error)
        }`;
        errors.push(errorMessage);
        // Return empty array to continue processing
        return [];
      }
    };

    const newGeoEvents = await compareIds(
      await fetchDbEventIds(geoEventProviderId),
      geoEvents,
    );

    const filterDuplicateEvents = (newGeoEvents: GeoEvent[]): GeoEvent[] => {
      const filteredNewGeoEvents: GeoEvent[] = [];
      const idsSet: Set<string> = new Set();

      for (const geoEvent of newGeoEvents) {
        if (!idsSet.has(geoEvent.id!)) {
          filteredNewGeoEvents.push(geoEvent);
          idsSet.add(geoEvent.id!);
        }
      }
      return filteredNewGeoEvents;
    };

    const filteredDuplicateNewGeoEvents = filterDuplicateEvents(newGeoEvents);
    const countFilteredDuplicateNewGeoEvents =
      filteredDuplicateNewGeoEvents.length;

    let geoEventsCreated = 0;
    // Create new GeoEvents in the database
    if (filteredDuplicateNewGeoEvents.length > 0) {
      const geoEventsToBeCreated = filteredDuplicateNewGeoEvents.map(
        geoEvent => ({
          id: geoEvent.id,
          type: AlertType.fire,
          latitude: geoEvent.latitude,
          longitude: geoEvent.longitude,
          eventDate: geoEvent.eventDate,
          confidence: geoEvent.confidence,
          isProcessed: false,
          geoEventProviderClientId: geoEventProviderClientId,
          geoEventProviderId: geoEventProviderId,
          radius: geoEvent.radius ? geoEvent.radius : 0,
          slice:
            geoEventProviderClientId === 'GEOSTATIONARY'
              ? geoEvent.slice
              : slice,
          data: geoEvent.data,
        }),
      );

      // Take an array of GeoEvents to be created
      // Define a variable bulkSize with a value of 1000
      // Split the variable geoEventsToBeCreated into chunks of bulkSize
      // Insert each chunk into the database using prisma.geoEvent.createMany
      // Repeat until all chunks have been inserted
      // Return the number of GeoEvents created

      const bulkSize = 1000;
      for (let i = 0; i < geoEventsToBeCreated.length; i += bulkSize) {
        const chunk = geoEventsToBeCreated.slice(i, i + bulkSize);
        try {
          await prisma.geoEvent.createMany({
            data: chunk,
            skipDuplicates: true,
          });
          geoEventsCreated += chunk.length;
        } catch (error) {
          const errorMessage = `Failed to insert geo-events chunk (${i}-${
            i + chunk.length
          }): ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMessage);
          // Continue processing remaining chunks
        }
      }
    }

    const processingDuration = Date.now() - startTime;

    return {
      geoEventCount: geoEventsCreated,
      newGeoEventCount: countFilteredDuplicateNewGeoEvents,
      processingDuration,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    // Catch any unexpected errors
    const errorMessage = `Unexpected error in processGeoEvents: ${
      error instanceof Error ? error.message : String(error)
    }`;
    errors.push(errorMessage);

    const processingDuration = Date.now() - startTime;

    return {
      geoEventCount: 0,
      newGeoEventCount: 0,
      processingDuration,
      errors,
    };
  }
};

export default processGeoEvents;
