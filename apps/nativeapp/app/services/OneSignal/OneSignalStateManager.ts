/**
 * OneSignalStateManager
 * Manages OneSignal device state and lifecycle
 */

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

export class OneSignalStateManager {
  private state: DeviceState;
  private listeners: Set<StateChangeListener>;
  private initializationPromise: Promise<void> | null;
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
    } finally {
      this.initializationStatus.state = InitializationState.NOT_STARTED;
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

      OneSignal.initialize(appId);
      OneSignal.Notifications.requestPermission(false);
      OneSignal.login(userId);

      OneSignal.User.pushSubscription.addEventListener(
        'change',
        async _subscription => {
          await this.updateDeviceState();

          const event = {
            type: 'subscription_changed' as const,
            previousState: {...this.state},
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
        },
      );

      await this.updateDeviceState();

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

  async handleLogin(userId: string): Promise<void> {
    try {
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
