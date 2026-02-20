/**
 * Unit Tests: useHomeMapSelection Hook
 *
 * Tests map selection state management for sites, alerts, and areas.
 * Validates state updates and clearSelection functionality.
 *
 * Requirements: 5.4, 5.8, 18.1, 18.4
 */

import {renderHook, act} from '@testing-library/react-native';
import {useHomeMapSelection} from '../../../../app/screens/Home/hooks/useHomeMapSelection';
import type {
  SiteProperties,
  AlertData,
  SiteFeature,
} from '../../../../app/screens/Home/types';

describe('useHomeMapSelection Hook', () => {
  describe('Initial State', () => {
    it('should initialize with null selections', () => {
      const {result} = renderHook(() => useHomeMapSelection());

      expect(result.current.selectedSite).toBeNull();
      expect(result.current.selectedAlert).toBeNull();
      expect(result.current.selectedArea).toBeNull();
    });

    it('should provide all setter functions', () => {
      const {result} = renderHook(() => useHomeMapSelection());

      expect(typeof result.current.setSelectedSite).toBe('function');
      expect(typeof result.current.setSelectedAlert).toBe('function');
      expect(typeof result.current.setSelectedArea).toBe('function');
      expect(typeof result.current.clearSelection).toBe('function');
    });
  });

  describe('Site Selection', () => {
    it('should update selectedSite when setSelectedSite is called', () => {
      const {result} = renderHook(() => useHomeMapSelection());

      const mockSite: SiteProperties = {
        id: 'site-1',
        name: 'Test Site',
        radius: 1000,
        geometry: 'Point',
        stopAlerts: false,
        isPlanetRO: false,
      };

      act(() => {
        result.current.setSelectedSite(mockSite);
      });

      expect(result.current.selectedSite).toEqual(mockSite);
    });

    it('should allow setting selectedSite to null', () => {
      const {result} = renderHook(() => useHomeMapSelection());

      const mockSite: SiteProperties = {
        id: 'site-1',
        name: 'Test Site',
        radius: 1000,
        geometry: 'Point',
        stopAlerts: false,
        isPlanetRO: false,
      };

      act(() => {
        result.current.setSelectedSite(mockSite);
      });

      expect(result.current.selectedSite).toEqual(mockSite);

      act(() => {
        result.current.setSelectedSite(null);
      });

      expect(result.current.selectedSite).toBeNull();
    });

    it('should update selectedSite multiple times', () => {
      const {result} = renderHook(() => useHomeMapSelection());

      const mockSite1: SiteProperties = {
        id: 'site-1',
        name: 'Site 1',
        radius: 1000,
        geometry: 'Point',
        stopAlerts: false,
        isPlanetRO: false,
      };

      const mockSite2: SiteProperties = {
        id: 'site-2',
        name: 'Site 2',
        radius: 2000,
        geometry: 'Polygon',
        stopAlerts: true,
        isPlanetRO: true,
      };

      act(() => {
        result.current.setSelectedSite(mockSite1);
      });

      expect(result.current.selectedSite).toEqual(mockSite1);

      act(() => {
        result.current.setSelectedSite(mockSite2);
      });

      expect(result.current.selectedSite).toEqual(mockSite2);
    });
  });

  describe('Alert Selection', () => {
    it('should update selectedAlert when setSelectedAlert is called', () => {
      const {result} = renderHook(() => useHomeMapSelection());

      const mockAlert: AlertData = {
        id: 'alert-1',
        latitude: 37.7749,
        longitude: -122.4194,
        confidence: 'high',
        detectedAt: '2024-01-01T00:00:00Z',
        siteId: 'site-1',
        siteName: 'Test Site',
      };

      act(() => {
        result.current.setSelectedAlert(mockAlert);
      });

      expect(result.current.selectedAlert).toEqual(mockAlert);
    });

    it('should allow setting selectedAlert to null', () => {
      const {result} = renderHook(() => useHomeMapSelection());

      const mockAlert: AlertData = {
        id: 'alert-1',
        latitude: 37.7749,
        longitude: -122.4194,
        confidence: 'high',
        detectedAt: '2024-01-01T00:00:00Z',
        siteId: 'site-1',
        siteName: 'Test Site',
      };

      act(() => {
        result.current.setSelectedAlert(mockAlert);
      });

      expect(result.current.selectedAlert).toEqual(mockAlert);

      act(() => {
        result.current.setSelectedAlert(null);
      });

      expect(result.current.selectedAlert).toBeNull();
    });

    it('should update selectedAlert multiple times', () => {
      const {result} = renderHook(() => useHomeMapSelection());

      const mockAlert1: AlertData = {
        id: 'alert-1',
        latitude: 37.7749,
        longitude: -122.4194,
        confidence: 'high',
        detectedAt: '2024-01-01T00:00:00Z',
        siteId: 'site-1',
        siteName: 'Site 1',
      };

      const mockAlert2: AlertData = {
        id: 'alert-2',
        latitude: 40.7128,
        longitude: -74.006,
        confidence: 'medium',
        detectedAt: '2024-01-02T00:00:00Z',
        siteId: 'site-2',
        siteName: 'Site 2',
      };

      act(() => {
        result.current.setSelectedAlert(mockAlert1);
      });

      expect(result.current.selectedAlert).toEqual(mockAlert1);

      act(() => {
        result.current.setSelectedAlert(mockAlert2);
      });

      expect(result.current.selectedAlert).toEqual(mockAlert2);
    });
  });

  describe('Area Selection', () => {
    it('should update selectedArea when setSelectedArea is called', () => {
      const {result} = renderHook(() => useHomeMapSelection());

      const mockArea: SiteFeature[] = [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [-122.4194, 37.7749],
          },
          properties: {
            id: 'site-1',
            name: 'Test Site',
            radius: 1000,
            geometry: 'Point',
            stopAlerts: false,
            isPlanetRO: false,
          },
        },
      ];

      act(() => {
        result.current.setSelectedArea(mockArea);
      });

      expect(result.current.selectedArea).toEqual(mockArea);
    });

    it('should allow setting selectedArea to null', () => {
      const {result} = renderHook(() => useHomeMapSelection());

      const mockArea: SiteFeature[] = [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [-122.4194, 37.7749],
          },
          properties: {
            id: 'site-1',
            name: 'Test Site',
            radius: 1000,
            geometry: 'Point',
            stopAlerts: false,
            isPlanetRO: false,
          },
        },
      ];

      act(() => {
        result.current.setSelectedArea(mockArea);
      });

      expect(result.current.selectedArea).toEqual(mockArea);

      act(() => {
        result.current.setSelectedArea(null);
      });

      expect(result.current.selectedArea).toBeNull();
    });

    it('should handle empty array for selectedArea', () => {
      const {result} = renderHook(() => useHomeMapSelection());

      act(() => {
        result.current.setSelectedArea([]);
      });

      expect(result.current.selectedArea).toEqual([]);
    });

    it('should handle multiple features in selectedArea', () => {
      const {result} = renderHook(() => useHomeMapSelection());

      const mockArea: SiteFeature[] = [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [-122.4194, 37.7749],
          },
          properties: {
            id: 'site-1',
            name: 'Site 1',
            radius: 1000,
            geometry: 'Point',
            stopAlerts: false,
            isPlanetRO: false,
          },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-122.4, 37.8],
                [-122.5, 37.8],
                [-122.5, 37.7],
                [-122.4, 37.7],
                [-122.4, 37.8],
              ],
            ],
          },
          properties: {
            id: 'site-2',
            name: 'Site 2',
            radius: 2000,
            geometry: 'Polygon',
            stopAlerts: false,
            isPlanetRO: false,
          },
        },
      ];

      act(() => {
        result.current.setSelectedArea(mockArea);
      });

      expect(result.current.selectedArea).toEqual(mockArea);
      expect(result.current.selectedArea?.length).toBe(2);
    });
  });

  describe('clearSelection', () => {
    it('should clear all selections when called', () => {
      const {result} = renderHook(() => useHomeMapSelection());

      const mockSite: SiteProperties = {
        id: 'site-1',
        name: 'Test Site',
        radius: 1000,
        geometry: 'Point',
        stopAlerts: false,
        isPlanetRO: false,
      };

      const mockAlert: AlertData = {
        id: 'alert-1',
        latitude: 37.7749,
        longitude: -122.4194,
        confidence: 'high',
        detectedAt: '2024-01-01T00:00:00Z',
        siteId: 'site-1',
        siteName: 'Test Site',
      };

      const mockArea: SiteFeature[] = [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [-122.4194, 37.7749],
          },
          properties: mockSite,
        },
      ];

      // Set all selections
      act(() => {
        result.current.setSelectedSite(mockSite);
        result.current.setSelectedAlert(mockAlert);
        result.current.setSelectedArea(mockArea);
      });

      expect(result.current.selectedSite).toEqual(mockSite);
      expect(result.current.selectedAlert).toEqual(mockAlert);
      expect(result.current.selectedArea).toEqual(mockArea);

      // Clear all selections
      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedSite).toBeNull();
      expect(result.current.selectedAlert).toBeNull();
      expect(result.current.selectedArea).toBeNull();
    });

    it('should work when selections are already null', () => {
      const {result} = renderHook(() => useHomeMapSelection());

      expect(result.current.selectedSite).toBeNull();
      expect(result.current.selectedAlert).toBeNull();
      expect(result.current.selectedArea).toBeNull();

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedSite).toBeNull();
      expect(result.current.selectedAlert).toBeNull();
      expect(result.current.selectedArea).toBeNull();
    });

    it('should clear partial selections', () => {
      const {result} = renderHook(() => useHomeMapSelection());

      const mockSite: SiteProperties = {
        id: 'site-1',
        name: 'Test Site',
        radius: 1000,
        geometry: 'Point',
        stopAlerts: false,
        isPlanetRO: false,
      };

      // Set only site selection
      act(() => {
        result.current.setSelectedSite(mockSite);
      });

      expect(result.current.selectedSite).toEqual(mockSite);
      expect(result.current.selectedAlert).toBeNull();
      expect(result.current.selectedArea).toBeNull();

      // Clear all
      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedSite).toBeNull();
      expect(result.current.selectedAlert).toBeNull();
      expect(result.current.selectedArea).toBeNull();
    });
  });

  describe('Independent State Management', () => {
    it('should allow setting site without affecting alert or area', () => {
      const {result} = renderHook(() => useHomeMapSelection());

      const mockSite: SiteProperties = {
        id: 'site-1',
        name: 'Test Site',
        radius: 1000,
        geometry: 'Point',
        stopAlerts: false,
        isPlanetRO: false,
      };

      act(() => {
        result.current.setSelectedSite(mockSite);
      });

      expect(result.current.selectedSite).toEqual(mockSite);
      expect(result.current.selectedAlert).toBeNull();
      expect(result.current.selectedArea).toBeNull();
    });

    it('should allow setting alert without affecting site or area', () => {
      const {result} = renderHook(() => useHomeMapSelection());

      const mockAlert: AlertData = {
        id: 'alert-1',
        latitude: 37.7749,
        longitude: -122.4194,
        confidence: 'high',
        detectedAt: '2024-01-01T00:00:00Z',
        siteId: 'site-1',
        siteName: 'Test Site',
      };

      act(() => {
        result.current.setSelectedAlert(mockAlert);
      });

      expect(result.current.selectedSite).toBeNull();
      expect(result.current.selectedAlert).toEqual(mockAlert);
      expect(result.current.selectedArea).toBeNull();
    });

    it('should allow setting area without affecting site or alert', () => {
      const {result} = renderHook(() => useHomeMapSelection());

      const mockArea: SiteFeature[] = [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [-122.4194, 37.7749],
          },
          properties: {
            id: 'site-1',
            name: 'Test Site',
            radius: 1000,
            geometry: 'Point',
            stopAlerts: false,
            isPlanetRO: false,
          },
        },
      ];

      act(() => {
        result.current.setSelectedArea(mockArea);
      });

      expect(result.current.selectedSite).toBeNull();
      expect(result.current.selectedAlert).toBeNull();
      expect(result.current.selectedArea).toEqual(mockArea);
    });
  });

  describe('Function Stability', () => {
    it('should maintain stable function references across re-renders', () => {
      const {result, rerender} = renderHook(() => useHomeMapSelection());

      const setSelectedSiteRef1 = result.current.setSelectedSite;
      const setSelectedAlertRef1 = result.current.setSelectedAlert;
      const setSelectedAreaRef1 = result.current.setSelectedArea;
      const clearSelectionRef1 = result.current.clearSelection;

      rerender();

      expect(result.current.setSelectedSite).toBe(setSelectedSiteRef1);
      expect(result.current.setSelectedAlert).toBe(setSelectedAlertRef1);
      expect(result.current.setSelectedArea).toBe(setSelectedAreaRef1);
      expect(result.current.clearSelection).toBe(clearSelectionRef1);
    });

    it('should maintain stable function references after state updates', () => {
      const {result} = renderHook(() => useHomeMapSelection());

      const clearSelectionRef1 = result.current.clearSelection;

      act(() => {
        result.current.setSelectedSite({
          id: 'site-1',
          name: 'Test',
          radius: 1000,
          geometry: 'Point',
          stopAlerts: false,
          isPlanetRO: false,
        });
      });

      expect(result.current.clearSelection).toBe(clearSelectionRef1);
    });
  });
});
