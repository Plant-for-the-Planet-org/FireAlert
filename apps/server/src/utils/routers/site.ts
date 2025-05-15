import {TRPCError} from '@trpc/server';
import {
  type CheckUserHasSitePermissionArgs,
  type CheckIfPlanetROSiteArgs,
} from '../../Interfaces/Site';
import type {Site, SiteAlert, AlertConfidence} from '@prisma/client';
import {prisma} from '../../../src/server/db';

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
  if (siteToCRUD?.userId && siteToCRUD.userId !== userId) {
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
  const site = await prisma.site.findFirst({
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

  if (!site?.userId) {
    throw new Error('Site is protected & can not be accessed!');
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
