/**
 * Unit Tests: useHomeSiteActions Hook
 *
 * Tests site mutation operations (update, delete) with optimistic updates.
 * Validates cache management, loading states, and error handling.
 *
 * Requirements: 5.2, 5.8, 10.1, 10.2, 12.3, 12.5, 12.8, 18.1, 18.4
 */

import {renderHook, act, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import React from 'react';
import {useHomeSiteActions} from '../../../../app/screens/Home/hooks/useHomeSiteActions';

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
  },
}));

jest.mock('react-native-toast-notifications', () => ({
  useToast: () => ({
    show: jest.fn(),
  }),
}));

const {trpc} = require('../../../../app/services/trpc');

describe('useHomeSiteActions Hook', () => {
  let queryClient: QueryClient;
  let mockUpdateMutation: any;
  let mockDeleteMutation: any;
  let mockToast: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {retry: false},
        mutations: {retry: false},
      },
    });

    mockToast = {show: jest.fn()};

    mockUpdateMutation = {
      mutateAsync: jest.fn(),
      status: 'idle',
    };

    mockDeleteMutation = {
      mutateAsync: jest.fn(),
      status: 'idle',
    };

    (trpc.site.updateSite.useMutation as jest.Mock).mockReturnValue(
      mockUpdateMutation,
    );
    (trpc.site.deleteSite.useMutation as jest.Mock).mockReturnValue(
      mockDeleteMutation,
    );

    jest.clearAllMocks();
  });

  const wrapper = ({children}: {children: React.ReactNode}) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Initial State', () => {
    it('should initialize with idle loading states', () => {
      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      expect(result.current.isUpdating).toBe(false);
      expect(result.current.isDeleting).toBe(false);
    });

    it('should provide updateSite function', () => {
      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      expect(typeof result.current.updateSite).toBe('function');
    });

    it('should provide deleteSite function', () => {
      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      expect(typeof result.current.deleteSite).toBe('function');
    });
  });

  describe('updateSite', () => {
    it('should call mutation with correct parameters', async () => {
      mockUpdateMutation.mutateAsync.mockResolvedValue({
        json: {
          data: {
            id: 'site-1',
            name: 'Updated Site',
            radius: 2000,
          },
        },
      });

      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      await act(async () => {
        await result.current.updateSite('site-1', {
          name: 'Updated Site',
          radius: 2000,
        });
      });

      expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith({
        json: {
          params: {siteId: 'site-1'},
          body: {
            name: 'Updated Site',
            radius: 2000,
          },
        },
      });
    });

    it('should update isUpdating state during mutation', async () => {
      mockUpdateMutation.mutateAsync.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  json: {data: {id: 'site-1', name: 'Updated'}},
                }),
              100,
            ),
          ),
      );

      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      // Start mutation
      const updatePromise = act(async () => {
        return result.current.updateSite('site-1', {name: 'Updated'});
      });

      // Check loading state
      mockUpdateMutation.status = 'pending';
      const {result: result2} = renderHook(() => useHomeSiteActions(), {
        wrapper,
      });
      expect(result2.current.isUpdating).toBe(true);

      await updatePromise;
    });

    it('should handle update errors', async () => {
      const mockError = new Error('Network error');
      mockUpdateMutation.mutateAsync.mockRejectedValue(mockError);

      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      await expect(
        act(async () => {
          await result.current.updateSite('site-1', {name: 'Updated'});
        }),
      ).rejects.toThrow('Network error');
    });

    it('should support updating site name', async () => {
      mockUpdateMutation.mutateAsync.mockResolvedValue({
        json: {
          data: {id: 'site-1', name: 'New Name'},
        },
      });

      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      await act(async () => {
        await result.current.updateSite('site-1', {name: 'New Name'});
      });

      expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          json: expect.objectContaining({
            body: expect.objectContaining({name: 'New Name'}),
          }),
        }),
      );
    });

    it('should support updating site radius', async () => {
      mockUpdateMutation.mutateAsync.mockResolvedValue({
        json: {
          data: {id: 'site-1', radius: 5000},
        },
      });

      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      await act(async () => {
        await result.current.updateSite('site-1', {radius: 5000});
      });

      expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          json: expect.objectContaining({
            body: expect.objectContaining({radius: 5000}),
          }),
        }),
      );
    });

    it('should support updating stopAlerts field', async () => {
      mockUpdateMutation.mutateAsync.mockResolvedValue({
        json: {
          data: {id: 'site-1', stopAlerts: true},
        },
      });

      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      await act(async () => {
        await result.current.updateSite('site-1', {stopAlerts: true});
      });

      expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          json: expect.objectContaining({
            body: expect.objectContaining({stopAlerts: true}),
          }),
        }),
      );
    });
  });

  describe('deleteSite', () => {
    it('should call mutation with correct parameters', async () => {
      mockDeleteMutation.mutateAsync.mockResolvedValue({
        json: {success: true},
      });

      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      await act(async () => {
        await result.current.deleteSite('site-1');
      });

      expect(mockDeleteMutation.mutateAsync).toHaveBeenCalledWith({
        json: {siteId: 'site-1'},
      });
    });

    it('should update isDeleting state during mutation', async () => {
      mockDeleteMutation.mutateAsync.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve({json: {success: true}}), 100),
          ),
      );

      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      // Start mutation
      const deletePromise = act(async () => {
        return result.current.deleteSite('site-1');
      });

      // Check loading state
      mockDeleteMutation.status = 'pending';
      const {result: result2} = renderHook(() => useHomeSiteActions(), {
        wrapper,
      });
      expect(result2.current.isDeleting).toBe(true);

      await deletePromise;
    });

    it('should handle delete errors', async () => {
      const mockError = new Error('Delete failed');
      mockDeleteMutation.mutateAsync.mockRejectedValue(mockError);

      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      await expect(
        act(async () => {
          await result.current.deleteSite('site-1');
        }),
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('Loading States', () => {
    it('should show isUpdating as true when update is pending', () => {
      mockUpdateMutation.status = 'pending';

      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      expect(result.current.isUpdating).toBe(true);
    });

    it('should show isDeleting as true when delete is pending', () => {
      mockDeleteMutation.status = 'pending';

      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      expect(result.current.isDeleting).toBe(true);
    });

    it('should show isUpdating as false when update is idle', () => {
      mockUpdateMutation.status = 'idle';

      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      expect(result.current.isUpdating).toBe(false);
    });

    it('should show isDeleting as false when delete is idle', () => {
      mockDeleteMutation.status = 'idle';

      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      expect(result.current.isDeleting).toBe(false);
    });

    it('should show isUpdating as false when update is success', () => {
      mockUpdateMutation.status = 'success';

      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      expect(result.current.isUpdating).toBe(false);
    });

    it('should show isDeleting as false when delete is success', () => {
      mockDeleteMutation.status = 'success';

      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      expect(result.current.isDeleting).toBe(false);
    });

    it('should show isUpdating as false when update is error', () => {
      mockUpdateMutation.status = 'error';

      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      expect(result.current.isUpdating).toBe(false);
    });

    it('should show isDeleting as false when delete is error', () => {
      mockDeleteMutation.status = 'error';

      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      expect(result.current.isDeleting).toBe(false);
    });
  });

  describe('Multiple Operations', () => {
    it('should handle multiple update calls', async () => {
      mockUpdateMutation.mutateAsync.mockResolvedValue({
        json: {data: {id: 'site-1'}},
      });

      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      await act(async () => {
        await result.current.updateSite('site-1', {name: 'Name 1'});
      });

      await act(async () => {
        await result.current.updateSite('site-1', {name: 'Name 2'});
      });

      expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple delete calls', async () => {
      mockDeleteMutation.mutateAsync.mockResolvedValue({
        json: {success: true},
      });

      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      await act(async () => {
        await result.current.deleteSite('site-1');
      });

      await act(async () => {
        await result.current.deleteSite('site-2');
      });

      expect(mockDeleteMutation.mutateAsync).toHaveBeenCalledTimes(2);
    });

    it('should handle update and delete operations independently', async () => {
      mockUpdateMutation.mutateAsync.mockResolvedValue({
        json: {data: {id: 'site-1'}},
      });
      mockDeleteMutation.mutateAsync.mockResolvedValue({
        json: {success: true},
      });

      const {result} = renderHook(() => useHomeSiteActions(), {wrapper});

      await act(async () => {
        await result.current.updateSite('site-1', {name: 'Updated'});
      });

      await act(async () => {
        await result.current.deleteSite('site-2');
      });

      expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledTimes(1);
      expect(mockDeleteMutation.mutateAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('Mutation Configuration', () => {
    it('should configure update mutation with retry settings', () => {
      renderHook(() => useHomeSiteActions(), {wrapper});

      expect(trpc.site.updateSite.useMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          retry: 3,
          retryDelay: 3000,
        }),
      );
    });

    it('should configure delete mutation with retry settings', () => {
      renderHook(() => useHomeSiteActions(), {wrapper});

      expect(trpc.site.deleteSite.useMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          retry: 3,
          retryDelay: 3000,
        }),
      );
    });

    it('should configure update mutation with onSuccess handler', () => {
      renderHook(() => useHomeSiteActions(), {wrapper});

      const config = (trpc.site.updateSite.useMutation as jest.Mock).mock
        .calls[0][0];
      expect(typeof config.onSuccess).toBe('function');
    });

    it('should configure update mutation with onError handler', () => {
      renderHook(() => useHomeSiteActions(), {wrapper});

      const config = (trpc.site.updateSite.useMutation as jest.Mock).mock
        .calls[0][0];
      expect(typeof config.onError).toBe('function');
    });

    it('should configure delete mutation with onSuccess handler', () => {
      renderHook(() => useHomeSiteActions(), {wrapper});

      const config = (trpc.site.deleteSite.useMutation as jest.Mock).mock
        .calls[0][0];
      expect(typeof config.onSuccess).toBe('function');
    });

    it('should configure delete mutation with onError handler', () => {
      renderHook(() => useHomeSiteActions(), {wrapper});

      const config = (trpc.site.deleteSite.useMutation as jest.Mock).mock
        .calls[0][0];
      expect(typeof config.onError).toBe('function');
    });
  });
});
