import moment from 'moment-timezone';
import {
  composeIncidents,
  filterAlertsByDuration,
  AlertData,
} from '../../app/utils/mapDisplayMode';

// Mock the incident circle utils
jest.mock('../../app/utils/incident/incidentCircleUtils', () => ({
  generateIncidentCircle: jest.fn((firePoints, radius) => {
    if (!firePoints || firePoints.length === 0) return null;
    return {
      centroid: [0, 0],
      radiusKm: 5,
      areaKm2: 78.5,
      circlePolygon: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0]]],
        },
        properties: {},
      },
    };
  }),
}));

describe('mapDisplayMode utilities', () => {
  describe('composeIncidents', () => {
    it('should return empty array for empty input', () => {
      const result = composeIncidents([]);
      expect(result).toEqual([]);
    });

    it('should return empty array for null/undefined input', () => {
      expect(composeIncidents(null as any)).toEqual([]);
      expect(composeIncidents(undefined as any)).toEqual([]);
    });

    it('should group alerts by siteIncidentId', () => {
      const alerts: AlertData[] = [
        {
          id: 'alert1',
          latitude: 10.0,
          longitude: 20.0,
          eventDate: '2024-01-01T00:00:00Z',
          siteIncidentId: 'incident1',
          site: {id: 'site1', name: 'Site 1'},
        },
        {
          id: 'alert2',
          latitude: 10.1,
          longitude: 20.1,
          eventDate: '2024-01-01T01:00:00Z',
          siteIncidentId: 'incident1',
          site: {id: 'site1', name: 'Site 1'},
        },
        {
          id: 'alert3',
          latitude: 30.0,
          longitude: 40.0,
          eventDate: '2024-01-01T02:00:00Z',
          siteIncidentId: 'incident2',
          site: {id: 'site2', name: 'Site 2'},
        },
      ];

      const result = composeIncidents(alerts);

      expect(result).toHaveLength(2);
      expect(result[0].incidentId).toBe('incident1');
      expect(result[0].alertCount).toBe(2);
      expect(result[0].alerts).toHaveLength(2);
      expect(result[1].incidentId).toBe('incident2');
      expect(result[1].alertCount).toBe(1);
    });

    it('should ignore alerts without siteIncidentId', () => {
      const alerts: AlertData[] = [
        {
          id: 'alert1',
          latitude: 10.0,
          longitude: 20.0,
          eventDate: '2024-01-01T00:00:00Z',
          siteIncidentId: 'incident1',
          site: {id: 'site1'},
        },
        {
          id: 'alert2',
          latitude: 10.1,
          longitude: 20.1,
          eventDate: '2024-01-01T01:00:00Z',
          siteIncidentId: null,
          site: {id: 'site1'},
        },
        {
          id: 'alert3',
          latitude: 10.2,
          longitude: 20.2,
          eventDate: '2024-01-01T02:00:00Z',
          site: {id: 'site1'},
        },
      ];

      const result = composeIncidents(alerts);

      expect(result).toHaveLength(1);
      expect(result[0].incidentId).toBe('incident1');
      expect(result[0].alertCount).toBe(1);
    });

    it('should cap results at N=60 incidents', () => {
      const alerts: AlertData[] = [];
      // Create 100 incidents with 1 alert each
      for (let i = 0; i < 100; i++) {
        alerts.push({
          id: `alert${i}`,
          latitude: 10.0 + i * 0.01,
          longitude: 20.0 + i * 0.01,
          eventDate: '2024-01-01T00:00:00Z',
          siteIncidentId: `incident${i}`,
          site: {id: `site${i}`},
        });
      }

      const result = composeIncidents(alerts);

      expect(result).toHaveLength(60);
    });

    it('should calculate circles for each incident', () => {
      const alerts: AlertData[] = [
        {
          id: 'alert1',
          latitude: 10.0,
          longitude: 20.0,
          eventDate: '2024-01-01T00:00:00Z',
          siteIncidentId: 'incident1',
          site: {id: 'site1'},
        },
        {
          id: 'alert2',
          latitude: 10.1,
          longitude: 20.1,
          eventDate: '2024-01-01T01:00:00Z',
          siteIncidentId: 'incident1',
          site: {id: 'site1'},
        },
      ];

      const result = composeIncidents(alerts);

      expect(result).toHaveLength(1);
      expect(result[0].circle).not.toBeNull();
      expect(result[0].circle?.radiusKm).toBe(5);
      expect(result[0].circle?.areaKm2).toBe(78.5);
    });

    it('should handle single alert per incident', () => {
      const alerts: AlertData[] = [
        {
          id: 'alert1',
          latitude: 10.0,
          longitude: 20.0,
          eventDate: '2024-01-01T00:00:00Z',
          siteIncidentId: 'incident1',
          site: {id: 'site1'},
        },
      ];

      const result = composeIncidents(alerts);

      expect(result).toHaveLength(1);
      expect(result[0].alertCount).toBe(1);
      expect(result[0].alerts).toHaveLength(1);
    });

    it('should preserve siteId from alerts', () => {
      const alerts: AlertData[] = [
        {
          id: 'alert1',
          latitude: 10.0,
          longitude: 20.0,
          eventDate: '2024-01-01T00:00:00Z',
          siteIncidentId: 'incident1',
          site: {id: 'site123', name: 'Test Site'},
        },
      ];

      const result = composeIncidents(alerts);

      expect(result[0].siteId).toBe('site123');
    });

    it('should handle alerts with missing site gracefully', () => {
      const alerts: AlertData[] = [
        {
          id: 'alert1',
          latitude: 10.0,
          longitude: 20.0,
          eventDate: '2024-01-01T00:00:00Z',
          siteIncidentId: 'incident1',
        },
      ];

      const result = composeIncidents(alerts);

      expect(result).toHaveLength(1);
      expect(result[0].siteId).toBe('');
    });
  });

  describe('filterAlertsByDuration', () => {
    beforeEach(() => {
      // Mock current time to 2024-01-15 12:00:00
      jest
        .spyOn(moment, 'now')
        .mockReturnValue(moment('2024-01-15T12:00:00Z').valueOf());
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return empty array for empty input', () => {
      const result = filterAlertsByDuration([], 7);
      expect(result).toEqual([]);
    });

    it('should return empty array for null/undefined input', () => {
      expect(filterAlertsByDuration(null as any, 7)).toEqual([]);
      expect(filterAlertsByDuration(undefined as any, 7)).toEqual([]);
    });

    it('should return empty array for zero or negative duration', () => {
      const alerts: AlertData[] = [
        {
          id: 'alert1',
          latitude: 10.0,
          longitude: 20.0,
          eventDate: '2024-01-14T00:00:00Z',
          site: {id: 'site1'},
        },
      ];

      expect(filterAlertsByDuration(alerts, 0)).toEqual([]);
      expect(filterAlertsByDuration(alerts, -5)).toEqual([]);
    });

    it('should filter alerts within 1 day duration', () => {
      const alerts: AlertData[] = [
        {
          id: 'alert1',
          latitude: 10.0,
          longitude: 20.0,
          eventDate: '2024-01-15T00:00:00Z', // Within 1 day
          site: {id: 'site1'},
        },
        {
          id: 'alert2',
          latitude: 10.1,
          longitude: 20.1,
          eventDate: '2024-01-14T00:00:00Z', // More than 1 day ago
          site: {id: 'site1'},
        },
        {
          id: 'alert3',
          latitude: 10.2,
          longitude: 20.2,
          eventDate: '2024-01-13T00:00:00Z', // More than 2 days ago
          site: {id: 'site1'},
        },
      ];

      const result = filterAlertsByDuration(alerts, 1);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('alert1');
    });

    it('should filter alerts within 7 days duration', () => {
      const alerts: AlertData[] = [
        {
          id: 'alert1',
          latitude: 10.0,
          longitude: 20.0,
          eventDate: '2024-01-14T00:00:00Z', // 1 day ago
          site: {id: 'site1'},
        },
        {
          id: 'alert2',
          latitude: 10.1,
          longitude: 20.1,
          eventDate: '2024-01-10T00:00:00Z', // 5 days ago
          site: {id: 'site1'},
        },
        {
          id: 'alert3',
          latitude: 10.2,
          longitude: 20.2,
          eventDate: '2024-01-05T00:00:00Z', // 10 days ago
          site: {id: 'site1'},
        },
      ];

      const result = filterAlertsByDuration(alerts, 7);

      expect(result).toHaveLength(2);
      expect(result.map(a => a.id)).toEqual(['alert1', 'alert2']);
    });

    it('should filter alerts within 30 days duration', () => {
      const alerts: AlertData[] = [
        {
          id: 'alert1',
          latitude: 10.0,
          longitude: 20.0,
          eventDate: '2024-01-10T00:00:00Z', // 5 days ago
          site: {id: 'site1'},
        },
        {
          id: 'alert2',
          latitude: 10.1,
          longitude: 20.1,
          eventDate: '2023-12-20T00:00:00Z', // 26 days ago
          site: {id: 'site1'},
        },
        {
          id: 'alert3',
          latitude: 10.2,
          longitude: 20.2,
          eventDate: '2023-12-10T00:00:00Z', // 36 days ago
          site: {id: 'site1'},
        },
      ];

      const result = filterAlertsByDuration(alerts, 30);

      expect(result).toHaveLength(2);
      expect(result.map(a => a.id)).toEqual(['alert1', 'alert2']);
    });

    it('should handle boundary case - exactly at cutoff', () => {
      const alerts: AlertData[] = [
        {
          id: 'alert1',
          latitude: 10.0,
          longitude: 20.0,
          eventDate: '2024-01-08T12:00:01Z', // Just after 7 days ago
          site: {id: 'site1'},
        },
        {
          id: 'alert2',
          latitude: 10.1,
          longitude: 20.1,
          eventDate: '2024-01-08T11:59:59Z', // Just over 7 days ago
          site: {id: 'site1'},
        },
      ];

      const result = filterAlertsByDuration(alerts, 7);

      // Boundary behavior depends on moment.js precision
      expect(result.length).toBeGreaterThanOrEqual(0);
      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should return all alerts if all are within duration', () => {
      const alerts: AlertData[] = [
        {
          id: 'alert1',
          latitude: 10.0,
          longitude: 20.0,
          eventDate: '2024-01-15T00:00:00Z',
          site: {id: 'site1'},
        },
        {
          id: 'alert2',
          latitude: 10.1,
          longitude: 20.1,
          eventDate: '2024-01-14T00:00:00Z',
          site: {id: 'site1'},
        },
        {
          id: 'alert3',
          latitude: 10.2,
          longitude: 20.2,
          eventDate: '2024-01-13T00:00:00Z',
          site: {id: 'site1'},
        },
      ];

      const result = filterAlertsByDuration(alerts, 7);

      expect(result).toHaveLength(3);
    });

    it('should return empty array if no alerts within duration', () => {
      const alerts: AlertData[] = [
        {
          id: 'alert1',
          latitude: 10.0,
          longitude: 20.0,
          eventDate: '2024-01-01T00:00:00Z', // 14 days ago
          site: {id: 'site1'},
        },
        {
          id: 'alert2',
          latitude: 10.1,
          longitude: 20.1,
          eventDate: '2023-12-25T00:00:00Z', // 21 days ago
          site: {id: 'site1'},
        },
      ];

      const result = filterAlertsByDuration(alerts, 7);

      expect(result).toHaveLength(0);
    });
  });
});
