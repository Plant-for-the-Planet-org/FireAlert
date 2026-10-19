/**
 * Push notification (FCM) React surface: PushNotificationProvider (init + state)
 * and usePushNotification (consumer).
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
import notifee, {EventType} from '@notifee/react-native';
import {
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';

import {useAppSelector} from '../hooks/redux/reduxHooks';
import type {RootState} from '../redux/store';
import {
  ANDROID_CHANNEL_ID,
  ensureAndroidChannel,
  getPushNotificationStateManager,
  type DeviceState,
  type NotificationHandlers,
  type NotificationOpenPayload,
  type StateChangeEvent,
} from '../services/PushNotification';
import {useDeviceAlertMethodSync} from '../hooks/notification/useDeviceAlertMethodSync';

export interface PushNotificationContextValue {
  state: DeviceState | null;
  isInitialized: boolean;
  error: Error | null;
}

const defaultValue: PushNotificationContextValue = {
  state: null,
  isInitialized: false,
  error: null,
};

export const PushNotificationContext =
  createContext<PushNotificationContextValue>(defaultValue);

export interface PushNotificationProviderProps {
  handlers?: NotificationHandlers;
  children: React.ReactNode;
}

const toOpenPayload = (
  data: Record<string, unknown> | undefined | null,
): NotificationOpenPayload => ({
  url: typeof data?.url === 'string' ? (data.url as string) : null,
  data: data ?? null,
});

const remoteMessagePayload = (
  message: FirebaseMessagingTypes.RemoteMessage,
): NotificationOpenPayload =>
  toOpenPayload(message.data as Record<string, unknown> | undefined);

export function PushNotificationProvider({
  handlers,
  children,
}: PushNotificationProviderProps) {
  const {userDetails} = useAppSelector((state: RootState) => state.loginSlice);
  const [deviceState, setDeviceState] = useState<DeviceState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const stateManager = getPushNotificationStateManager();
  const handlersRef = useRef<NotificationHandlers | undefined>(handlers);
  const initializationRef = useRef<{
    userId: string | null;
    isInitializing: boolean;
    syncCompleted: boolean;
  }>({
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

  // Register tap + foreground listeners on mount, no auth gate, so cold-start
  // taps are never dropped. handleNotificationOpen queues them until
  // navigation is ready.
  useEffect(() => {
    const messaging = getMessaging();
    const open = (payload: NotificationOpenPayload) => {
      handlersRef.current?.onOpened?.(payload);
    };

    ensureAndroidChannel().catch(() => {
      // Graceful error handling
    });

    // App was killed: FCM notification tap that launched the app.
    getInitialNotification(messaging)
      .then(message => {
        if (message) {
          open(remoteMessagePayload(message));
        }
      })
      .catch(() => {});

    // App was killed: tap on a notification we displayed with Notifee.
    notifee
      .getInitialNotification()
      .then(initial => {
        if (initial) {
          open(toOpenPayload(initial.notification.data));
        }
      })
      .catch(() => {});

    // App in background: FCM notification tap.
    const unsubscribeOpened = onNotificationOpenedApp(messaging, message => {
      open(remoteMessagePayload(message));
    });

    // App in foreground: FCM does not show the notification, so we do.
    const unsubscribeMessage = onMessage(messaging, async message => {
      // Skip data-only messages (e.g. OneSignal payloads reaching this
      // device through an old subscription) so we never show a blank banner.
      if (!message.notification) {
        return;
      }
      await notifee.displayNotification({
        title: message.notification?.title,
        body: message.notification?.body,
        data: message.data as Record<string, string> | undefined,
        android: {
          channelId: ANDROID_CHANNEL_ID,
          pressAction: {id: 'default'},
        },
      });
    });

    // App in foreground: tap on a notification we displayed with Notifee.
    const unsubscribeNotifee = notifee.onForegroundEvent(({type, detail}) => {
      if (type === EventType.PRESS) {
        open(toOpenPayload(detail.notification?.data));
      }
    });

    return () => {
      unsubscribeOpened();
      unsubscribeMessage();
      unsubscribeNotifee();
    };
  }, []);

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
    const currentUserId = userDetails?.data?.id;

    if (!currentUserId) {
      return;
    }

    if (
      initializationRef.current.userId === currentUserId ||
      initializationRef.current.isInitializing
    ) {
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const initializePush = async () => {
      try {
        initializationRef.current.isInitializing = true;
        initializationRef.current.syncCompleted = false;

        await stateManager.initialize();

        const state = stateManager.getState();
        setDeviceState(state);
        setIsInitialized(true);
        setError(null);

        unsubscribe = stateManager.subscribe((event: StateChangeEvent) => {
          setDeviceState(event.currentState);

          if (
            event.type === 'permission_changed' ||
            event.type === 'token_changed'
          ) {
            initializationRef.current.syncCompleted = false;
            performSync(event.currentState, currentUserId);
          }
        });

        await performSync(state, currentUserId);

        initializationRef.current.userId = currentUserId;
      } catch (err) {
        const initError = err instanceof Error ? err : new Error(String(err));
        setError(initError);
        setIsInitialized(false);
      } finally {
        initializationRef.current.isInitializing = false;
      }
    };

    initializePush();
    return () => {
      unsubscribe?.();
    };
  }, [userDetails?.data?.id, stateManager, performSync]);

  // Fallback for permission changes that do not cause an AppState change.
  useEffect(() => {
    const interval = setInterval(() => {
      stateManager.checkPermissions().catch(() => {});
    }, 5000);
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

  const value: PushNotificationContextValue = {
    state: deviceState,
    isInitialized,
    error,
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotification(): PushNotificationContextValue {
  return useContext(PushNotificationContext);
}
