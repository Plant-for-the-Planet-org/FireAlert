/**
 * useHomeLocation Hook
 *
 * Manages location permissions and device location for the Home screen.
 * Handles permission states: granted, denied, and blocked.
 *
 * @returns {UseHomeLocationReturn} Location state and permission management functions
 *
 * Requirements: 5.1, 5.8, 5.9, 11.1, 11.2, 11.3
 */

import {useState, useCallback} from 'react';
import Geolocation from 'react-native-geolocation-service';
import type MapboxGL from '@rnmapbox/maps';
import {locationPermission} from '../../../utils/permissions';
import type {UseHomeLocationReturn} from '../types';

export const useHomeLocation = (): UseHomeLocationReturn => {
  const [location, setLocation] = useState<
    MapboxGL.Location | Geolocation.GeoPosition | undefined
  >();
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [isPermissionBlocked, setIsPermissionBlocked] =
    useState<boolean>(false);

  /**
   * Requests location permission and updates device location
   * Handles three permission states: granted, denied, blocked
   */
  const requestLocation = useCallback(async (): Promise<void> => {
    try {
      // Request location permission
      await locationPermission();

      // Permission granted - get current position
      Geolocation.getCurrentPosition(
        position => {
          setLocation(position);
          setIsPermissionDenied(false);
          setIsPermissionBlocked(false);
        },
        err => {
          console.error('[useHomeLocation] Error getting position:', err);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          accuracy: {
            android: 'high',
            ios: 'bestForNavigation',
          },
        },
      );
    } catch (err: any) {
      // Handle permission errors
      if (err?.message === 'blocked') {
        setIsPermissionBlocked(true);
        setIsPermissionDenied(false);
      } else if (err?.message === 'denied') {
        setIsPermissionDenied(true);
        setIsPermissionBlocked(false);
      } else {
        console.error('[useHomeLocation] Unexpected error:', err);
      }
    }
  }, []);

  /**
   * Clears permission denial state
   * Used when user dismisses permission alert
   */
  const clearPermissionState = useCallback((): void => {
    setIsPermissionDenied(false);
    setIsPermissionBlocked(false);
  }, []);

  return {
    location,
    isPermissionDenied,
    isPermissionBlocked,
    requestLocation,
    clearPermissionState,
  };
};
