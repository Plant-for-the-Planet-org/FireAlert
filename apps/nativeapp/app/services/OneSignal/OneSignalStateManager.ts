/**
 * OneSignalStateManager
 * Manages OneSignal device state and lifecycle
 */

import {AppState, type AppStateStatus, Platform} from 'react-native';
import {OneSignal} from 'react-native-onesignal';
import {DeviceState, StateChangeEvent, StateChangeListener} from './types';

enum InitializationState {
  NOT_STARTED = 'not_started',
  INITIALIZING = 'initializing',
  READY = 'ready',
  FAILED = 'failed',
}

interface InitializationStatus {
  state: InitializationState;
  error?: Error;
  startTime?: number;
  completionTime?: number;
}

type PermissionChangeEvent = boolean | {permission?: boolean};
type OneSignalUserChangeEvent = {current?: {externalId?: string | null}};

const ANDROID_PERMISSION_PROPAGATION_RETRY_DELAYS_MS = [
  1000, 2500, 4500,
] as const;

export class OneSignalStateManager {
  private state: DeviceState;
  private listeners: Set<StateChangeListener>;
  private initializationPromise: Promise<void> | null;
  private listenersRegistered = false;
  private appStateSubscription: ReturnType<
    typeof AppState.addEventListener
  > | null = null;
  private androidPermissionSyncPromise: Promise<void> | null = null;
  private androidPermissionRetryTimers: ReturnType<typeof setTimeout>[] = [];
  private androidPermissionRetryRunId = 0;
  private androidPermissionPropagationActive = false;
  private androidPermissionPropagationAttemptInFlight = false;
  private currentExternalUserId: string | null = null;
  private initializationStatus: InitializationStatus = {
    state: InitializationState.NOT_STARTED,
  };

  constructor() {
    this.state = {
      userId: null,
      pushToken: null,
      externalId: null,
      optedIn: false,
      permission: false,
      isInitialized: false,
      lastUpdated: 0,
    };
    this.listeners = new Set();
    this.initializationPromise = null;
  }

  /**
   * Initialize OneSignal and retrieve device state
   */
  async initialize(appId: string, userId: string): Promise<void> {
    if (this.isInitializing() && this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.state.isInitialized) {
      return;
    }

    this.initializationStatus.state = InitializationState.INITIALIZING;
    this.initializationPromise = this._performInitialization(appId, userId);

    try {
      await this.initializationPromise;
      if (this.initializationStatus.state !== InitializationState.READY) {
        throw (
          this.initializationStatus.error ??
          new Error('OneSignal initialization failed')
        );
      }
    } finally {
      this.initializationPromise = null;
    }
  }

  private async _performInitialization(
    appId: string,
    userId: string,
  ): Promise<void> {
    try {
      this.initializationStatus = {
        state: InitializationState.INITIALIZING,
        startTime: Date.now(),
      };
      this.currentExternalUserId = userId;

      OneSignal.initialize(appId);
      OneSignal.login(userId);
      this.registerEventListeners();

      // Decide whether to prompt. Skip the prompt if the user has already
      // answered (granted or denied) — Android 13+ won't re-prompt after a
      // denial anyway, and re-prompting on every launch is bad UX.
      const currentPermission =
        await OneSignal.Notifications.getPermissionAsync();

      if (!currentPermission) {
        // fallbackToSettings = true so users who previously denied can be
        // sent to system Settings via the SDK to re-enable.
        const granted = await OneSignal.Notifications.requestPermission(true);
        if (granted) {
          await this.ensurePushSubscriptionAfterGrant(userId);
        }
      } else {
        // OS permission already granted — make sure subscription is opted in.
        OneSignal.User.pushSubscription.optIn();

        if (Platform.OS === 'android') {
          await this.ensureAndroidPermissionSync(userId);
        }
      }

      await this.updateDeviceState();

      if (
        Platform.OS === 'android' &&
        this.state.permission &&
        !this.hasFullyActivatedAndroidSubscription(userId)
      ) {
        this.startAndroidPermissionPropagation(userId);
      }

      this.setState({isInitialized: true});

      this.initializationStatus = {
        state: InitializationState.READY,
        startTime: this.initializationStatus.startTime,
        completionTime: Date.now(),
      };
    } catch (error) {
      this.initializationStatus = {
        state: InitializationState.FAILED,
        error: error as Error,
        startTime: this.initializationStatus.startTime,
        completionTime: Date.now(),
      };
    }
  }

