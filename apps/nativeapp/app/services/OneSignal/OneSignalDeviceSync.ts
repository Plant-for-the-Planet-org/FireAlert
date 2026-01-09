/**
 * OneSignalDeviceSync
 * Synchronizes device subscriptions with backend alert methods
 */

import {DeviceState, SyncResult, AlertMethod} from './types';
import {
  ONESIGNAL_LOG_PREFIXES,
  ONESIGNAL_RETRY_CONFIG,
} from '../../utils/OneSignal/constants';
import {getDeviceInfo} from '../../utils/deviceInfo';

export class OneSignalDeviceSync {
  private isSyncing: boolean;
  private trpcClient: any;

  constructor(trpcClient: any) {
    this.trpcClient = trpcClient;
    this.isSyncing = false;
  }

  /**
   * Main sync operation - synchronize device subscription with backend
   */
  async syncDeviceSubscription(
    deviceState: DeviceState,
    userId: string,
  ): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log(
        `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Sync already in progress, skipping`,
      );
      return {
        action: 'no_change',
        message: 'Sync already in progress',
        timestamp: Date.now(),
      };
    }

    this.isSyncing = true;

    try {
      console.log(
        `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Starting device sync for user: ${userId}`,
      );

      if (!deviceState.userId) {
        console.warn(
          `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} No OneSignal userId available, skipping sync`,
        );
        return {
          action: 'no_change',
          message: 'No OneSignal userId available',
          timestamp: Date.now(),
        };
      }

      const {deviceId, deviceName} = await getDeviceInfo();

      // Check if device alert method exists
      const existingAlertMethod = await this.checkExistingAlertMethod(
        userId,
        deviceId,
      );

      if (existingAlertMethod) {
        console.log(
          `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Found existing alert method: ${existingAlertMethod.id}`,
        );

        // Check if state has changed
        if (existingAlertMethod.destination !== deviceState.userId) {
          console.log(
            `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Device state changed, updating alert method`,
          );
          return this.updateDeviceAlertMethod(
            existingAlertMethod.id,
            deviceState,
          );
        }

        console.log(
          `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Alert method is up to date`,
        );
        return {
          action: 'no_change',
          alertMethodId: existingAlertMethod.id,
          message: 'Alert method already up to date',
          timestamp: Date.now(),
        };
      }

      // Create new device alert method
      console.log(
        `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} No existing alert method found, creating new one`,
      );
      return this.createDeviceAlertMethod(
        deviceState,
        userId,
        deviceId,
        deviceName,
      );
    } catch (error) {
      console.error(
        `${ONESIGNAL_LOG_PREFIXES.ERROR} Device sync failed:`,
        error,
      );
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Check if device alert method exists in backend
   */
  private async checkExistingAlertMethod(
    userId: string,
    deviceId: string,
  ): Promise<AlertMethod | null> {
    try {
      console.log(
        `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Checking for existing alert method: userId=${userId}, deviceId=${deviceId}`,
      );

      const response =
        await this.trpcClient.alertMethod.getAlertMethods.query();

      if (!response?.json?.data) {
        console.log(
          `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} No alert methods found`,
        );
        return null;
      }

      const deviceAlertMethods = response.json.data.filter(
        (method: AlertMethod) =>
          method.method === 'device' && method.deviceId === deviceId,
      );

      if (deviceAlertMethods.length > 0) {
        console.log(
          `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Found ${deviceAlertMethods.length} device alert method(s)`,
        );
        return deviceAlertMethods[0];
      }

      console.log(
        `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} No device alert method found for deviceId: ${deviceId}`,
      );
      return null;
    } catch (error) {
      console.error(
        `${ONESIGNAL_LOG_PREFIXES.ERROR} Failed to check existing alert method:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create new device alert method with retry logic
   */
  private async createDeviceAlertMethod(
    deviceState: DeviceState,
    userId: string,
    deviceId: string,
    deviceName: string,
  ): Promise<SyncResult> {
    return this.retryWithBackoff(async () => {
      try {
        console.log(
          `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Creating device alert method: ${deviceName} (${deviceId})`,
        );

        const payload = {
          deviceId,
          deviceName,
          method: 'device',
          destination: deviceState.userId,
        };

        const response =
          await this.trpcClient.alertMethod.createAlertMethod.mutate({
            json: payload,
          });

        if (response?.json?.status === 'success' && response?.json?.data) {
          console.log(
            `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Device alert method created: ${response.json.data.id}`,
          );
          return {
            action: 'created',
            alertMethodId: response.json.data.id,
            message: 'Device alert method created successfully',
            timestamp: Date.now(),
          };
        }

        throw new Error(
          `Failed to create alert method: ${
            response?.json?.message || 'Unknown error'
          }`,
        );
      } catch (error) {
        console.error(
          `${ONESIGNAL_LOG_PREFIXES.ERROR} Failed to create device alert method:`,
          error,
        );
        throw error;
      }
    }, 'createDeviceAlertMethod');
  }

  /**
   * Update existing device alert method with retry logic
   */
  private async updateDeviceAlertMethod(
    alertMethodId: string,
    deviceState: DeviceState,
  ): Promise<SyncResult> {
    return this.retryWithBackoff(async () => {
      try {
        console.log(
          `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Updating device alert method: ${alertMethodId}`,
        );

        const response =
          await this.trpcClient.alertMethod.updateAlertMethod.mutate({
            json: {
              params: {alertMethodId},
              body: {destination: deviceState.userId},
            },
          });

        if (response?.json?.status === 'success' && response?.json?.data) {
          console.log(
            `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Device alert method updated: ${alertMethodId}`,
          );
          return {
            action: 'updated',
            alertMethodId: response.json.data.id,
            message: 'Device alert method updated successfully',
            timestamp: Date.now(),
          };
        }

        throw new Error(
          `Failed to update alert method: ${
            response?.json?.message || 'Unknown error'
          }`,
        );
      } catch (error) {
        console.error(
          `${ONESIGNAL_LOG_PREFIXES.ERROR} Failed to update device alert method:`,
          error,
        );
        throw error;
      }
    }, 'updateDeviceAlertMethod');
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (
      let attempt = 1;
      attempt <= ONESIGNAL_RETRY_CONFIG.MAX_ATTEMPTS;
      attempt++
    ) {
      try {
        console.log(
          `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} ${operationName} attempt ${attempt}/${ONESIGNAL_RETRY_CONFIG.MAX_ATTEMPTS}`,
        );
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} ${operationName} attempt ${attempt} failed:`,
          lastError.message,
        );

        if (attempt < ONESIGNAL_RETRY_CONFIG.MAX_ATTEMPTS) {
          const delay = Math.min(
            ONESIGNAL_RETRY_CONFIG.INITIAL_DELAY_MS *
              Math.pow(ONESIGNAL_RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt - 1),
            ONESIGNAL_RETRY_CONFIG.MAX_DELAY_MS,
          );
          console.log(
            `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Retrying in ${delay}ms...`,
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(
      `${ONESIGNAL_LOG_PREFIXES.ERROR} ${operationName} failed after ${ONESIGNAL_RETRY_CONFIG.MAX_ATTEMPTS} attempts:`,
      lastError?.message,
    );
    throw lastError || new Error(`${operationName} failed after max retries`);
  }

  /**
   * Disable device alert method (when permissions revoked)
   */
  async disableDeviceAlertMethod(alertMethodId: string): Promise<SyncResult> {
    try {
      console.log(
        `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Disabling device alert method: ${alertMethodId}`,
      );

      const response =
        await this.trpcClient.alertMethod.updateAlertMethod.mutate({
          json: {
            params: {alertMethodId},
            body: {isEnabled: false},
          },
        });

      if (response?.json?.status === 'success') {
        console.log(
          `${ONESIGNAL_LOG_PREFIXES.DEVICE_SYNC} Device alert method disabled: ${alertMethodId}`,
        );
        return {
          action: 'updated',
          alertMethodId,
          message: 'Device alert method disabled',
          timestamp: Date.now(),
        };
      }

      throw new Error(
        `Failed to disable alert method: ${
          response?.json?.message || 'Unknown error'
        }`,
      );
    } catch (error) {
      console.error(
        `${ONESIGNAL_LOG_PREFIXES.ERROR} Failed to disable device alert method:`,
        error,
      );
      throw error;
    }
  }
}
