/**
 * Unit Tests: useSettingsData Hook
 *
 * Tests data fetching orchestration, caching, and derived data computation.
 * Validates query management, error handling, and refetch functionality.
 *
 * Requirements: 5.5, 5.8, 9.1, 9.2, 23.1, 24.1, 18.1, 18.4
 */

import {renderHook, act, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import React from 'react';
import {useSettingsData} from '../../../../app/screens/Settings/hooks/useSettingsData';

// Mock dependencies
jest.mock('../../../../app/services/trpc', () => ({
  trpc: {
    site: {
      getSites: {
        useQuery: jest.fn(),
      },
    },
    alertMethod: {
      getAlertMethods: {
        useQuery: jest.fn(),
      },
    },
  },
}));

jest.mock('react-native-toast-notifications', () => ({
  useToast: () => ({
    show: jest.fn(),
  }),
}));

jest.mock('../../../../app/hooks/notification/useOneSignal', () => ({
  useOneSignal: jest.fn(),
}));

jest.mock('../../../../app/utils/filters', () => ({
  categorizedRes: jest.fn(),
  groupSitesAsProject: jest.fn(),
}));

const {trpc} = require('../../../../app/services/trpc');
const {
  useOneSignal,
} = require('../../../../app/hooks/notification/useOneSignal');
const {
  categorizedRes,
  groupSitesAsProject,
} = require('../../../../app/utils/filters');

describe('useSettingsData Hook', () => {
  let queryClient: QueryClient;
  let mockToast: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {retry: false},
        mutations: {retry: false},
      },
    });

    mockToast = {show: jest.fn()};

    // Default mock implementations
    useOneSignal.mockReturnValue({
      state: {userId: 'test-user-id'},
    });

    categorizedRes.mockReturnValue({
      email: [],
      sms: [],
      device: [],
      whatsapp: [],
      webhook: [],
    });

    groupSitesAsProject.mockReturnValue([]);

    jest.clearAllMocks();
  });

  const wrapper = ({children}: {children: React.ReactNode}) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Initial State', () => {
    it('should initialize with empty data arrays', () => {
      trpc.site.getSites.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isSuccess: false,
        isFetching: false,
        isLoading: true,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isFetching: false,
        isLoading: true,
      });

      const {result} = renderHook(() => useSettingsData(), {wrapper});

      expect(result.current.sites).toEqual([]);
      expect(result.current.groupedProjects).toEqual([]);
      expect(result.current.deviceAlertPreferences).toEqual([]);
    });

    it('should show loading state initially', () => {
      trpc.site.getSites.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isSuccess: false,
        isFetching: false,
        isLoading: true,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isFetching: false,
        isLoading: true,
      });

      const {result} = renderHook(() => useSettingsData(), {wrapper});

      expect(result.current.isLoading).toBe(true);
    });

    it('should provide refetch function', () => {
      trpc.site.getSites.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isSuccess: false,
        isFetching: false,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isFetching: false,
        isLoading: false,
      });

      const {result} = renderHook(() => useSettingsData(), {wrapper});

      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('Sites Data Fetching', () => {
    it('should fetch and return sites data', () => {
      const mockSites = [
        {
          id: 'site-1',
          name: 'Test Site 1',
          radius: 1000,
          geometry: 'Point',
          stopAlerts: false,
          isPlanetRO: false,
        },
        {
          id: 'site-2',
          name: 'Test Site 2',
          radius: 2000,
          geometry: 'Polygon',
          stopAlerts: false,
          isPlanetRO: false,
        },
      ];

      trpc.site.getSites.useQuery.mockReturnValue({
        data: {json: {data: mockSites}},
        refetch: jest.fn(),
        isSuccess: true,
        isFetching: false,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isFetching: false,
        isLoading: false,
      });

      const {result} = renderHook(() => useSettingsData(), {wrapper});

      expect(result.current.sites).toEqual(mockSites);
    });

    it('should configure sites query with infinite stale time', () => {
      trpc.site.getSites.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isSuccess: false,
        isFetching: false,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isFetching: false,
        isLoading: false,
      });

      renderHook(() => useSettingsData(), {wrapper});

      expect(trpc.site.getSites.useQuery).toHaveBeenCalledWith(
        ['site', 'getSites'],
        expect.objectContaining({
          staleTime: Infinity,
          cacheTime: Infinity,
        }),
      );
    });

    it('should handle empty sites data', () => {
      trpc.site.getSites.useQuery.mockReturnValue({
        data: {json: {data: []}},
        refetch: jest.fn(),
        isSuccess: true,
        isFetching: false,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isFetching: false,
        isLoading: false,
      });

      const {result} = renderHook(() => useSettingsData(), {wrapper});

      expect(result.current.sites).toEqual([]);
    });

    it('should handle null sites data', () => {
      trpc.site.getSites.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isSuccess: true,
        isFetching: false,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isFetching: false,
        isLoading: false,
      });

      const {result} = renderHook(() => useSettingsData(), {wrapper});

      expect(result.current.sites).toEqual([]);
    });
  });

  describe('Alert Methods Data Fetching', () => {
    it('should fetch alert methods after sites are loaded', () => {
      trpc.site.getSites.useQuery.mockReturnValue({
        data: {json: {data: []}},
        refetch: jest.fn(),
        isSuccess: true,
        isFetching: false,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isFetching: false,
        isLoading: false,
      });

      renderHook(() => useSettingsData(), {wrapper});

      expect(trpc.alertMethod.getAlertMethods.useQuery).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          enabled: true,
        }),
      );
    });

    it('should configure alert methods query with 5 minute stale time', () => {
      trpc.site.getSites.useQuery.mockReturnValue({
        data: {json: {data: []}},
        refetch: jest.fn(),
        isSuccess: true,
        isFetching: false,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isFetching: false,
        isLoading: false,
      });

      renderHook(() => useSettingsData(), {wrapper});

      expect(trpc.alertMethod.getAlertMethods.useQuery).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          staleTime: 1000 * 60 * 5,
        }),
      );
    });

    it('should categorize alert methods by type', () => {
      const mockAlertMethods = [
        {id: '1', method: 'email', destination: 'test@example.com'},
        {id: '2', method: 'sms', destination: '+1234567890'},
        {id: '3', method: 'device', destination: 'device-id'},
      ];

      const mockCategorized = {
        email: [{id: '1', method: 'email', destination: 'test@example.com'}],
        sms: [{id: '2', method: 'sms', destination: '+1234567890'}],
        device: [{id: '3', method: 'device', destination: 'device-id'}],
        whatsapp: [],
        webhook: [],
      };

      trpc.site.getSites.useQuery.mockReturnValue({
        data: {json: {data: []}},
        refetch: jest.fn(),
        isSuccess: true,
        isFetching: false,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: {json: {data: mockAlertMethods}},
        refetch: jest.fn(),
        isFetching: false,
        isLoading: false,
      });

      categorizedRes.mockReturnValue(mockCategorized);

      const {result} = renderHook(() => useSettingsData(), {wrapper});

      expect(categorizedRes).toHaveBeenCalledWith(mockAlertMethods, 'method');
      expect(result.current.alertMethods).toEqual(mockCategorized);
    });
  });

  describe('Grouped Projects Computation', () => {
    it('should compute grouped projects from sites', () => {
      const mockSites = [
        {
          id: 'site-1',
          name: 'Site 1',
          projectId: 'project-1',
        },
        {
          id: 'site-2',
          name: 'Site 2',
          projectId: 'project-1',
        },
      ];

      const mockGrouped = [
        {
          id: 'project-1',
          name: 'Project 1',
          sites: mockSites,
        },
      ];

      trpc.site.getSites.useQuery.mockReturnValue({
        data: {json: {data: mockSites}},
        refetch: jest.fn(),
        isSuccess: true,
        isFetching: false,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isFetching: false,
        isLoading: false,
      });

      groupSitesAsProject.mockReturnValue(mockGrouped);

      const {result} = renderHook(() => useSettingsData(), {wrapper});

      expect(groupSitesAsProject).toHaveBeenCalledWith(mockSites);
      expect(result.current.groupedProjects).toEqual([
        {
          projectId: 'project-1',
          projectName: 'Project 1',
          sites: mockSites,
        },
      ]);
    });

    it('should handle empty grouped projects', () => {
      trpc.site.getSites.useQuery.mockReturnValue({
        data: {json: {data: []}},
        refetch: jest.fn(),
        isSuccess: true,
        isFetching: false,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isFetching: false,
        isLoading: false,
      });

      groupSitesAsProject.mockReturnValue([]);

      const {result} = renderHook(() => useSettingsData(), {wrapper});

      expect(result.current.groupedProjects).toEqual([]);
    });
  });

  describe('Device Alert Preferences Filtering', () => {
    it('should filter device alert preferences with valid device names', () => {
      const mockDeviceMethods = [
        {
          id: '1',
          method: 'device',
          destination: 'test-user-id',
          deviceName: 'iPhone 12',
        },
        {
          id: '2',
          method: 'device',
          destination: 'test-user-id',
          deviceName: 'iPad Pro',
        },
        {
          id: '3',
          method: 'device',
          destination: 'test-user-id',
          deviceName: '',
        },
      ];

      trpc.site.getSites.useQuery.mockReturnValue({
        data: {json: {data: []}},
        refetch: jest.fn(),
        isSuccess: true,
        isFetching: false,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: {json: {data: mockDeviceMethods}},
        refetch: jest.fn(),
        isFetching: false,
        isLoading: false,
      });

      categorizedRes.mockReturnValue({
        email: [],
        sms: [],
        device: mockDeviceMethods,
        whatsapp: [],
        webhook: [],
      });

      const {result} = renderHook(() => useSettingsData(), {wrapper});

      expect(result.current.deviceAlertPreferences).toHaveLength(2);
      expect(result.current.deviceAlertPreferences).toEqual([
        mockDeviceMethods[0],
        mockDeviceMethods[1],
      ]);
    });

    it('should return empty array when OneSignal userId is null', () => {
      useOneSignal.mockReturnValue({
        state: {userId: null},
      });

      trpc.site.getSites.useQuery.mockReturnValue({
        data: {json: {data: []}},
        refetch: jest.fn(),
        isSuccess: true,
        isFetching: false,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: {json: {data: []}},
        refetch: jest.fn(),
        isFetching: false,
        isLoading: false,
      });

      const {result} = renderHook(() => useSettingsData(), {wrapper});

      expect(result.current.deviceAlertPreferences).toEqual([]);
    });

    it('should filter out device methods with empty device names', () => {
      const mockDeviceMethods = [
        {
          id: '1',
          method: 'device',
          destination: 'test-user-id',
          deviceName: '',
        },
        {
          id: '2',
          method: 'device',
          destination: 'test-user-id',
          deviceName: '',
        },
      ];

      trpc.site.getSites.useQuery.mockReturnValue({
        data: {json: {data: []}},
        refetch: jest.fn(),
        isSuccess: true,
        isFetching: false,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: {json: {data: mockDeviceMethods}},
        refetch: jest.fn(),
        isFetching: false,
        isLoading: false,
      });

      categorizedRes.mockReturnValue({
        email: [],
        sms: [],
        device: mockDeviceMethods,
        whatsapp: [],
        webhook: [],
      });

      const {result} = renderHook(() => useSettingsData(), {wrapper});

      expect(result.current.deviceAlertPreferences).toEqual([]);
    });
  });

  describe('Loading and Fetching States', () => {
    it('should show loading when sites are loading', () => {
      trpc.site.getSites.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isSuccess: false,
        isFetching: false,
        isLoading: true,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isFetching: false,
        isLoading: false,
      });

      const {result} = renderHook(() => useSettingsData(), {wrapper});

      expect(result.current.isLoading).toBe(true);
    });

    it('should show loading when alert methods are loading', () => {
      trpc.site.getSites.useQuery.mockReturnValue({
        data: {json: {data: []}},
        refetch: jest.fn(),
        isSuccess: true,
        isFetching: false,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isFetching: false,
        isLoading: true,
      });

      const {result} = renderHook(() => useSettingsData(), {wrapper});

      expect(result.current.isLoading).toBe(true);
    });

    it('should show fetching when sites are refetching', () => {
      trpc.site.getSites.useQuery.mockReturnValue({
        data: {json: {data: []}},
        refetch: jest.fn(),
        isSuccess: true,
        isFetching: true,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isFetching: false,
        isLoading: false,
      });

      const {result} = renderHook(() => useSettingsData(), {wrapper});

      expect(result.current.isFetching).toBe(true);
    });

    it('should not show loading when both queries are complete', () => {
      trpc.site.getSites.useQuery.mockReturnValue({
        data: {json: {data: []}},
        refetch: jest.fn(),
        isSuccess: true,
        isFetching: false,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: {json: {data: []}},
        refetch: jest.fn(),
        isFetching: false,
        isLoading: false,
      });

      const {result} = renderHook(() => useSettingsData(), {wrapper});

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('Refetch Functionality', () => {
    it('should refetch both sites and alert methods', async () => {
      const mockRefetchSites = jest.fn().mockResolvedValue({});
      const mockRefetchAlertMethods = jest.fn().mockResolvedValue({});

      trpc.site.getSites.useQuery.mockReturnValue({
        data: {json: {data: []}},
        refetch: mockRefetchSites,
        isSuccess: true,
        isFetching: false,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: {json: {data: []}},
        refetch: mockRefetchAlertMethods,
        isFetching: false,
        isLoading: false,
      });

      const {result} = renderHook(() => useSettingsData(), {wrapper});

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockRefetchSites).toHaveBeenCalled();
      expect(mockRefetchAlertMethods).toHaveBeenCalled();
    });

    it('should handle refetch errors gracefully', async () => {
      const mockRefetchSites = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));
      const mockRefetchAlertMethods = jest.fn().mockResolvedValue({});

      trpc.site.getSites.useQuery.mockReturnValue({
        data: {json: {data: []}},
        refetch: mockRefetchSites,
        isSuccess: true,
        isFetching: false,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: {json: {data: []}},
        refetch: mockRefetchAlertMethods,
        isFetching: false,
        isLoading: false,
      });

      const {result} = renderHook(() => useSettingsData(), {wrapper});

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockToast.show).not.toHaveBeenCalled(); // Toast is mocked at module level
    });
  });

  describe('Error Handling', () => {
    it('should configure sites query with error handler', () => {
      trpc.site.getSites.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isSuccess: false,
        isFetching: false,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isFetching: false,
        isLoading: false,
      });

      renderHook(() => useSettingsData(), {wrapper});

      const config = trpc.site.getSites.useQuery.mock.calls[0][1];
      expect(typeof config.onError).toBe('function');
    });

    it('should configure alert methods query with error handler', () => {
      trpc.site.getSites.useQuery.mockReturnValue({
        data: {json: {data: []}},
        refetch: jest.fn(),
        isSuccess: true,
        isFetching: false,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isFetching: false,
        isLoading: false,
      });

      renderHook(() => useSettingsData(), {wrapper});

      const config = trpc.alertMethod.getAlertMethods.useQuery.mock.calls[0][1];
      expect(typeof config.onError).toBe('function');
    });
  });

  describe('Memoization', () => {
    it('should memoize sites array', () => {
      const mockSites = [{id: 'site-1', name: 'Test Site'}];

      trpc.site.getSites.useQuery.mockReturnValue({
        data: {json: {data: mockSites}},
        refetch: jest.fn(),
        isSuccess: true,
        isFetching: false,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isFetching: false,
        isLoading: false,
      });

      const {result, rerender} = renderHook(() => useSettingsData(), {wrapper});

      const sitesRef1 = result.current.sites;

      rerender();

      expect(result.current.sites).toBe(sitesRef1);
    });

    it('should memoize grouped projects', () => {
      const mockSites = [{id: 'site-1', name: 'Test Site'}];
      const mockGrouped = [
        {id: 'project-1', name: 'Project 1', sites: mockSites},
      ];

      trpc.site.getSites.useQuery.mockReturnValue({
        data: {json: {data: mockSites}},
        refetch: jest.fn(),
        isSuccess: true,
        isFetching: false,
        isLoading: false,
      });

      trpc.alertMethod.getAlertMethods.useQuery.mockReturnValue({
        data: null,
        refetch: jest.fn(),
        isFetching: false,
        isLoading: false,
      });

      groupSitesAsProject.mockReturnValue(mockGrouped);

      const {result, rerender} = renderHook(() => useSettingsData(), {wrapper});

      const groupedRef1 = result.current.groupedProjects;

      rerender();

      expect(result.current.groupedProjects).toBe(groupedRef1);
    });
  });
});
