/**
 * PushNotificationStateManager
 * Manages FCM token + OS notification permission state and lifecycle.
 */

import {AppState, type AppStateStatus, Platform} from 'react-native';
import notifee, {
  AndroidImportance,
  AuthorizationStatus,
} from '@notifee/react-native';
import {
  getMessaging,
  getToken,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  isDeviceRegisteredForRemoteMessages,
} from '@react-native-firebase/messaging';
import {DeviceState, StateChangeEvent, StateChangeListener} from './types';

/** Must match FCM_ANDROID_CHANNEL_ID on the server and firebase.json. */
export const ANDROID_CHANNEL_ID = 'firealert-alerts';

enum InitializationState {
  NOT_STARTED = 'not_started',
  INITIALIZING = 'initializing',
  READY = 'ready',
  FAILED = 'failed',
}

interface InitializationStatus {
  state: InitializationState;
  error?: Error;
}

const INITIAL_STATE: DeviceState = {
  token: null,
  permission: false,
  isInitialized: false,
  lastUpdated: 0,
};

function isPermissionGranted(status: AuthorizationStatus): boolean {
  return (
    status === AuthorizationStatus.AUTHORIZED ||
    status === AuthorizationStatus.PROVISIONAL
  );
}

export class PushNotificationStateManager {
  private state: DeviceState = {...INITIAL_STATE};
  private listeners = new Set<StateChangeListener>();
  private initializationPromise: Promise<void> | null = null;
  private initializationStatus: InitializationStatus = {
    state: InitializationState.NOT_STARTED,
  };
  private tokenRefreshUnsubscribe: (() => void) | null = null;
  private appStateSubscription: ReturnType<
    typeof AppState.addEventListener
  > | null = null;

  /**
   * Create the Android channel, ask for permission (once per launch, only
   * when not granted), fetch the FCM token and start listening for changes.
   */
  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    if (this.isInitialized()) {
      return;
    }

    this.initializationStatus = {state: InitializationState.INITIALIZING};
    this.initializationPromise = this.performInitialization();

    try {
      await this.initializationPromise;
      if (this.initializationStatus.state !== InitializationState.READY) {
        throw (
          this.initializationStatus.error ??
          new Error('Push notification initialization failed')
        );
      }
    } finally {
      this.initializationPromise = null;
    }
  }

  private async performInitialization(): Promise<void> {
    try {
      await ensureAndroidChannel();

      const settings = await notifee.getNotificationSettings();
      let permission = isPermissionGranted(settings.authorizationStatus);
      if (!permission) {
        // iOS and Android 13+ only prompt once; later calls return the
        // stored answer without UI.
        const requested = await notifee.requestPermission();
        permission = isPermissionGranted(requested.authorizationStatus);
      }

      const messaging = getMessaging();
      if (
        Platform.OS === 'ios' &&
        !isDeviceRegisteredForRemoteMessages(messaging)
      ) {
        await registerDeviceForRemoteMessages(messaging);
      }
      const token = await getToken(messaging);

      this.registerEventListeners();
      this.setState({
        token: token || null,
        permission,
        isInitialized: true,
        lastUpdated: Date.now(),
      });

      this.initializationStatus = {state: InitializationState.READY};
    } catch (error) {
      this.initializationStatus = {
        state: InitializationState.FAILED,
        error: error as Error,
      };
    }
  }

  private registerEventListeners(): void {
    if (!this.tokenRefreshUnsubscribe) {
      this.tokenRefreshUnsubscribe = onTokenRefresh(getMessaging(), token => {
        const previousState = {...this.state};
        this.setState({token, lastUpdated: Date.now()});
        this.emitStateChange('token_changed', previousState);
      });
    }

    if (!this.appStateSubscription) {
      this.appStateSubscription = AppState.addEventListener(
        'change',
        this.handleAppStateChange,
      );
    }
  }

  // Returning from system Settings is the usual way permission changes.
  private handleAppStateChange = async (
    appState: AppStateStatus,
  ): Promise<void> => {
    if (appState === 'active') {
      await this.checkPermissions();
    }
  };

  getState(): DeviceState {
    return {...this.state};
  }

  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  isInitialized(): boolean {
    return this.initializationStatus.state === InitializationState.READY;
  }

  /** @deprecated Unused. Remove when the legacy OneSignal notification system is fully removed. */
  isInitializing(): boolean {
    return this.initializationStatus.state === InitializationState.INITIALIZING;
  }

  /** Re-read OS permission and emit `permission_changed` when it differs. */
  async checkPermissions(): Promise<void> {
    if (!this.isInitialized()) {
      return;
    }

    try {
      const settings = await notifee.getNotificationSettings();
      const permission = isPermissionGranted(settings.authorizationStatus);
      if (permission === this.state.permission) {
        return;
      }

      const previousState = {...this.state};
      this.setState({permission, lastUpdated: Date.now()});
      this.emitStateChange('permission_changed', previousState);
    } catch (_error) {
      // Graceful error handling
    }
  }

  /** @deprecated Unused. Remove when the legacy OneSignal notification system is fully removed. */
  async handleLogout(): Promise<void> {
    this.tokenRefreshUnsubscribe?.();
    this.tokenRefreshUnsubscribe = null;
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    this.initializationStatus = {state: InitializationState.NOT_STARTED};
    this.setState({...INITIAL_STATE});
  }

  private emitStateChange(
    type: StateChangeEvent['type'],
    previousState: DeviceState,
  ): void {
    const event: StateChangeEvent = {
      type,
      previousState,
      currentState: {...this.state},
      timestamp: Date.now(),
    };

    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (_error) {
        // Error in listener handled silently
      }
    });
  }

  private setState(newState: Partial<DeviceState>): void {
    const previousState = {...this.state};
    this.state = {...this.state, ...newState};
    this.emitStateChange('state_updated', previousState);
  }
}

/** Android needs the channel before the first push arrives. Safe to repeat. */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await notifee.createChannel({
    id: ANDROID_CHANNEL_ID,
    name: 'Fire alerts',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
}

let instance: PushNotificationStateManager | null = null;

export function getPushNotificationStateManager(): PushNotificationStateManager {
  if (!instance) {
    instance = new PushNotificationStateManager();
  }
  return instance;
}

/** @deprecated Unused. Remove when the legacy OneSignal notification system is fully removed. */
export function resetPushNotificationStateManager(): void {
  instance = null;
}
