/**
 * OneSignalStateManager
 * Manages OneSignal device state and lifecycle
 */

import {OneSignal} from 'react-native-onesignal';
import {DeviceState, StateChangeEvent, StateChangeListener} from './types';
import {ONESIGNAL_LOG_PREFIXES} from '../../utils/OneSignal/constants';

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
      console.log(`${ONESIGNAL_LOG_PREFIXES.ONESIGNAL} Already initialized`);
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

      console.log(
        `${ONESIGNAL_LOG_PREFIXES.ONESIGNAL} Initializing with appId: ${appId}, userId: ${userId}`,
      );

      // Initialize OneSignal SDK
      OneSignal.initialize(appId);
      console.log(`${ONESIGNAL_LOG_PREFIXES.ONESIGNAL} SDK initialized`);

      // Request notification permissions
      OneSignal.Notifications.requestPermission(false);
      console.log(`${ONESIGNAL_LOG_PREFIXES.ONESIGNAL} Permission requested`);

      // Login user
      OneSignal.login(userId);
      console.log(
        `${ONESIGNAL_LOG_PREFIXES.ONESIGNAL} User logged in: ${userId}`,
      );

      // Retrieve device state
      await this.updateDeviceState();

      // Mark as initialized
      this.setState({isInitialized: true});

      this.initializationStatus = {
        state: InitializationState.READY,
        startTime: this.initializationStatus.startTime,
        completionTime: Date.now(),
      };

      const duration =
        (this.initializationStatus.completionTime || 0) -
        (this.initializationStatus.startTime || 0);
      console.log(
        `${ONESIGNAL_LOG_PREFIXES.ONESIGNAL} Initialization complete (${duration}ms)`,
      );
    } catch (error) {
      this.initializationStatus = {
        state: InitializationState.FAILED,
        error: error as Error,
        startTime: this.initializationStatus.startTime,
        completionTime: Date.now(),
      };

      const duration =
        (this.initializationStatus.completionTime || 0) -
        (this.initializationStatus.startTime || 0);
      console.error(
        `${ONESIGNAL_LOG_PREFIXES.ERROR} Initialization failed after ${duration}ms:`,
        error,
      );
    }
  }

  /**
   * Get current device state
   */
  getState(): DeviceState {
    return {...this.state};
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Check if OneSignal is initialized and ready
   */
  isInitialized(): boolean {
    return this.initializationStatus.state === InitializationState.READY;
  }

  /**
   * Check if OneSignal is currently initializing
   */
  isInitializing(): boolean {
    return this.initializationStatus.state === InitializationState.INITIALIZING;
  }

  /**
   * Get current initialization status
   */
  getInitializationStatus(): InitializationStatus {
    return {...this.initializationStatus};
  }

  /**
   * Safe wrapper for OneSignal SDK calls
   */
  private async safeOneSignalCall<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T | null> {
    if (!this.isInitialized()) {
      console.warn(
        `${ONESIGNAL_LOG_PREFIXES.ERROR} Attempted to call ${operationName} before OneSignal initialization (state: ${this.initializationStatus.state})`,
      );
      return null;
    }

    try {
      return await operation();
    } catch (error) {
      console.error(
        `${ONESIGNAL_LOG_PREFIXES.ERROR} ${operationName} failed:`,
        error,
      );
      return null;
    }
  }

  /**
   * Handle user login
   */
  async handleLogin(userId: string): Promise<void> {
    try {
      console.log(
        `${ONESIGNAL_LOG_PREFIXES.ONESIGNAL} Handling login for user: ${userId}`,
      );

      // Reset state
      this.setState({
        userId: null,
        pushToken: null,
        externalId: null,
        optedIn: false,
        permission: false,
        isInitialized: true,
        lastUpdated: 0,
      });

      // Login to OneSignal
      OneSignal.login(userId);
      console.log(
        `${ONESIGNAL_LOG_PREFIXES.ONESIGNAL} User logged in to OneSignal: ${userId}`,
      );

      // Update device state
      await this.updateDeviceState();
    } catch (error) {
      console.error(`${ONESIGNAL_LOG_PREFIXES.ERROR} Login failed:`, error);
      // Don't throw - continue gracefully
    }
  }

  /**
   * Handle user logout
   */
  async handleLogout(): Promise<void> {
    try {
      console.log(`${ONESIGNAL_LOG_PREFIXES.ONESIGNAL} Handling logout`);

      // Clear state
      this.setState({
        userId: null,
        pushToken: null,
        externalId: null,
        optedIn: false,
        permission: false,
        isInitialized: false,
        lastUpdated: 0,
      });
      console.log(`${ONESIGNAL_LOG_PREFIXES.ONESIGNAL} Device state cleared`);
    } catch (error) {
      console.error(`${ONESIGNAL_LOG_PREFIXES.ERROR} Logout failed:`, error);
      // Don't throw - continue gracefully
    }
  }

  /**
   * Check and update notification permissions
   */
  async checkPermissions(): Promise<void> {
    // Guard: Only check if OneSignal is ready
    if (!this.isInitialized()) {
      console.log(
        `${ONESIGNAL_LOG_PREFIXES.PERMISSION} Skipping permission check - OneSignal not ready (state: ${this.initializationStatus.state})`,
      );
      return;
    }

    try {
      const previousPermission = this.state.permission;
      const permission = await OneSignal.Notifications.getPermissionAsync();

      if (permission !== previousPermission) {
        console.log(
          `${ONESIGNAL_LOG_PREFIXES.PERMISSION} Permission changed: ${previousPermission} -> ${permission}`,
        );
        this.setState({permission});
      }
    } catch (error) {
      console.error(
        `${ONESIGNAL_LOG_PREFIXES.ERROR} Failed to check permissions:`,
        error,
      );
      // Don't throw - continue gracefully
    }
  }

  /**
   * Update device state from OneSignal SDK
   */
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

      console.log(
        `${ONESIGNAL_LOG_PREFIXES.ONESIGNAL} Device state updated:`,
        newState,
      );
      this.setState(newState);
    } catch (error) {
      console.error(
        `${ONESIGNAL_LOG_PREFIXES.ERROR} Failed to update device state:`,
        error,
      );
      // Don't throw - continue gracefully
    }
  }

  /**
   * Update state and notify listeners
   */
  private setState(newState: Partial<DeviceState>): void {
    const previousState = {...this.state};
    this.state = {...this.state, ...newState};

    // Emit state change event
    const event: StateChangeEvent = {
      type: 'state_updated',
      previousState,
      currentState: {...this.state},
      timestamp: Date.now(),
    };

    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error(
          `${ONESIGNAL_LOG_PREFIXES.ERROR} Error in state change listener:`,
          error,
        );
      }
    });
  }
}

// Singleton instance
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
