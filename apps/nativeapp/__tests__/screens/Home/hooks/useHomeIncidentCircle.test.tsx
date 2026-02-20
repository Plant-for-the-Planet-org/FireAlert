/**
 * Unit Tests: useHomeIncidentCircle Hook
 *
 * Tests incident circle generation and data fetching.
 * Validates circle geometry generation, null states, and error handling.
 *
 * Requirements: 5.3, 5.8, 22.1, 22.2, 18.1, 18.4
 */

import {renderHook, act, waitFor} from '@testing-library/react-native';
import {useHomeIncidentCircle} from '../../../../app/screens/Home/hooks/useHomeIncidentCircle';

// Mock dependencies
jest.mock('../../../../app/hooks/incident/useIncidentData');
jest.mock('../../../../app/utils/incident/incidentCircleUtils');

const {
  useIncidentData,
} = require('../../../../app/hooks/incident/useIncidentData');
const {
  generateIncidentCircle,
} = require('../../../../app/utils/incident/incidentCircleUtils');

describe('useHomeIncidentCircle Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with null incidentCircleData', () => {
      useIncidentData.mockReturnValue({
        incident: null,
        isLoading: false,
        isError: false,
      });

      const {result} = renderHook(() => useHomeIncidentCircle());

      expect(result.current.incidentCircleData).toBeNull();
    });

    it('should provide generateCircle function', () => {
      useIncidentData.mockReturnValue({
        incident: null,
        isLoading: false,
        isError: false,
      });

      const {result} = renderHook(() => useHomeIncidentCircle());

      expect(typeof result.current.generateCircle).toBe('function');
    });

    it('should provide clearCircle function', () => {
      useIncidentData.mockReturnValue({
        incident: null,
        isLoading: false,
        isError: false,
      });

      const {result} = renderHook(() => useHomeIncidentCircle());

      expect(typeof result.current.clearCircle).toBe('function');
    });
  });

  describe('generateCircle', () => {
    it('should trigger incident data fetch when called', async () => {
      const mockIncidentData = {
        id: 'incident-1',
        siteAlerts: [
          {latitude: 37.7749, longitude: -122.4194},
          {latitude: 37.775, longitude: -122.4195},
        ],
      };

      useIncidentData.mockReturnValue({
        incident: null,
        isLoading: true,
        isError: false,
      });

      const {result, rerender} = renderHook(() => useHomeIncidentCircle());

      act(() => {
        result.current.generateCircle('incident-1');
      });

      // Simulate data loaded
      useIncidentData.mockReturnValue({
        incident: mockIncidentData,
        isLoading: false,
        isError: false,
      });

      rerender();

      await waitFor(() => {
        expect(useIncidentData).toHaveBeenCalled();
      });
    });

    it('should generate circle geometry when incident data is loaded', async () => {
      const mockIncidentData = {
        id: 'incident-1',
        siteAlerts: [
          {latitude: 37.7749, longitude: -122.4194},
          {latitude: 37.775, longitude: -122.4195},
        ],
      };

      const mockCircleResult = {
        circlePolygon: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[]],
          },
        },
        radiusKm: 1.5,
        areaKm2: 7.07,
        centerPoint: {latitude: 37.77495, longitude: -122.41945},
      };

      useIncidentData.mockReturnValue({
        incident: null,
        isLoading: false,
        isError: false,
      });

      generateIncidentCircle.mockReturnValue(mockCircleResult);

      const {result, rerender} = renderHook(() => useHomeIncidentCircle());

      act(() => {
        result.current.generateCircle('incident-1');
      });

      // Simulate data loaded
      useIncidentData.mockReturnValue({
        incident: mockIncidentData,
        isLoading: false,
        isError: false,
      });

      rerender();

      await waitFor(() => {
        expect(result.current.incidentCircleData).toEqual(mockCircleResult);
      });

      expect(generateIncidentCircle).toHaveBeenCalledWith(
        [
          {latitude: 37.7749, longitude: -122.4194},
          {latitude: 37.775, longitude: -122.4195},
        ],
        2,
      );
    });

    it('should handle empty siteAlerts array', async () => {
      const mockIncidentData = {
        id: 'incident-1',
        siteAlerts: [],
      };

      useIncidentData.mockReturnValue({
        incident: null,
        isLoading: false,
        isError: false,
      });

      generateIncidentCircle.mockReturnValue(null);

      const {result, rerender} = renderHook(() => useHomeIncidentCircle());

      act(() => {
        result.current.generateCircle('incident-1');
      });

      // Simulate data loaded
      useIncidentData.mockReturnValue({
        incident: mockIncidentData,
        isLoading: false,
        isError: false,
      });

      rerender();

      await waitFor(() => {
        expect(result.current.incidentCircleData).toBeNull();
      });
    });

    it('should handle null circle generation result', async () => {
      const mockIncidentData = {
        id: 'incident-1',
        siteAlerts: [{latitude: 37.7749, longitude: -122.4194}],
      };

      useIncidentData.mockReturnValue({
        incident: null,
        isLoading: false,
        isError: false,
      });

      generateIncidentCircle.mockReturnValue(null);

      const {result, rerender} = renderHook(() => useHomeIncidentCircle());

      act(() => {
        result.current.generateCircle('incident-1');
      });

      // Simulate data loaded
      useIncidentData.mockReturnValue({
        incident: mockIncidentData,
        isLoading: false,
        isError: false,
      });

      rerender();

      await waitFor(() => {
        expect(result.current.incidentCircleData).toBeNull();
      });
    });
  });

  describe('clearCircle', () => {
    it('should clear incident circle data', async () => {
      const mockIncidentData = {
        id: 'incident-1',
        siteAlerts: [{latitude: 37.7749, longitude: -122.4194}],
      };

      const mockCircleResult = {
        circlePolygon: {type: 'Feature', geometry: {type: 'Polygon'}},
        radiusKm: 1.5,
        areaKm2: 7.07,
        centerPoint: {latitude: 37.7749, longitude: -122.4194},
      };

      useIncidentData.mockReturnValue({
        incident: null,
        isLoading: false,
        isError: false,
      });

      generateIncidentCircle.mockReturnValue(mockCircleResult);

      const {result, rerender} = renderHook(() => useHomeIncidentCircle());

      // Generate circle
      act(() => {
        result.current.generateCircle('incident-1');
      });

      useIncidentData.mockReturnValue({
        incident: mockIncidentData,
        isLoading: false,
        isError: false,
      });

      rerender();

      await waitFor(() => {
        expect(result.current.incidentCircleData).toEqual(mockCircleResult);
      });

      // Clear circle
      act(() => {
        result.current.clearCircle();
      });

      expect(result.current.incidentCircleData).toBeNull();
    });

    it('should work when circle data is already null', () => {
      useIncidentData.mockReturnValue({
        incident: null,
        isLoading: false,
        isError: false,
      });

      const {result} = renderHook(() => useHomeIncidentCircle());

      expect(result.current.incidentCircleData).toBeNull();

      act(() => {
        result.current.clearCircle();
      });

      expect(result.current.incidentCircleData).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle incident data fetch errors', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      useIncidentData.mockReturnValue({
        incident: null,
        isLoading: false,
        isError: false,
      });

      const {result, rerender} = renderHook(() => useHomeIncidentCircle());

      act(() => {
        result.current.generateCircle('incident-1');
      });

      // Simulate error
      useIncidentData.mockReturnValue({
        incident: null,
        isLoading: false,
        isError: true,
      });

      rerender();

      await waitFor(() => {
        expect(result.current.incidentCircleData).toBeNull();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error loading incident data'),
      );

      consoleErrorSpy.mockRestore();
    });

    it('should set circle data to null on error', async () => {
      useIncidentData.mockReturnValue({
        incident: null,
        isLoading: false,
        isError: false,
      });

      const {result, rerender} = renderHook(() => useHomeIncidentCircle());

      act(() => {
        result.current.generateCircle('incident-1');
      });

      // Simulate error
      useIncidentData.mockReturnValue({
        incident: null,
        isLoading: false,
        isError: true,
      });

      rerender();

      await waitFor(() => {
        expect(result.current.incidentCircleData).toBeNull();
      });
    });
  });

  describe('Loading States', () => {
    it('should not generate circle while data is loading', async () => {
      useIncidentData.mockReturnValue({
        incident: null,
        isLoading: true,
        isError: false,
      });

      const {result} = renderHook(() => useHomeIncidentCircle());

      act(() => {
        result.current.generateCircle('incident-1');
      });

      expect(generateIncidentCircle).not.toHaveBeenCalled();
      expect(result.current.incidentCircleData).toBeNull();
    });

    it('should generate circle after loading completes', async () => {
      const mockIncidentData = {
        id: 'incident-1',
        siteAlerts: [{latitude: 37.7749, longitude: -122.4194}],
      };

      const mockCircleResult = {
        circlePolygon: {type: 'Feature'},
        radiusKm: 1.5,
        areaKm2: 7.07,
        centerPoint: {latitude: 37.7749, longitude: -122.4194},
      };

      useIncidentData.mockReturnValue({
        incident: null,
        isLoading: true,
        isError: false,
      });

      generateIncidentCircle.mockReturnValue(mockCircleResult);

      const {result, rerender} = renderHook(() => useHomeIncidentCircle());

      act(() => {
        result.current.generateCircle('incident-1');
      });

      // Simulate loading complete
      useIncidentData.mockReturnValue({
        incident: mockIncidentData,
        isLoading: false,
        isError: false,
      });

      rerender();

      await waitFor(() => {
        expect(result.current.incidentCircleData).toEqual(mockCircleResult);
      });
    });
  });

  describe('Multiple Incidents', () => {
    it('should handle generating circles for different incidents', async () => {
      const mockIncident1 = {
        id: 'incident-1',
        siteAlerts: [{latitude: 37.7749, longitude: -122.4194}],
      };

      const mockIncident2 = {
        id: 'incident-2',
        siteAlerts: [{latitude: 40.7128, longitude: -74.006}],
      };

      const mockCircle1 = {
        circlePolygon: {type: 'Feature'},
        radiusKm: 1.5,
        areaKm2: 7.07,
        centerPoint: {latitude: 37.7749, longitude: -122.4194},
      };

      const mockCircle2 = {
        circlePolygon: {type: 'Feature'},
        radiusKm: 2.0,
        areaKm2: 12.57,
        centerPoint: {latitude: 40.7128, longitude: -74.006},
      };

      useIncidentData.mockReturnValue({
        incident: null,
        isLoading: false,
        isError: false,
      });

      generateIncidentCircle.mockReturnValue(mockCircle1);

      const {result, rerender} = renderHook(() => useHomeIncidentCircle());

      // Generate first circle
      act(() => {
        result.current.generateCircle('incident-1');
      });

      useIncidentData.mockReturnValue({
        incident: mockIncident1,
        isLoading: false,
        isError: false,
      });

      rerender();

      await waitFor(() => {
        expect(result.current.incidentCircleData).toEqual(mockCircle1);
      });

      // Generate second circle
      generateIncidentCircle.mockReturnValue(mockCircle2);

      act(() => {
        result.current.generateCircle('incident-2');
      });

      useIncidentData.mockReturnValue({
        incident: mockIncident2,
        isLoading: false,
        isError: false,
      });

      rerender();

      await waitFor(() => {
        expect(result.current.incidentCircleData).toEqual(mockCircle2);
      });
    });
  });

  describe('Function Stability', () => {
    it('should maintain stable function references across re-renders', () => {
      useIncidentData.mockReturnValue({
        incident: null,
        isLoading: false,
        isError: false,
      });

      const {result, rerender} = renderHook(() => useHomeIncidentCircle());

      const generateCircleRef1 = result.current.generateCircle;
      const clearCircleRef1 = result.current.clearCircle;

      rerender();

      expect(result.current.generateCircle).toBe(generateCircleRef1);
      expect(result.current.clearCircle).toBe(clearCircleRef1);
    });
  });
});
