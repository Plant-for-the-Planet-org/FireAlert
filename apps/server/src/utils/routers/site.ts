import {TRPCError} from '@trpc/server';
import {
  type CheckUserHasSitePermissionArgs,
  type CheckIfPlanetROSiteArgs,
} from '../../Interfaces/Site';
import {type Site, SiteAlert, AlertConfidence} from '@prisma/client';
import {prisma} from '../../../src/server/db';

export type MultiPolygonInfo = {
  name: string;
  numberOfPolygons: number
}

export type UserInfo = {
  email: string;
  name: string | null;
  multiPolygon: MultiPolygonInfo[]
}

type Coordinate = [number, number]; // A pair representing longitude and latitude
type LinearRing = Coordinate[]; // A LinearRing is an array of Coordinates
type PolygonCoordinates = LinearRing[]; // Array of LinearRings
type MultiPolygonCoordinates = PolygonCoordinates[]; // Array of PolygonCoordinates for a MultiPolygon

export type MultiPolygonGeometry = {
  type: string; // Should be 'MultiPolygon'
  coordinates: MultiPolygonCoordinates; // Array of arrays of LinearRings
};
type PolygonGeometry = {
  type: string; // Should be 'Polygon'
  coordinates: PolygonCoordinates; // Array of LinearRings
};

export type CreatePolygonSiteData = {
  origin: string;
  type: 'Polygon';
  name: string;
  geometry: PolygonGeometry;
  radius: number;
  isMonitored: boolean;
  userId: string;
  lastUpdated: Date;
  projectId?: string;
  remoteId?: string;
}

export type SiteCreationParams = {
  origin: string;
  name?: string | null; // name can be optional or null
  radius?: number | null; // radius can be optional or null
  isMonitored?: boolean | null; // isMonitored can be optional or null
  userId: string;
  lastUpdated?: Date | null; // lastUpdated can be optional or null
  projectId?: string | null; // projectId can be optional or null
  remoteId?: string | null; // remoteId can be optional or null
};



export function createPolygonSitesFromMultiPolygon(siteCreationParams: SiteCreationParams, multiPolygonGeometry: MultiPolygonGeometry): CreatePolygonSiteData[] {
  const { origin, name, radius, isMonitored, userId, lastUpdated, projectId, remoteId } = siteCreationParams;
  let siteQueue: CreatePolygonSiteData[] = [];
  let siteIndex = 1;

  for (const polygon of multiPolygonGeometry.coordinates) {
      const polygonGeometry = {
          type: 'Polygon',
          coordinates: polygon
      };

      const newSiteData: CreatePolygonSiteData = {
          origin,
          type: 'Polygon',
          name: `Site ${siteIndex} ${name || ''}`, // Using an empty string if name is not provided
          geometry: polygonGeometry,
          radius: radius || 0, // Default to 0 if radius is not provided
          isMonitored: isMonitored ?? true, // Default to true if isMonitored is not provided
          userId: userId,
          lastUpdated: lastUpdated || new Date(),
          ...projectId ? { projectId } : {}, // Include projectId only if provided
          ...remoteId ? { remoteId } : {} // Include remoteId only if provided
      };

      siteQueue.push(newSiteData);
      siteIndex++;
  }

  return siteQueue;
}

// Compares the User in session or token with the Site that is being Read, Updated or Deleted
export const checkUserHasSitePermission = async ({
  ctx,
  siteId,
  userId,
}: CheckUserHasSitePermissionArgs) => {
  const siteToCRUD = await ctx.prisma.site.findFirst({
    where: {
      id: siteId,
      deletedAt: null,
    },
  });
  if (!siteToCRUD) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Site with that id does not exist, cannot update site',
    });
  }
  if (siteToCRUD.userId !== userId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You are not authorized to update this site',
    });
  }
  return siteToCRUD;
};

export const checkIfPlanetROSite = async ({
  ctx,
  siteId,
}: CheckIfPlanetROSiteArgs) => {
  const siteToCRUD = await ctx.prisma.site.findFirst({
    where: {
      id: siteId,
    },
    select: {
      userId: true,
      projectId: true,
    },
  });
  if (siteToCRUD?.projectId) {
    return true;
  } else {
    return false;
  }
};

// The function below is a helper function that returns a coordinate that lies within or nearby the site's geometry
// It is used to create a test Site Alert for any site.
interface Geometry {
  type: string;
  coordinates: number[][][];
}

const getFirstCoordinates = (geojson: Geometry, metersAway: number) => {
  let coordinates;

  switch (geojson.type) {
    case 'Point':
      coordinates = geojson.coordinates;
      break;
    case 'Polygon':
      coordinates = geojson.coordinates[0][0]; // First point of the first polygon
      break;
    case 'MultiPolygon':
      coordinates = geojson.coordinates[0][0][0]; // First point of the first polygon of the first multipolygon
      break;
    default:
      throw new Error('Invalid GeoJSON object');
  }

  // Convert meters to approximate degrees
  const degrees = metersAway / 111000;

  return {
    latitude: coordinates[1] + degrees, // Adding degrees to the latitude
    longitude: coordinates[0] + degrees, // Adding degrees to the longitude
  };
};

export const getTestSiteAlertCount = async (userId: string) => {
  const siteAlertCount = await prisma.siteAlert.count({
    where: {
      site: {
        userId: userId,
      },
      detectedBy: 'TEST_ALERT_PROVIDER', // Count only if detectedBy equals 'TEST_ALERT_PROVIDER'
    },
  });

  return siteAlertCount;
};

export const triggerTestAlert = async (siteId: string) => {
  const site: Site = await prisma.site.findFirst({
    where: {
      id: siteId,
    },
    select: {
      userId: true,
      projectId: true,
      geometry: true, // Also select the site's geometry
    },
  });

  if (!site) {
    throw new Error('Site not found!');
  }

  const existingAlerts = await getTestSiteAlertCount(site.userId);
  if (existingAlerts >= 3) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message:
        'You have reached the maximum number of test alerts for your account.',
    });
  }

  const confidences: AlertConfidence[] = ['low', 'medium', 'high'];
  const randomConfidence =
    confidences[Math.floor(Math.random() * confidences.length)];

  // randomize distance between 10 to 500 meters
  const distance = Math.floor(Math.random() * (500 - 10 + 1) + 10);
  const {latitude: testLatitude, longitude: testLongitude} =
    getFirstCoordinates(site.geometry as Geometry, distance);

  const siteAlert: SiteAlert = await prisma.siteAlert.create({
    data: {
      siteId: siteId,
      type: 'fire',
      latitude: testLatitude,
      longitude: testLongitude,
      isProcessed: false,
      distance: distance,
      data: {},
      eventDate: new Date(),
      detectedBy: 'TEST_ALERT_PROVIDER',
      confidence: randomConfidence,
    },
  });
  // TODO: Limit how many test alerts can be created

  return siteAlert;
};