  /**
   * Handles OS-level permission changes (grants from settings, runtime
   * prompt outcome, etc). On grant we explicitly opt the user in so the
   * OneSignal subscription transitions from "Never Subscribed" to
   * subscribed. Dispatches `permission_changed` so consumers (e.g. the
   * device sync hook) can re-sync the server-side alertMethod record.
   *
   * Bound as an arrow-property so `this` is preserved when used as a
   * listener callback.
   */
  private handlePermissionChange = async (
    event: PermissionChangeEvent,
  ): Promise<void> => {
    const granted = this.normalizePermissionChange(event);
    const previousState = {...this.state};

    if (granted) {
      await this.ensurePushSubscriptionAfterGrant(this.currentExternalUserId);
    } else if (Platform.OS === 'android') {
      this.stopAndroidPermissionPropagation();
    }

    await this.updateDeviceState();

    this.emitStateChange('permission_changed', previousState);
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

  isInitializing(): boolean {
    return this.initializationStatus.state === InitializationState.INITIALIZING;
  }

  getInitializationStatus(): InitializationStatus {
    return {...this.initializationStatus};
  }

  private isSdkCallAllowed(): boolean {
    return (
      this.initializationStatus.state === InitializationState.INITIALIZING ||
      this.initializationStatus.state === InitializationState.READY
    );
  }

  private async safeOneSignalCall<T>(
    operation: () => Promise<T>,
    _operationName: string,
  ): Promise<T | null> {
    if (!this.isSdkCallAllowed()) {
      return null;
    }

    try {
      return await operation();
    } catch (_error) {
      return null;
    }
  }

  private async ensurePushSubscriptionAfterGrant(
    userId: string | null,
  ): Promise<void> {
    // On Android, the runtime permission grant can complete before OneSignal
    // has fully attached the refreshed push subscription to the logged-in
    // user. Replaying the settled state here prevents the "works only after
    // reopening the app" symptom without affecting iOS behavior.
    OneSignal.User.pushSubscription.optIn();

    if (Platform.OS !== 'android' || !userId) {
      return;
    }

    this.startAndroidPermissionPropagation(userId);
    await this.ensureAndroidPermissionSync(userId);
  }

  private registerEventListeners(): void {
    if (this.listenersRegistered) {
      return;
    }

    // Register listeners BEFORE asking for permission so the grant event is
    // never missed.
    OneSignal.Notifications.addEventListener(
      'permissionChange',
      this.handlePermissionChange,
    );

    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );
    OneSignal.User.addEventListener('change', this.handleUserStateChange);

    OneSignal.User.pushSubscription.addEventListener(
      'change',
      async _subscription => {
        const previousState = {...this.state};
        await this.updateDeviceState();
        this.emitStateChange('subscription_changed', previousState);
      },
    );

    this.listenersRegistered = true;
  }

  private handleUserStateChange = async (
    event: OneSignalUserChangeEvent,
  ): Promise<void> => {
    if (
      Platform.OS !== 'android' ||
      !this.androidPermissionPropagationActive ||
      !this.currentExternalUserId ||
      event?.current?.externalId !== this.currentExternalUserId
    ) {
      return;
    }

    await this.ensureAndroidPermissionSync(this.currentExternalUserId);
  };

  private handleAppStateChange = async (
    appState: AppStateStatus,
  ): Promise<void> => {
    if (
      Platform.OS !== 'android' ||
      appState !== 'active' ||
      !this.androidPermissionPropagationActive ||
      !this.currentExternalUserId
    ) {
      return;
    }

    await this.ensureAndroidPermissionSync(this.currentExternalUserId);
  };

  private normalizePermissionChange(event: PermissionChangeEvent): boolean {
    if (typeof event === 'boolean') {
      return event;
    }

    return event?.permission === true;
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

  private async ensureAndroidPermissionSync(userId: string): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    if (this.androidPermissionSyncPromise) {
      return this.androidPermissionSyncPromise;
    }

    this.androidPermissionSyncPromise =
      this.runAndroidPermissionPropagationAttempt(userId);

    try {
      await this.androidPermissionSyncPromise;
    } finally {
      this.androidPermissionSyncPromise = null;
    }
  }

  private startAndroidPermissionPropagation(userId: string): void {
    if (Platform.OS !== 'android') {
      return;
    }

    this.clearAndroidPermissionPropagationRetries();
    this.androidPermissionRetryRunId += 1;
    this.androidPermissionPropagationActive = true;
    const runId = this.androidPermissionRetryRunId;
    const stopDelayMs =
      ANDROID_PERMISSION_PROPAGATION_RETRY_DELAYS_MS[
        ANDROID_PERMISSION_PROPAGATION_RETRY_DELAYS_MS.length - 1
      ] + 1500;

    ANDROID_PERMISSION_PROPAGATION_RETRY_DELAYS_MS.forEach(delayMs => {
      const timer = setTimeout(() => {
        if (
          runId !== this.androidPermissionRetryRunId ||
          this.currentExternalUserId !== userId
        ) {
          return;
        }

        this.ensureAndroidPermissionSync(userId).catch(() => {
          // Graceful error handling
        });
      }, delayMs);

      this.androidPermissionRetryTimers.push(timer);
    });

    const stopTimer = setTimeout(() => {
      if (runId === this.androidPermissionRetryRunId) {
        this.stopAndroidPermissionPropagation();
      }
    }, stopDelayMs);

    this.androidPermissionRetryTimers.push(stopTimer);
  }

