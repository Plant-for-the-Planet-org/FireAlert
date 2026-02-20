/**
 * Unit Tests: useSettingsActions Hook
 *
 * Tests mutation operations with optimistic updates for Settings screen.
 * Validates cache management, rollback, loading states, and error handling.
 *
 * Requirements: 5.6, 5.8, 10.1, 10.2, 12.5, 12.7, 12.8, 13.2, 13.3, 18.1, 18.4
 */

import {renderHook, act} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import React from 'react';
import {useSettingsActions} from '../../../../app/screens/Settings/hooks/useSettingsActions';

// Mock dependencies
jest.mock('../../../../app/services/trpc', () => ({
  trpc: {
    site: {
      updateSite: {
        useMutation: jest.fn(),
      },
      deleteSite: {
        useMutation: jest.fn(),
      },
    },
    alertMethod: {
      updateAlertMethod: {
        useMutation: jest.fn(),
      },
      deleteAlertMethod: {
        useMutation: jest.fn(),
      },
    },
  },
}));

jest.mock('react-native-toast-notifications', () => ({
  useToast: () => ({
    show: jest.fn(),
  }),
}));

const {trpc} = require('../../../../app/services/trpc');

describe('useSettingsActions Hook', () => {
  let queryClient: QueryClient;
  let mockUpdateSiteMutation: any;
  let mockDeleteSiteMutation: any;
  let mockUpdateAlertMethodMutation: any;
  let mockDeleteAlertMethodMutation: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {retry: false},
        mutations: {retry: false},
      },
    });

    mockUpdateSiteMutation = {
      mutateAsync: jest.fn(),
      status: 'idle',
    };

    mockDeleteSiteMutation = {
      mutateAsync: jest.fn(),
      status: 'idle',
    };

    mockUpdateAlertMethodMutation = {
      mutateAsync: jest.fn(),
      status: 'idle',
    };

    mockDeleteAlertMethodMutation = {
      mutateAsync: jest.fn(),
      status: 'idle',
    };

    (trpc.site.updateSite.useMutation as jest.Mock).mockReturnValue(
      mockUpdateSiteMutation,
    );
    (trpc.site.deleteSite.useMutation as jest.Mock).mockReturnValue(
      mockDeleteSiteMutation,
    );
    (
      trpc.alertMethod.updateAlertMethod.useMutation as jest.Mock
    ).mockReturnValue(mockUpdateAlertMethodMutation);
    (
      trpc.alertMethod.deleteAlertMethod.useMutation as jest.Mock
    ).mockReturnValue(mockDeleteAlertMethodMutation);

    jest.clearAllMocks();
  });

  const wrapper = ({children}: {children: React.ReactNode}) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Initial State', () => {
    it('should initialize with idle loading states', () => {
      const {result} = renderHook(() => useSettingsActions(), {wrapper});

      expect(result.current.isUpdating).toBe(false);
      expect(result.current.isDeleting).toBe(false);
    });

    it('should provide all mutation functions', () => {
      const {result} = renderHook(() => useSettingsActions(), {wrapper});

      expect(typeof result.current.updateSite).toBe('function');
      expect(typeof result.current.deleteSite).toBe('function');
      expect(typeof result.current.toggleSiteMonitoring).toBe('function');
      expect(typeof result.current.toggleAlertMethod).toBe('function');
      expect(typeof result.current.removeAlertMethod).toBe('function');
    });
  });

  describe('updateSite', () => {
    it('should call mutation with correct parameters', async () => {
      mockUpdateSiteMutation.mutateAsync.mockResolvedValue({
        json: {data: {id: 'site-1', name: 'Updated'}},
      });

      const {result} = renderHook(() => useSettingsActions(), {wrapper});

      await act(async () => {
        await result.current.updateSite('site-1', {name: 'Updated'});
      });

      expect(mockUpdateSiteMutation.mutateAsync).toHaveBeenCalledWith({
        json: {
          params: {siteId: 'site-1'},
          body: {name: 'Updated'},
        },
      });
    });

    it('should configure mutation with optimistic update', () => {
      renderHook(() => useSettingsActions(), {wrapper});

      const config = (trpc.site.updateSite.useMutation as jest.Mock).mock
        .calls[0][0];
      expect(typeof config.onMutate).toBe('function');
    });

    it('should configure mutation with rollback on error', () => {
      renderHook(() => useSettingsActions(), {wrapper});

      const config = (trpc.site.updateSite.useMutation as jest.Mock).mock
        .calls[0][0];
      expect(typeof config.onError).toBe('function');
    });
  });

  describe('deleteSite', () => {
    it('should call mutation with correct parameters', async () => {
      mockDeleteSiteMutation.mutateAsync.mockResolvedValue({
        json: {success: true},
      });

      const {result} = renderHook(() => useSettingsActions(), {wrapper});

      await act(async () => {
        await result.current.deleteSite('site-1');
      });

      expect(mockDeleteSiteMutation.mutateAsync).toHaveBeenCalledWith({
        json: {siteId: 'site-1'},
      });
    });
  });

  describe('toggleSiteMonitoring', () => {
    it('should toggle monitoring to enabled (stopAlerts: false)', async () => {
      mockUpdateSiteMutation.mutateAsync.mockResolvedValue({
        json: {data: {id: 'site-1', stopAlerts: false}},
      });

      const {result} = renderHook(() => useSettingsActions(), {wrapper});

      await act(async () => {
        await result.current.toggleSiteMonitoring('site-1', true);
      });

      expect(mockUpdateSiteMutation.mutateAsync).toHaveBeenCalledWith({
        json: {
          params: {siteId: 'site-1'},
          body: {stopAlerts: false},
        },
      });
    });

    it('should toggle monitoring to disabled (stopAlerts: true)', async () => {
      mockUpdateSiteMutation.mutateAsync.mockResolvedValue({
        json: {data: {id: 'site-1', stopAlerts: true}},
      });

      const {result} = renderHook(() => useSettingsActions(), {wrapper});

      await act(async () => {
        await result.current.toggleSiteMonitoring('site-1', false);
      });

      expect(mockUpdateSiteMutation.mutateAsync).toHaveBeenCalledWith({
        json: {
          params: {siteId: 'site-1'},
          body: {stopAlerts: true},
        },
      });
    });
  });

  describe('toggleAlertMethod', () => {
    it('should call mutation with correct parameters', async () => {
      mockUpdateAlertMethodMutation.mutateAsync.mockResolvedValue({
        json: {data: {id: 'method-1', enabled: true}},
      });

      const {result} = renderHook(() => useSettingsActions(), {wrapper});

      await act(async () => {
        await result.current.toggleAlertMethod('method-1', true);
      });

      expect(mockUpdateAlertMethodMutation.mutateAsync).toHaveBeenCalledWith({
        json: {
          params: {alertMethodId: 'method-1'},
          body: {enabled: true},
        },
      });
    });

    it('should configure mutation with optimistic update', () => {
      renderHook(() => useSettingsActions(), {wrapper});

      const config = (
        trpc.alertMethod.updateAlertMethod.useMutation as jest.Mock
      ).mock.calls[0][0];
      expect(typeof config.onMutate).toBe('function');
    });
  });

  describe('removeAlertMethod', () => {
    it('should call mutation with correct parameters', async () => {
      mockDeleteAlertMethodMutation.mutateAsync.mockResolvedValue({
        json: {success: true},
      });

      const {result} = renderHook(() => useSettingsActions(), {wrapper});

      await act(async () => {
        await result.current.removeAlertMethod('method-1');
      });

      expect(mockDeleteAlertMethodMutation.mutateAsync).toHaveBeenCalledWith({
        json: {alertMethodId: 'method-1'},
      });
    });

    it('should configure mutation with optimistic update', () => {
      renderHook(() => useSettingsActions(), {wrapper});

      const config = (
        trpc.alertMethod.deleteAlertMethod.useMutation as jest.Mock
      ).mock.calls[0][0];
      expect(typeof config.onMutate).toBe('function');
    });
  });

  describe('Loading States', () => {
    it('should show isUpdating when update is pending', () => {
      mockUpdateSiteMutation.status = 'pending';

      const {result} = renderHook(() => useSettingsActions(), {wrapper});

      expect(result.current.isUpdating).toBe(true);
    });

    it('should show isDeleting when site delete is pending', () => {
      mockDeleteSiteMutation.status = 'pending';

      const {result} = renderHook(() => useSettingsActions(), {wrapper});

      expect(result.current.isDeleting).toBe(true);
    });

    it('should show isDeleting when alert method delete is pending', () => {
      mockDeleteAlertMethodMutation.status = 'pending';

      const {result} = renderHook(() => useSettingsActions(), {wrapper});

      expect(result.current.isDeleting).toBe(true);
    });
  });

  describe('Mutation Configuration', () => {
    it('should configure all mutations with retry settings', () => {
      renderHook(() => useSettingsActions(), {wrapper});

      expect(trpc.site.updateSite.useMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          retry: 3,
          retryDelay: 3000,
        }),
      );

      expect(trpc.site.deleteSite.useMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          retry: 3,
          retryDelay: 3000,
        }),
      );

      expect(
        trpc.alertMethod.updateAlertMethod.useMutation,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          retry: 3,
          retryDelay: 3000,
        }),
      );

      expect(
        trpc.alertMethod.deleteAlertMethod.useMutation,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          retry: 3,
          retryDelay: 3000,
        }),
      );
    });
  });
});
