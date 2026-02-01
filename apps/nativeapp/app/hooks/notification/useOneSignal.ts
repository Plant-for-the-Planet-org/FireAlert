import {useEffect, useState, useRef, useCallback} from 'react';
import {
  NotificationClickEvent,
  NotificationWillDisplayEvent,
  OneSignal,
} from 'react-native-onesignal';

import {trpc} from '../../services/trpc';
import {useAppSelector} from '../redux/reduxHooks';
import {
  getOneSignalStateManager,
  DeviceState,
  StateChangeEvent,
  NotificationHandlers,
} from '../../services/OneSignal';
import {ONESIGNAL_LOG_PREFIXES} from '../../utils/OneSignal/constants';
import {getDeviceInfo} from '../../utils/deviceInfo';

const useOneSignal = (appId: string, handlers?: NotificationHandlers) => {
  const {userDetails} = useAppSelector(state => state.loginSlice);
  const [deviceState, setDeviceState] = useState<DeviceState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const stateManager = getOneSignalStateManager();

  // Use refs to store handlers and prevent re-initialization when they change
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

  // tRPC hooks for alert method operations
  const {refetch: refetchAlertMethods} =
    trpc.alertMethod.getAlertMethods.useQuery(undefined, {
      enabled: false, // We'll trigger this manually
      retry: 2,
    });

  const createAlertMethod = trpc.alertMethod.createAlertMethod.useMutation({
    retry: 3,
    onSuccess: (data: any) => {
      console.log(
        `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Device alert method created:`,
        data?.data?.id,
      );
      initializationRef.current.syncCompleted = true;
    },
    onError: (error: any) => {
      console.error(
        `${ONESIGNAL_LOG_PREFIXES.ERROR} Failed to create device alert method:`,
        error,
      );
    },
  });

  const updateAlertMethod = trpc.alertMethod.updateAlertMethod.useMutation({
    retry: 3,
    onSuccess: (data: any) => {
      console.log(
        `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Device alert method updated:`,
        data?.data?.id,
      );
      initializationRef.current.syncCompleted = true;
    },
    onError: (syncError: any) => {
      console.error(
        `${ONESIGNAL_LOG_PREFIXES.ERROR} Failed to update device alert method:`,
        syncError,
      );
    },
  });

  // Update handlers ref when handlers change without triggering re-initialization
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Stable sync function that uses tRPC hooks
  const performSync = useCallback(
    async (syncState: DeviceState, _userId: string) => {
      if (initializationRef.current.syncCompleted) {
        console.log(
          `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Sync already completed, skipping`,
        );
        return;
      }

      if (!syncState.userId) {
        console.warn(
          `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} No OneSignal userId available, skipping sync`,
        );
        return;
      }

      try {
        console.log(
          `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Syncing device subscription`,
        );

        const {deviceId, deviceName} = await getDeviceInfo();

        // Fetch current alert methods
        const {data: currentAlertMethods} = await refetchAlertMethods();

        if (!currentAlertMethods?.data) {
          console.log(
            `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} No alert methods found, creating new device alert method`,
          );

          // Create new device alert method - pass object directly without json wrapper
          createAlertMethod.mutate(
            {
              deviceId,
              deviceName,
              method: 'device',
              destination: syncState.userId,
            },
            {
              onSuccess: () => {
                console.log(
                  `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Device alert method created successfully`,
                );
                initializationRef.current.syncCompleted = true;
              },
              onError: (error: any) => {
                console.error(
                  `${ONESIGNAL_LOG_PREFIXES.ERROR} Failed to create device alert method:`,
                  error,
                );
              },
            },
          );
          return;
        }

        // Check if device alert method exists
        const deviceAlertMethods = currentAlertMethods.data.filter(
          (method: any) =>
            method.method === 'device' && method.deviceId === deviceId,
        );

        if (deviceAlertMethods.length > 0) {
          const existingMethod = deviceAlertMethods[0];
          console.log(
            `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Found existing alert method:`,
            existingMethod.id,
          );

          // Check if state has changed
          if (existingMethod.destination !== syncState.userId) {
            console.log(
              `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Device state changed, updating alert method`,
            );
            // Update alert method - pass params and body directly without json wrapper
            updateAlertMethod.mutate(
              {
                params: {alertMethodId: existingMethod.id},
                body: {isEnabled: true},
              },
              {
                onSuccess: () => {
                  console.log(
                    `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Device alert method updated successfully`,
                  );
                  initializationRef.current.syncCompleted = true;
                },
                onError: (error: any) => {
                  console.error(
                    `${ONESIGNAL_LOG_PREFIXES.ERROR} Failed to update device alert method:`,
                    error,
                  );
                },
              },
            );
          } else {
            console.log(
              `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Alert method is up to date`,
            );
            initializationRef.current.syncCompleted = true;
          }
        } else {
          console.log(
            `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} No device alert method found, creating new one`,
          );

          // Create new device alert method - pass object directly without json wrapper
          createAlertMethod.mutate(
            {
              deviceId,
              deviceName,
              method: 'device',
              destination: syncState.userId,
            },
            {
              onSuccess: () => {
                console.log(
                  `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Device alert method created successfully`,
                );
                initializationRef.current.syncCompleted = true;
              },
              onError: (error: any) => {
                console.error(
                  `${ONESIGNAL_LOG_PREFIXES.ERROR} Failed to create device alert method:`,
                  error,
                );
              },
            },
          );
        }
      } catch (syncErr) {
        const syncError =
          syncErr instanceof Error ? syncErr : new Error(String(syncErr));
        console.error(
          `${ONESIGNAL_LOG_PREFIXES.ERROR} Device sync failed:`,
          syncError,
        );
      }
    },
    [refetchAlertMethods, createAlertMethod, updateAlertMethod],
  );

  // Initialize OneSignal only when appId or userId changes
  useEffect(() => {
    const currentAppId = appId;
    const currentUserId = userDetails?.data?.id;

    // Skip if missing required data
    if (!currentUserId || !currentAppId) {
      console.log(
        `${ONESIGNAL_LOG_PREFIXES.ONESIGNAL} Skipping initialization: missing userId or appId`,
      );
      return;
    }

    // Skip if already initialized with same appId and userId
    if (
      initializationRef.current.appId === currentAppId &&
      initializationRef.current.userId === currentUserId &&
      !initializationRef.current.isInitializing
    ) {
      console.log(
        `${ONESIGNAL_LOG_PREFIXES.ONESIGNAL} Already initialized with same appId and userId, skipping`,
      );
      return;
    }

    // Skip if currently initializing
    if (initializationRef.current.isInitializing) {
      console.log(
        `${ONESIGNAL_LOG_PREFIXES.ONESIGNAL} Initialization already in progress, skipping`,
      );
      return;
    }

    const initializeOneSignal = async () => {
      try {
        initializationRef.current.isInitializing = true;
        initializationRef.current.syncCompleted = false;

        console.log(
          `${ONESIGNAL_LOG_PREFIXES.ONESIGNAL} useOneSignal hook initializing`,
        );

        // Initialize state manager
        await stateManager.initialize(currentAppId, currentUserId);

        // Get initial state
        const state = stateManager.getState();
        setDeviceState(state);
        setIsInitialized(true);
        setError(null);

        // Subscribe to state changes
        const unsubscribe = stateManager.subscribe(
          (event: StateChangeEvent) => {
            console.log(
              `${ONESIGNAL_LOG_PREFIXES.ONESIGNAL} State change event:`,
              event.type,
            );
            setDeviceState(event.currentState);

            // Only sync on permission changes, not on regular state updates
            if (event.type === 'permission_changed') {
              performSync(event.currentState, currentUserId);
            }
          },
        );

        // Set up notification event listeners with current handlers
        const receivedHandler = (event: NotificationWillDisplayEvent) => {
          console.log(
            `${ONESIGNAL_LOG_PREFIXES.ONESIGNAL} Notification received in foreground`,
          );
          const notification = event.getNotification();
          event.notification.display();

          if (handlersRef.current?.onReceived) {
            handlersRef.current.onReceived(notification);
          }
        };

        const openedHandler = (event: NotificationClickEvent) => {
          console.log(
            `${ONESIGNAL_LOG_PREFIXES.ONESIGNAL} Notification opened`,
          );
          if (handlersRef.current?.onOpened) {
            handlersRef.current.onOpened(event);
          }
        };

        OneSignal.Notifications.addEventListener(
          'foregroundWillDisplay',
          receivedHandler,
        );
        OneSignal.Notifications.addEventListener('click', openedHandler);

        // Perform initial sync
        await performSync(state, currentUserId);

        // Update initialization tracking
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
        console.error(
          `${ONESIGNAL_LOG_PREFIXES.ERROR} Failed to initialize OneSignal:`,
          initError,
        );
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

  // Check permissions on app foreground - only if initialized
  useEffect(() => {
    const checkPermissions = async () => {
      if (stateManager.isInitialized()) {
        try {
          await stateManager.checkPermissions();
        } catch (err) {
          console.error(
            `${ONESIGNAL_LOG_PREFIXES.ERROR} Failed to check permissions:`,
            err,
          );
        }
      }
    };

    const interval = setInterval(checkPermissions, 5000);
    return () => clearInterval(interval);
  }, [stateManager]);

  // Perform device sync after initialization completes
  useEffect(() => {
    if (
      isInitialized &&
      deviceState &&
      !initializationRef.current.syncCompleted
    ) {
      console.log(
        `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Triggering device sync after initialization`,
      );
      performSync(deviceState, userDetails?.data?.id || '');
    }
  }, [isInitialized, deviceState, userDetails?.data?.id, performSync]);

  return {
    state: deviceState,
    isInitialized,
    error,
  };
};

export default useOneSignal;
