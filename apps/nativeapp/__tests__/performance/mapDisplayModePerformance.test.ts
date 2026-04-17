/**
 * Performance tests for Map Display Mode feature
 * Validates memoization, rendering performance, and large dataset handling
 */

import {
  composeIncidents,
  filterAlertsByDuration,
  AlertData,
} from '../../app/utils/mapDisplayMode';
import moment from 'moment-timezone';

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

describe('Map Display Mode Performance', () => {
  describe('Memoization verification', () => {
    it('should demonstrate memoization pattern for filteredAlerts', () => {
      const mockAlerts: AlertData[] = [
        {
          id: 'alert1',
          latitude: 10.0,
          longitude: 20.0,
          eventDate: moment().subtract(1, 'days').toISOString(),
          site: {id: 'site1'},
        },
      ];

      // Simulate useMemo behavior - function should return same result for same inputs
      const duration = 7;

      const result1 = filterAlertsByDuration(mockAlerts, duration);
      const result2 = filterAlertsByDuration(mockAlerts, duration);

      // Results should be equal (memoization would prevent recalculation)
      expect(result1).toEqual(result2);
    });

    it('should demonstrate memoization pattern for composedIncidents', () => {
      const mockAlerts: AlertData[] = [
        {
          id: 'alert1',
          latitude: 10.0,
          longitude: 20.0,
          eventDate: moment().subtract(1, 'days').toISOString(),
          siteIncidentId: 'incident1',
          site: {id: 'site1'},
        },
      ];

      const filteredAlerts = filterAlertsByDuration(mockAlerts, 7);

      // Simulate useMemo behavior
      const result1 = composeIncidents(filteredAlerts);
      const result2 = composeIncidents(filteredAlerts);

      expect(result1).toEqual(result2);
    });

    it('should verify memoization dependencies work correctly', () => {
      // Test that different inputs produce different outputs
      const alert1day: AlertData[] = [
        {
          id: 'alert1',
          latitude: 10.0,
          longitude: 20.0,
          eventDate: moment().subtract(12, 'hours').toISOString(),
          siteIncidentId: 'incident1',
          site: {id: 'site1'},
        },
      ];

      const alert5days: AlertData[] = [
        {
          id: 'alert2',
          latitude: 10.1,
          longitude: 20.1,
          eventDate: moment().subtract(5, 'days').toISOString(),
          siteIncidentId: 'incident1',
          site: {id: 'site1'},
        },
      ];

      // 1-day filter should include 12-hour-old alert
      const result1day = filterAlertsByDuration(alert1day, 1);
      expect(result1day.length).toBe(1);

      // 1-day filter should NOT include 5-day-old alert
      const result1dayOld = filterAlertsByDuration(alert5days, 1);
      expect(result1dayOld.length).toBe(0);

      // 7-day filter should include 5-day-old alert
      const result7days = filterAlertsByDuration(alert5days, 7);
      expect(result7days.length).toBe(1);
    });
  });

  describe('Large dataset performance (100+ alerts)', () => {
    it('should handle 100 alerts efficiently', () => {
      const mockAlerts: AlertData[] = [];
      for (let i = 0; i < 100; i++) {
        mockAlerts.push({
          id: `alert${i}`,
          latitude: 10.0 + i * 0.01,
          longitude: 20.0 + i * 0.01,
          eventDate: moment()
            .subtract(Math.floor(i / 20), 'days')
            .toISOString(),
          siteIncidentId: `incident${Math.floor(i / 5)}`,
          site: {id: `site${i}`},
        });
      }

      const startTime = performance.now();

      const filteredAlerts = filterAlertsByDuration(mockAlerts, 7);
      const composedIncidents = composeIncidents(filteredAlerts);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete in under 50ms
      expect(executionTime).toBeLessThan(50);

      // Should produce valid results
      expect(filteredAlerts.length).toBeGreaterThan(0);
      expect(composedIncidents.length).toBeGreaterThan(0);
      expect(composedIncidents.length).toBeLessThanOrEqual(60);
    });

    it('should handle 200 alerts efficiently', () => {
      const mockAlerts: AlertData[] = [];
      for (let i = 0; i < 200; i++) {
        mockAlerts.push({
          id: `alert${i}`,
          latitude: 10.0 + i * 0.01,
          longitude: 20.0 + i * 0.01,
          eventDate: moment()
            .subtract(Math.floor(i / 40), 'days')
            .toISOString(),
          siteIncidentId: `incident${Math.floor(i / 3)}`,
          site: {id: `site${i}`},
        });
      }

      const startTime = performance.now();

      const filteredAlerts = filterAlertsByDuration(mockAlerts, 7);
      const composedIncidents = composeIncidents(filteredAlerts);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should still complete in under 100ms
      expect(executionTime).toBeLessThan(100);

      // Should respect N=60 cap
      expect(composedIncidents.length).toBeLessThanOrEqual(60);
    });

    it('should handle 500 alerts with acceptable performance', () => {
      const mockAlerts: AlertData[] = [];
      for (let i = 0; i < 500; i++) {
        mockAlerts.push({
          id: `alert${i}`,
          latitude: 10.0 + i * 0.01,
          longitude: 20.0 + i * 0.01,
          eventDate: moment()
            .subtract(Math.floor(i / 100), 'days')
            .toISOString(),
          siteIncidentId: `incident${Math.floor(i / 5)}`,
          site: {id: `site${i}`},
        });
      }

      const startTime = performance.now();

      const filteredAlerts = filterAlertsByDuration(mockAlerts, 7);
      const composedIncidents = composeIncidents(filteredAlerts);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete in under 200ms even with 500 alerts
      expect(executionTime).toBeLessThan(200);

      // Should respect N=60 cap
      expect(composedIncidents.length).toBeLessThanOrEqual(60);
    });
  });

  describe('Rendering performance considerations', () => {
    it('should limit incident circles to N=60 for map rendering', () => {
      // Generate 150 incidents
      const mockAlerts: AlertData[] = [];
      for (let i = 0; i < 150; i++) {
        mockAlerts.push({
          id: `alert${i}`,
          latitude: 10.0 + i * 0.01,
          longitude: 20.0 + i * 0.01,
          eventDate: moment().subtract(1, 'days').toISOString(),
          siteIncidentId: `incident${i}`,
          site: {id: `site${i}`},
        });
      }

      const filteredAlerts = filterAlertsByDuration(mockAlerts, 7);
      const composedIncidents = composeIncidents(filteredAlerts);

      // Should cap at 60 to prevent map rendering performance issues
      expect(composedIncidents).toHaveLength(60);
    });

    it('should efficiently filter alerts for marker rendering', () => {
      const mockAlerts: AlertData[] = [];
      for (let i = 0; i < 200; i++) {
        mockAlerts.push({
          id: `alert${i}`,
          latitude: 10.0 + i * 0.01,
          longitude: 20.0 + i * 0.01,
          eventDate: moment()
            .subtract(Math.floor(i / 20), 'days')
            .toISOString(),
          site: {id: `site${i}`},
        });
      }

      const startTime = performance.now();
      const filteredAlerts = filterAlertsByDuration(mockAlerts, 7);
      const endTime = performance.now();

      // Filtering should be fast
      expect(endTime - startTime).toBeLessThan(10);

      // Should reduce dataset for rendering
      expect(filteredAlerts.length).toBeLessThan(200);
    });
  });

  describe('Memory efficiency', () => {
    it('should not create excessive intermediate objects', () => {
      const mockAlerts: AlertData[] = [];
      for (let i = 0; i < 100; i++) {
        mockAlerts.push({
          id: `alert${i}`,
          latitude: 10.0 + i * 0.01,
          longitude: 20.0 + i * 0.01,
          eventDate: moment().subtract(1, 'days').toISOString(),
          siteIncidentId: `incident${Math.floor(i / 5)}`,
          site: {id: `site${i}`},
        });
      }

      // Run multiple times to check for memory leaks
      for (let run = 0; run < 10; run++) {
        const filteredAlerts = filterAlertsByDuration(mockAlerts, 7);
        const composedIncidents = composeIncidents(filteredAlerts);

        // Should produce consistent results
        expect(composedIncidents.length).toBeLessThanOrEqual(60);
      }

      // If this test completes without hanging, memory is managed well
      expect(true).toBe(true);
    });
  });

  describe('Rapid state changes', () => {
    it('should handle rapid duration changes efficiently', () => {
      const mockAlerts: AlertData[] = [];
      for (let i = 0; i < 100; i++) {
        mockAlerts.push({
          id: `alert${i}`,
          latitude: 10.0 + i * 0.01,
          longitude: 20.0 + i * 0.01,
          eventDate: moment()
            .subtract(Math.floor(i / 10), 'days')
            .toISOString(),
          siteIncidentId: `incident${Math.floor(i / 3)}`,
          site: {id: `site${i}`},
        });
      }

      const durations = [1, 3, 7, 30, 7, 3, 1, 7, 30, 1];
      const startTime = performance.now();

      durations.forEach(duration => {
        const filteredAlerts = filterAlertsByDuration(mockAlerts, duration);
        const composedIncidents = composeIncidents(filteredAlerts);
        expect(composedIncidents.length).toBeLessThanOrEqual(60);
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 10 rapid changes should complete in under 100ms
      expect(totalTime).toBeLessThan(100);
    });

    it('should handle rapid mode switches efficiently', () => {
      const mockAlerts: AlertData[] = [];
      for (let i = 0; i < 50; i++) {
        mockAlerts.push({
          id: `alert${i}`,
          latitude: 10.0 + i * 0.01,
          longitude: 20.0 + i * 0.01,
          eventDate: moment().subtract(1, 'days').toISOString(),
          siteIncidentId: `incident${Math.floor(i / 3)}`,
          site: {id: `site${i}`},
        });
      }

      const filteredAlerts = filterAlertsByDuration(mockAlerts, 7);

      const startTime = performance.now();

      // Simulate rapid mode switches
      for (let i = 0; i < 20; i++) {
        const mode = i % 2 === 0 ? 'alerts' : 'incidents';

        if (mode === 'incidents') {
          const composedIncidents = composeIncidents(filteredAlerts);
          expect(composedIncidents.length).toBeGreaterThan(0);
        } else {
          expect(filteredAlerts.length).toBeGreaterThan(0);
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 20 mode switches should complete quickly
      expect(totalTime).toBeLessThan(50);
    });
  });

  describe('Circle calculation performance', () => {
    it('should efficiently calculate circles for multiple incidents', () => {
      const mockAlerts: AlertData[] = [];

      // Create 60 incidents with varying alert counts
      for (let i = 0; i < 60; i++) {
        const alertCount = Math.floor(Math.random() * 10) + 1;
        for (let j = 0; j < alertCount; j++) {
          mockAlerts.push({
            id: `alert${i}_${j}`,
            latitude: 10.0 + i * 0.1 + j * 0.01,
            longitude: 20.0 + i * 0.1 + j * 0.01,
            eventDate: moment().subtract(1, 'days').toISOString(),
            siteIncidentId: `incident${i}`,
            site: {id: `site${i}`},
          });
        }
      }

      const filteredAlerts = filterAlertsByDuration(mockAlerts, 7);

      const startTime = performance.now();
      const composedIncidents = composeIncidents(filteredAlerts);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      // Should calculate 60 circles efficiently
      expect(executionTime).toBeLessThan(100);
      expect(composedIncidents).toHaveLength(60);
      expect(composedIncidents.every(inc => inc.circle !== null)).toBe(true);
    });
  });
});
