/**
 * Unit Tests: useAlertPreferencesVM Hook
 *
 * Tests device-specific alert preference filtering logic.
 * Validates current device prioritization and OneSignal state handling.
 *
 * Requirements: 5.7, 5.8, 13.6, 13.7, 25.1, 25.2, 25.3, 25.4, 25.5, 18.1, 18.4
 */

import {renderHook} from '@testing-library/react-native';
import {useAlertPreferencesVM} from '../../../../app/screens/Settings/hooks/useAlertPreferencesVM';
import type {CategorizedAlertMethods} from '../../../../app/screens/Settings/types';

// Mock dependencies
jest.mock('../../../../app/hooks/notification/useOneSignal');
jest.mock('react-native-device-info', () => ({
  getDeviceId: jest.fn(),
}));

const {
  useOneSignal,
} = require('../../../../app/hooks/notification/useOneSignal');
const DeviceInfo = require('react-native-device-info');

describe('useAlertPreferencesVM Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    DeviceInfo.getDeviceId.mockReturnValue('current-device-id');
  });

  describe('Initial State', () => {
    it('should return empty array when OneSignal userId is null', () => {
      useOneSignal.mockReturnValue({
        state: {userId: null},
      });

      const mockAlertMethods: CategorizedAlertMethods = {
        email: [],
        sms: [],
        device: [],
        whatsapp: [],
        webhook: [],
      };

      const {result} = renderHook(() =>
        useAlertPreferencesVM(mockAlertMethods),
      );

      expect(result.current.deviceAlertPreferences).toEqual([]);
    });

    it('should return empty array when device methods are empty', () => {
      useOneSignal.mockReturnValue({
        state: {userId: 'test-user-id'},
      });

      const mockAlertMethods: CategorizedAlertMethods = {
        email: [],
        sms: [],
        device: [],
        whatsapp: [],
        webhook: [],
      };

      const {result} = renderHook(() =>
        useAlertPreferencesVM(mockAlertMethods),
      );

      expect(result.current.deviceAlertPreferences).toEqual([]);
    });

    it('should provide refreshDevicePreferences function', () => {
      useOneSignal.mockReturnValue({
        state: {userId: 'test-user-id'},
      });

      const mockAlertMethods: CategorizedAlertMethods = {
        email: [],
        sms: [],
        device: [],
        whatsapp: [],
        webhook: [],
      };

      const {result} = renderHook(() =>
        useAlertPreferencesVM(mockAlertMethods),
      );

      expect(typeof result.current.refreshDevicePreferences).toBe('function');
    });
  });

  describe('Device Filtering', () => {
    it('should filter device methods by current device ID', () => {
      useOneSignal.mockReturnValue({
        state: {userId: 'test-user-id'},
      });

      const mockAlertMethods: CategorizedAlertMethods = {
        email: [],
        sms: [],
        device: [
          {
            id: '1',
            method: 'device',
            destination: 'test-user-id',
            deviceId: 'current-device-id',
            deviceName: 'iPhone 12',
            enabled: true,
            verified: true,
          },
          {
            id: '2',
            method: 'device',
            destination: 'test-user-id',
            deviceId: 'other-device-id',
            deviceName: 'iPad Pro',
            enabled: true,
            verified: true,
          },
        ],
        whatsapp: [],
        webhook: [],
      };

      const {result} = renderHook(() =>
        useAlertPreferencesVM(mockAlertMethods),
      );

      expect(result.current.deviceAlertPreferences).toHaveLength(2);
    });

    it('should prioritize current device first in results', () => {
      useOneSignal.mockReturnValue({
        state: {userId: 'test-user-id'},
      });

      const mockAlertMethods: CategorizedAlertMethods = {
        email: [],
        sms: [],
        device: [
          {
            id: '1',
            method: 'device',
            destination: 'test-user-id',
            deviceId: 'other-device-id',
            deviceName: 'iPad Pro',
            enabled: true,
            verified: true,
          },
          {
            id: '2',
            method: 'device',
            destination: 'test-user-id',
            deviceId: 'current-device-id',
            deviceName: 'iPhone 12',
            enabled: true,
            verified: true,
          },
        ],
        whatsapp: [],
        webhook: [],
      };

      const {result} = renderHook(() =>
        useAlertPreferencesVM(mockAlertMethods),
      );

      expect(result.current.deviceAlertPreferences[0].deviceId).toBe(
        'current-device-id',
      );
      expect(result.current.deviceAlertPreferences[0].deviceName).toBe(
        'iPhone 12',
      );
    });

    it('should filter by OneSignal userId', () => {
      useOneSignal.mockReturnValue({
        state: {userId: 'test-user-id'},
      });

      const mockAlertMethods: CategorizedAlertMethods = {
        email: [],
        sms: [],
        device: [
          {
            id: '1',
            method: 'device',
            destination: 'test-user-id',
            deviceId: 'current-device-id',
            deviceName: 'iPhone 12',
            enabled: true,
            verified: true,
          },
          {
            id: '2',
            method: 'device',
            destination: 'other-user-id',
            deviceId: 'current-device-id',
            deviceName: 'iPhone 13',
            enabled: true,
            verified: true,
          },
        ],
        whatsapp: [],
        webhook: [],
      };

      const {result} = renderHook(() =>
        useAlertPreferencesVM(mockAlertMethods),
      );

      expect(result.current.deviceAlertPreferences).toHaveLength(1);
      expect(result.current.deviceAlertPreferences[0].destination).toBe(
        'test-user-id',
      );
    });

    it('should filter out devices with empty device names', () => {
      useOneSignal.mockReturnValue({
        state: {userId: 'test-user-id'},
      });

      const mockAlertMethods: CategorizedAlertMethods = {
        email: [],
        sms: [],
        device: [
          {
            id: '1',
            method: 'device',
            destination: 'test-user-id',
            deviceId: 'current-device-id',
            deviceName: '',
            enabled: true,
            verified: true,
          },
          {
            id: '2',
            method: 'device',
            destination: 'test-user-id',
            deviceId: 'other-device-id',
            deviceName: 'iPad Pro',
            enabled: true,
            verified: true,
          },
        ],
        whatsapp: [],
        webhook: [],
      };

      const {result} = renderHook(() =>
        useAlertPreferencesVM(mockAlertMethods),
      );

      expect(result.current.deviceAlertPreferences).toHaveLength(1);
      expect(result.current.deviceAlertPreferences[0].deviceName).toBe(
        'iPad Pro',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined OneSignal state', () => {
      useOneSignal.mockReturnValue({
        state: undefined,
      });

      const mockAlertMethods: CategorizedAlertMethods = {
        email: [],
        sms: [],
        device: [
          {
            id: '1',
            method: 'device',
            destination: 'test-user-id',
            deviceId: 'current-device-id',
            deviceName: 'iPhone 12',
            enabled: true,
            verified: true,
          },
        ],
        whatsapp: [],
        webhook: [],
      };

      const {result} = renderHook(() =>
        useAlertPreferencesVM(mockAlertMethods),
      );

      expect(result.current.deviceAlertPreferences).toEqual([]);
    });

    it('should handle only current device in list', () => {
      useOneSignal.mockReturnValue({
        state: {userId: 'test-user-id'},
      });

      const mockAlertMethods: CategorizedAlertMethods = {
        email: [],
        sms: [],
        device: [
          {
            id: '1',
            method: 'device',
            destination: 'test-user-id',
            deviceId: 'current-device-id',
            deviceName: 'iPhone 12',
            enabled: true,
            verified: true,
          },
        ],
        whatsapp: [],
        webhook: [],
      };

      const {result} = renderHook(() =>
        useAlertPreferencesVM(mockAlertMethods),
      );

      expect(result.current.deviceAlertPreferences).toHaveLength(1);
      expect(result.current.deviceAlertPreferences[0].deviceId).toBe(
        'current-device-id',
      );
    });

    it('should handle no current device in list', () => {
      useOneSignal.mockReturnValue({
        state: {userId: 'test-user-id'},
      });

      const mockAlertMethods: CategorizedAlertMethods = {
        email: [],
        sms: [],
        device: [
          {
            id: '1',
            method: 'device',
            destination: 'test-user-id',
            deviceId: 'other-device-id-1',
            deviceName: 'iPad Pro',
            enabled: true,
            verified: true,
          },
          {
            id: '2',
            method: 'device',
            destination: 'test-user-id',
            deviceId: 'other-device-id-2',
            deviceName: 'iPhone 13',
            enabled: true,
            verified: true,
          },
        ],
        whatsapp: [],
        webhook: [],
      };

      const {result} = renderHook(() =>
        useAlertPreferencesVM(mockAlertMethods),
      );

      expect(result.current.deviceAlertPreferences).toHaveLength(2);
      // Should return other devices when current device is not in list
      expect(result.current.deviceAlertPreferences[0].deviceId).toBe(
        'other-device-id-1',
      );
    });
  });

  describe('Memoization', () => {
    it('should memoize device preferences when inputs do not change', () => {
      useOneSignal.mockReturnValue({
        state: {userId: 'test-user-id'},
      });

      const mockAlertMethods: CategorizedAlertMethods = {
        email: [],
        sms: [],
        device: [
          {
            id: '1',
            method: 'device',
            destination: 'test-user-id',
            deviceId: 'current-device-id',
            deviceName: 'iPhone 12',
            enabled: true,
            verified: true,
          },
        ],
        whatsapp: [],
        webhook: [],
      };

      const {result, rerender} = renderHook(() =>
        useAlertPreferencesVM(mockAlertMethods),
      );

      const preferencesRef1 = result.current.deviceAlertPreferences;

      rerender();

      expect(result.current.deviceAlertPreferences).toBe(preferencesRef1);
    });
  });

  describe('refreshDevicePreferences', () => {
    it('should be a stable function reference', () => {
      useOneSignal.mockReturnValue({
        state: {userId: 'test-user-id'},
      });

      const mockAlertMethods: CategorizedAlertMethods = {
        email: [],
        sms: [],
        device: [],
        whatsapp: [],
        webhook: [],
      };

      const {result, rerender} = renderHook(() =>
        useAlertPreferencesVM(mockAlertMethods),
      );

      const refreshRef1 = result.current.refreshDevicePreferences;

      rerender();

      expect(result.current.refreshDevicePreferences).toBe(refreshRef1);
    });
  });
});
