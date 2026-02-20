/**
 * useAlertPreferencesVM Hook
 *
 * View Model hook for filtering and managing device-specific alert preferences.
 * Filters device alert methods by current device ID and OneSignal user ID,
 * prioritizing the current device's alert method in the results.
 *
 * @module Settings/hooks/useAlertPreferencesVM
 */

import {useCallback, useEffect, useState} from 'react';
import {useOneSignal} from '../../../hooks/notification/useOneSignal';
import {getDeviceInfo} from '../../../utils/deviceInfo';
import type {AlertMethod} from '../../../services/OneSignal/types';
import type {
  CategorizedAlertMethods,
  UseAlertPreferencesVMReturn,
} from '../types';

/**
 * Custom hook for filtering device alert preferences
 *
 * @param formattedAlertPreferences - Categorized alert methods from server
 * @returns Filtered device alert preferences with refresh function
 *
 * @example
 * ```typescript
 * const {deviceAlertPreferences, refreshDevicePreferences} = useAlertPreferencesVM(
 *   formattedAlertPreferences
 * );
 * ```
 */
export function useAlertPreferencesVM(
  formattedAlertPreferences: CategorizedAlertMethods,
): UseAlertPreferencesVMReturn {
  const {state: oneSignalState} = useOneSignal();
  const [deviceAlertPreferences, setDeviceAlertPreferences] = useState<
    AlertMethod[]
  >([]);

  /**
   * Filters device alert methods by current device ID and OneSignal user ID
   * Prioritizes current device's alert method in the results
   *
   * Algorithm (matches existing Settings.tsx implementation):
   * 1. Return empty array if OneSignal userId is null
   * 2. Get current device ID from device info
   * 3. Filter for current device (matching userId and deviceId)
   * 4. If current device found:
   *    - Place current device first
   *    - Add other devices after
   *    - Filter out entries with empty device names
   * 5. If current device not found:
   *    - Return all device alerts as-is (maintains existing behavior)
   */
  const filterDeviceAlertPreferences = useCallback(async () => {
    try {
      // Handle null OneSignal state gracefully
      const userId = oneSignalState?.userId ?? null;

      if (userId == null) {
        setDeviceAlertPreferences([]);
        return;
      }

      // Get current device information
      const {deviceId} = await getDeviceInfo();

      // Filter for current device's alert method
      const filterDeviceAlertMethod = formattedAlertPreferences.device.filter(
        el => userId === el?.destination && el.deviceId === deviceId,
      );

      // Match exact behavior from Settings.tsx
      if (filterDeviceAlertMethod.length > 0) {
        const filteredData = filterDeviceAlertMethod[0];
        const nonFilteredData = formattedAlertPreferences.device.filter(
          el => userId !== el?.destination || el.deviceId !== deviceId,
        );
        const reorderedDevices = [filteredData, ...nonFilteredData].filter(
          el => el.deviceName !== '',
        );
        setDeviceAlertPreferences(reorderedDevices);
      } else {
        // No current device match - return all device alerts as-is
        setDeviceAlertPreferences(formattedAlertPreferences.device);
      }
    } catch (error) {
      // Handle errors gracefully by returning empty array
      setDeviceAlertPreferences([]);
    }
  }, [formattedAlertPreferences.device, oneSignalState?.userId]);

  /**
   * Refresh device preferences
   * Exposed function to manually trigger preference filtering
   */
  const refreshDevicePreferences = useCallback(async () => {
    await filterDeviceAlertPreferences();
  }, [filterDeviceAlertPreferences]);

  // Auto-refresh when dependencies change
  useEffect(() => {
    filterDeviceAlertPreferences();
  }, [filterDeviceAlertPreferences]);

  return {
    deviceAlertPreferences,
    refreshDevicePreferences,
  };
}
