/**
 * Unit Tests: useHomeLocation Hook
 *
 * Tests location permission management and device location state.
 * Validates permission states (granted, denied, blocked) and error handling.
 *
 * Requirements: 5.1, 5.8, 5.9, 11.1, 11.2, 11.3, 18.1, 18.4
 */

import {renderHook, act, waitFor} from '@testing-library/react-native';
import {useHomeLocation} from '../../../../app/screens/Home/hooks/useHomeLocation';
import Geolocation from 'react-native-geolocation-service';
import {locationPermission} from '../../../../app/utils/permissions';

// Mock dependencies
jest.mock('react-native-geolocation-service');
jest.mock('../../../../app/utils/permissions');

const mockGeolocation = Geolocation as jest.Mocked<typeof Geolocation>;
const mockLocationPermission = locationPermission as jest.MockedFunction<
  typeof locationPermission
>;

describe('useHomeLocation Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with undefined location and no permission errors', () => {
      const {result} = renderHook(() => useHomeLocation());

      expect(result.current.location).toBeUndefined();
      expect(result.current.isPermissionDenied).toBe(false);
      expect(result.current.isPermissionBlocked).toBe(false);
    });

    it('should provide requestLocation function', () => {
      const {result} = renderHook(() => useHomeLocation());

      expect(typeof result.current.requestLocation).toBe('function');
    });

    it('should provide clearPermissionState function', () => {
      const {result} = renderHook(() => useHomeLocation());

      expect(typeof result.current.clearPermissionState).toBe('function');
    });
  });

  describe('Permission Granted Flow', () => {
    it('should update location when permission is granted', async () => {
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
          altitude: 0,
          altitudeAccuracy: 0,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      };

      mockLocationPermission.mockResolvedValue(undefined);
      mockGeolocation.getCurrentPosition.mockImplementation((success: any) => {
        success(mockPosition);
      });

      const {result} = renderHook(() => useHomeLocation());

      await act(async () => {
        await result.current.requestLocation();
      });

      await waitFor(() => {
        expect(result.current.location).toEqual(mockPosition);
      });

      expect(result.current.isPermissionDenied).toBe(false);
      expect(result.current.isPermissionBlocked).toBe(false);
    });

    it('should call getCurrentPosition with correct options', async () => {
      mockLocationPermission.mockResolvedValue(undefined);
      mockGeolocation.getCurrentPosition.mockImplementation((success: any) => {
        success({coords: {}, timestamp: Date.now()});
      });

      const {result} = renderHook(() => useHomeLocation());

      await act(async () => {
        await result.current.requestLocation();
      });

      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        {
          enableHighAccuracy: true,
          timeout: 20000,
          accuracy: {
            android: 'high',
            ios: 'bestForNavigation',
          },
        },
      );
    });

    it('should clear permission error states when location is granted', async () => {
      mockLocationPermission.mockResolvedValue(undefined);
      mockGeolocation.getCurrentPosition.mockImplementation((success: any) => {
        success({coords: {}, timestamp: Date.now()});
      });

      const {result} = renderHook(() => useHomeLocation());

      // First set error states manually
      await act(async () => {
        mockLocationPermission.mockRejectedValue({message: 'denied'});
        await result.current.requestLocation();
      });

      // Then grant permission
      await act(async () => {
        mockLocationPermission.mockResolvedValue(undefined);
        await result.current.requestLocation();
      });

      await waitFor(() => {
        expect(result.current.isPermissionDenied).toBe(false);
        expect(result.current.isPermissionBlocked).toBe(false);
      });
    });
  });

  describe('Permission Denied Flow', () => {
    it('should set isPermissionDenied when permission is denied', async () => {
      mockLocationPermission.mockRejectedValue({message: 'denied'});

      const {result} = renderHook(() => useHomeLocation());

      await act(async () => {
        await result.current.requestLocation();
      });

      expect(result.current.isPermissionDenied).toBe(true);
      expect(result.current.isPermissionBlocked).toBe(false);
      expect(result.current.location).toBeUndefined();
    });

    it('should not call getCurrentPosition when permission is denied', async () => {
      mockLocationPermission.mockRejectedValue({message: 'denied'});

      const {result} = renderHook(() => useHomeLocation());

      await act(async () => {
        await result.current.requestLocation();
      });

      expect(mockGeolocation.getCurrentPosition).not.toHaveBeenCalled();
    });
  });

  describe('Permission Blocked Flow', () => {
    it('should set isPermissionBlocked when permission is blocked', async () => {
      mockLocationPermission.mockRejectedValue({message: 'blocked'});

      const {result} = renderHook(() => useHomeLocation());

      await act(async () => {
        await result.current.requestLocation();
      });

      expect(result.current.isPermissionBlocked).toBe(true);
      expect(result.current.isPermissionDenied).toBe(false);
      expect(result.current.location).toBeUndefined();
    });

    it('should not call getCurrentPosition when permission is blocked', async () => {
      mockLocationPermission.mockRejectedValue({message: 'blocked'});

      const {result} = renderHook(() => useHomeLocation());

      await act(async () => {
        await result.current.requestLocation();
      });

      expect(mockGeolocation.getCurrentPosition).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle getCurrentPosition errors gracefully', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockLocationPermission.mockResolvedValue(undefined);
      mockGeolocation.getCurrentPosition.mockImplementation(
        (_success: any, error: any) => {
          error({code: 1, message: 'Position unavailable'});
        },
      );

      const {result} = renderHook(() => useHomeLocation());

      await act(async () => {
        await result.current.requestLocation();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[useHomeLocation] Error getting position:',
        expect.any(Object),
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle unexpected permission errors', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockLocationPermission.mockRejectedValue({
        message: 'unexpected error',
      });

      const {result} = renderHook(() => useHomeLocation());

      await act(async () => {
        await result.current.requestLocation();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[useHomeLocation] Unexpected error:',
        expect.any(Object),
      );

      consoleErrorSpy.mockRestore();
    });

    it('should not set permission states for unexpected errors', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});

      mockLocationPermission.mockRejectedValue({
        message: 'network error',
      });

      const {result} = renderHook(() => useHomeLocation());

      await act(async () => {
        await result.current.requestLocation();
      });

      expect(result.current.isPermissionDenied).toBe(false);
      expect(result.current.isPermissionBlocked).toBe(false);
    });
  });

  describe('clearPermissionState', () => {
    it('should clear denied permission state', async () => {
      mockLocationPermission.mockRejectedValue({message: 'denied'});

      const {result} = renderHook(() => useHomeLocation());

      await act(async () => {
        await result.current.requestLocation();
      });

      expect(result.current.isPermissionDenied).toBe(true);

      act(() => {
        result.current.clearPermissionState();
      });

      expect(result.current.isPermissionDenied).toBe(false);
      expect(result.current.isPermissionBlocked).toBe(false);
    });

    it('should clear blocked permission state', async () => {
      mockLocationPermission.mockRejectedValue({message: 'blocked'});

      const {result} = renderHook(() => useHomeLocation());

      await act(async () => {
        await result.current.requestLocation();
      });

      expect(result.current.isPermissionBlocked).toBe(true);

      act(() => {
        result.current.clearPermissionState();
      });

      expect(result.current.isPermissionDenied).toBe(false);
      expect(result.current.isPermissionBlocked).toBe(false);
    });

    it('should not affect location state', async () => {
      const mockPosition = {
        coords: {latitude: 37.7749, longitude: -122.4194},
        timestamp: Date.now(),
      };

      mockLocationPermission.mockResolvedValue(undefined);
      mockGeolocation.getCurrentPosition.mockImplementation((success: any) => {
        success(mockPosition);
      });

      const {result} = renderHook(() => useHomeLocation());

      await act(async () => {
        await result.current.requestLocation();
      });

      const locationBeforeClear = result.current.location;

      act(() => {
        result.current.clearPermissionState();
      });

      expect(result.current.location).toBe(locationBeforeClear);
    });
  });

  describe('Multiple Requests', () => {
    it('should handle multiple requestLocation calls', async () => {
      const mockPosition1 = {
        coords: {latitude: 37.7749, longitude: -122.4194},
        timestamp: Date.now(),
      };
      const mockPosition2 = {
        coords: {latitude: 40.7128, longitude: -74.006},
        timestamp: Date.now(),
      };

      mockLocationPermission.mockResolvedValue(undefined);

      const {result} = renderHook(() => useHomeLocation());

      // First request
      mockGeolocation.getCurrentPosition.mockImplementation((success: any) => {
        success(mockPosition1);
      });

      await act(async () => {
        await result.current.requestLocation();
      });

      expect(result.current.location).toEqual(mockPosition1);

      // Second request
      mockGeolocation.getCurrentPosition.mockImplementation((success: any) => {
        success(mockPosition2);
      });

      await act(async () => {
        await result.current.requestLocation();
      });

      expect(result.current.location).toEqual(mockPosition2);
    });

    it('should handle permission state transitions', async () => {
      const {result} = renderHook(() => useHomeLocation());

      // First: denied
      mockLocationPermission.mockRejectedValue({message: 'denied'});
      await act(async () => {
        await result.current.requestLocation();
      });
      expect(result.current.isPermissionDenied).toBe(true);

      // Then: blocked
      mockLocationPermission.mockRejectedValue({message: 'blocked'});
      await act(async () => {
        await result.current.requestLocation();
      });
      expect(result.current.isPermissionBlocked).toBe(true);
      expect(result.current.isPermissionDenied).toBe(false);

      // Finally: granted
      mockLocationPermission.mockResolvedValue(undefined);
      mockGeolocation.getCurrentPosition.mockImplementation((success: any) => {
        success({coords: {}, timestamp: Date.now()});
      });
      await act(async () => {
        await result.current.requestLocation();
      });
      expect(result.current.isPermissionDenied).toBe(false);
      expect(result.current.isPermissionBlocked).toBe(false);
    });
  });

  describe('Function Stability', () => {
    it('should maintain stable function references across re-renders', () => {
      const {result, rerender} = renderHook(() => useHomeLocation());

      const requestLocationRef1 = result.current.requestLocation;
      const clearPermissionStateRef1 = result.current.clearPermissionState;

      rerender();

      expect(result.current.requestLocation).toBe(requestLocationRef1);
      expect(result.current.clearPermissionState).toBe(
        clearPermissionStateRef1,
      );
    });
  });
});
