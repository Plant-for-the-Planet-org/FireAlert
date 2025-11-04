import type {SiteAlert, AlertConfidence} from '@prisma/client';
import {prisma} from '../../server/db';
import type {ITestAlertService} from '../interfaces/ITestAlertService';
import {
  SiteNotFoundError,
  TestAlertLimitExceededError,
  InvalidGeometryError,
  SitePermissionDeniedError,
} from '../core/errors';

interface Geometry {
  type: string;
  coordinates: number[][][];
}

export class TestAlertService implements ITestAlertService {
  async getTestSiteAlertCount(userId: string): Promise<number> {
    const siteAlertCount = await prisma.siteAlert.count({
      where: {
        site: {
          userId: userId,
        },
        detectedBy: 'TEST_ALERT_PROVIDER',
      },
    });

    return siteAlertCount;
  }

  async triggerTestAlert(siteId: string): Promise<SiteAlert> {
    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
      },
      select: {
        userId: true,
        projectId: true,
        geometry: true,
      },
    });

    if (!site) {
      throw new SiteNotFoundError(siteId);
    }

    if (!site?.userId) {
      throw new SitePermissionDeniedError(siteId, 'unknown', {
        reason: 'Site is protected',
      });
    }

    const existingAlerts = await this.getTestSiteAlertCount(site.userId);
    if (existingAlerts >= 3) {
      throw new TestAlertLimitExceededError(existingAlerts);
    }

    const confidences: AlertConfidence[] = ['low', 'medium', 'high'];
    const randomConfidence =
      confidences[Math.floor(Math.random() * confidences.length)];

    // randomize distance between 10 to 500 meters
    const distance = Math.floor(Math.random() * (500 - 10 + 1) + 10);
    const {latitude: testLatitude, longitude: testLongitude} =
      this.getFirstCoordinates(site.geometry as Geometry, distance);

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

    return siteAlert;
  }

  private getFirstCoordinates(geojson: Geometry, metersAway: number) {
    let coordinates;

    switch (geojson.type) {
      case 'Point':
        coordinates = geojson.coordinates;
        break;
      case 'Polygon':
        coordinates = geojson.coordinates[0][0];
        break;
      case 'MultiPolygon':
        coordinates = geojson.coordinates[0][0][0];
        break;
      default:
        throw new InvalidGeometryError(geojson.type);
    }

    // Convert meters to approximate degrees
    const degrees = metersAway / 111000;

    return {
      latitude: coordinates[1] + degrees,
      longitude: coordinates[0] + degrees,
    };
  }
}