  private clearAndroidPermissionPropagationRetries(): void {
    this.androidPermissionRetryTimers.forEach(timer => clearTimeout(timer));
    this.androidPermissionRetryTimers = [];
  }

  private stopAndroidPermissionPropagation(): void {
    this.clearAndroidPermissionPropagationRetries();
    this.androidPermissionPropagationActive = false;
    this.androidPermissionRetryRunId += 1;
  }

  private async runAndroidPermissionPropagationAttempt(
    userId: string,
  ): Promise<void> {
    if (
      Platform.OS !== 'android' ||
      this.androidPermissionPropagationAttemptInFlight
    ) {
      return;
    }

    const hasPermission = await this.safeOneSignalCall(
      () => OneSignal.Notifications.getPermissionAsync(),
      'getPermissionAsync',
    );
    if (!hasPermission || this.currentExternalUserId !== userId) {
      return;
    }

    this.androidPermissionPropagationAttemptInFlight = true;

    try {
      // Replaying the same-session startup sequence is intentionally hacky
      // but bounded. Reopen fixes the device because initialize/login runs
      // again after Android permission is already granted. These nudges
      // emulate that cold-start reconciliation inside the same session.
      OneSignal.login(userId);
      await this.sleep(300);
      OneSignal.User.pushSubscription.optIn();
      await this.sleep(300);
      OneSignal.login(userId);
      await this.sleep(300);
      await this.updateDeviceState();
    } finally {
      this.androidPermissionPropagationAttemptInFlight = false;
    }

  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private hasFullyActivatedAndroidSubscription(userId: string): boolean {
    return (
      this.state.permission &&
      this.state.externalId === userId &&
      this.state.optedIn &&
      !!this.state.pushToken &&
      !!this.state.userId
    );
  }

  async handleLogin(userId: string): Promise<void> {
    try {
      this.currentExternalUserId = userId;
      this.setState({
        userId: null,
        pushToken: null,
        externalId: null,
        optedIn: false,
        permission: false,
        isInitialized: true,
        lastUpdated: 0,
      });

      OneSignal.login(userId);
      await this.updateDeviceState();
    } catch (_error) {
      // Graceful error handling
    }
  }

  async handleLogout(): Promise<void> {
    try {
      this.currentExternalUserId = null;
      this.stopAndroidPermissionPropagation();
      this.appStateSubscription?.remove();
      this.appStateSubscription = null;
      this.listenersRegistered = false;
      this.initializationStatus = {state: InitializationState.NOT_STARTED};
      this.setState({
        userId: null,
        pushToken: null,
        externalId: null,
        optedIn: false,
        permission: false,
        isInitialized: false,
        lastUpdated: 0,
      });
    } catch (_error) {
      // Graceful error handling
    }
  }

  async checkPermissions(): Promise<void> {
    if (!this.isInitialized()) {
      return;
    }

    try {
      const previousPermission = this.state.permission;
      const permission = await OneSignal.Notifications.getPermissionAsync();

      if (permission !== previousPermission) {
        this.setState({permission});

        if (
          permission &&
          Platform.OS === 'android' &&
          this.currentExternalUserId
        ) {
          await this.ensurePushSubscriptionAfterGrant(
            this.currentExternalUserId,
          );
        } else if (!permission && Platform.OS === 'android') {
          this.stopAndroidPermissionPropagation();
        }
      }
    } catch (_error) {
      // Graceful error handling
    }
  }

  async updateDeviceState(): Promise<void> {
    try {
      const userId = await this.safeOneSignalCall(
        () => OneSignal.User.pushSubscription.getIdAsync(),
        'getIdAsync',
      );
      const pushToken = await this.safeOneSignalCall(
        () => OneSignal.User.pushSubscription.getTokenAsync(),
        'getTokenAsync',
      );
      const externalId = await this.safeOneSignalCall(
        () => OneSignal.User.getExternalId(),
        'getExternalId',
      );
      const optedIn = await this.safeOneSignalCall(
        () => OneSignal.User.pushSubscription.getOptedInAsync(),
        'getOptedInAsync',
      );
      const permission = await this.safeOneSignalCall(
        () => OneSignal.Notifications.getPermissionAsync(),
        'getPermissionAsync',
      );

      const newState: Partial<DeviceState> = {
        userId: userId || null,
        pushToken: pushToken || null,
        externalId: externalId || null,
        optedIn: optedIn || false,
        permission: permission || false,
        lastUpdated: Date.now(),
      };

      this.setState(newState);
    } catch (_error) {
      // Graceful error handling
    }
  }

  private setState(newState: Partial<DeviceState>): void {
    const previousState = {...this.state};
    this.state = {...this.state, ...newState};

    const event: StateChangeEvent = {
      type: 'state_updated',
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
}

let instance: OneSignalStateManager | null = null;

export function getOneSignalStateManager(): OneSignalStateManager {
  if (!instance) {
    instance = new OneSignalStateManager();
  }
  return instance;
}

export function resetOneSignalStateManager(): void {
  instance = null;
}
