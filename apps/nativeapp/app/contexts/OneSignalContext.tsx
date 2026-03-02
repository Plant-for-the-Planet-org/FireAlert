/**
 * OneSignal React surface: OneSignalProvider (init + state) and useOneSignal (consumer).
 * Single subscription to state manager; state distributed via context.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  NotificationClickEvent,
  NotificationWillDisplayEvent,
  OneSignal,
} from 'react-native-onesignal';

import {useAppSelector} from '../hooks/redux/reduxHooks';
import type {RootState} from '../redux/store';
import {
  getOneSignalStateManager,
  type DeviceState,
  type NotificationHandlers,
  type StateChangeEvent,
} from '../services/OneSignal';
import {useDeviceAlertMethodSync} from '../hooks/notification/useDeviceAlertMethodSync';

export interface OneSignalContextValue {
  state: DeviceState | null;
  isInitialized: boolean;
  error: Error | null;
}

const defaultValue: OneSignalContextValue = {
  state: null,
  isInitialized: false,
  error: null,
};

export const OneSignalContext =
  createContext<OneSignalContextValue>(defaultValue);

export interface OneSignalProviderProps {
  appId: string;
  handlers?: NotificationHandlers;
  children: React.ReactNode;
}

export function OneSignalProvider({
  appId,
  handlers,
  children,
}: OneSignalProviderProps) {
  const {userDetails} = useAppSelector((state: RootState) => state.loginSlice);
  const [deviceState, setDeviceState] = useState<DeviceState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const stateManager = getOneSignalStateManager();
  const handlersRef = useRef<NotificationHandlers | undefined>(handlers);
  const initializationRef = useRef<{
    appId: string | null;
    userId: string | null;
    isInitializing: boolean;
    syncCompleted: boolean;
  }>({
    appId: null,
    userId: null,
    isInitializing: false,
    syncCompleted: false,
  });

  const {performDeviceSync} = useDeviceAlertMethodSync({
    onSyncCompleted: () => {
      initializationRef.current.syncCompleted = true;
    },
  });

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const performSync = useCallback(
    async (syncState: DeviceState, currentUserId: string) => {
      if (initializationRef.current.syncCompleted) {
        return;
      }
      await performDeviceSync(syncState, currentUserId);
    },
    [performDeviceSync],
  );

  useEffect(() => {
    const currentAppId = appId;
    const currentUserId = userDetails?.data?.id;

    if (!currentUserId || !currentAppId) {
      return;
    }

    if (
      initializationRef.current.appId === currentAppId &&
      initializationRef.current.userId === currentUserId &&
      !initializationRef.current.isInitializing
    ) {
      return;
    }

    if (initializationRef.current.isInitializing) {
      return;
    }

    const initializeOneSignal = async () => {
      try {
        initializationRef.current.isInitializing = true;
        initializationRef.current.syncCompleted = false;

        await stateManager.initialize(currentAppId, currentUserId);

        const state = stateManager.getState();
        setDeviceState(state);
        setIsInitialized(true);
        setError(null);

        const unsubscribe = stateManager.subscribe(
          (event: StateChangeEvent) => {
            setDeviceState(event.currentState);

            if (event.type === 'permission_changed') {
              performSync(event.currentState, currentUserId);
            }

            if (event.type === 'subscription_changed') {
              initializationRef.current.syncCompleted = false;
              performSync(event.currentState, currentUserId);
            }
          },
        );

        const receivedHandler = (event: NotificationWillDisplayEvent) => {
          const notification = event.getNotification();
          event.notification.display();

          if (handlersRef.current?.onReceived) {
            handlersRef.current.onReceived(notification);
          }
        };

        const openedHandler = (event: NotificationClickEvent) => {
          if (handlersRef.current?.onOpened) {
            handlersRef.current.onOpened(event);
          }
        };

        OneSignal.Notifications.addEventListener(
          'foregroundWillDisplay',
          receivedHandler,
        );
        OneSignal.Notifications.addEventListener('click', openedHandler);

        await performSync(state, currentUserId);

        initializationRef.current.appId = currentAppId;
        initializationRef.current.userId = currentUserId;
        initializationRef.current.isInitializing = false;

        return () => {
          unsubscribe();
          OneSignal.Notifications.removeEventListener(
            'foregroundWillDisplay',
            receivedHandler,
          );
          OneSignal.Notifications.removeEventListener('click', openedHandler);
        };
      } catch (err) {
        const initError = err instanceof Error ? err : new Error(String(err));
        setError(initError);
        setIsInitialized(false);
        initializationRef.current.isInitializing = false;
      }
    };

    const cleanup = initializeOneSignal();
    return () => {
      cleanup?.then(fn => fn?.());
    };
  }, [appId, userDetails?.data?.id, stateManager, performSync]);

  useEffect(() => {
    const checkPermissions = async () => {
      if (stateManager.isInitialized()) {
        try {
          await stateManager.checkPermissions();
        } catch (_err) {
          // Error handled silently
        }
      }
    };

    const interval = setInterval(checkPermissions, 5000);
    return () => clearInterval(interval);
  }, [stateManager]);

  useEffect(() => {
    if (
      isInitialized &&
      deviceState &&
      !initializationRef.current.syncCompleted
    ) {
      performSync(deviceState, userDetails?.data?.id ?? '');
    }
  }, [isInitialized, deviceState, userDetails?.data?.id, performSync]);

  const value: OneSignalContextValue = {
    state: deviceState,
    isInitialized,
    error,
  };

  return (
    <OneSignalContext.Provider value={value}>
      {children}
    </OneSignalContext.Provider>
  );
}

export function useOneSignal(): OneSignalContextValue {
  return useContext(OneSignalContext);
}
