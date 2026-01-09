/**
 * useOneSignalState Hook
 * Provides access to OneSignal device state and updates
 */

import {useEffect, useState} from 'react';
import {
  getOneSignalStateManager,
  DeviceState,
  StateChangeEvent,
} from '../../services/OneSignal';
import {ONESIGNAL_LOG_PREFIXES} from '../../utils/OneSignal/constants';

export function useOneSignalState() {
  const [deviceState, setDeviceState] = useState<DeviceState | null>(null);
  const stateManager = getOneSignalStateManager();

  useEffect(() => {
    // Get initial state
    const initialState = stateManager.getState();
    setDeviceState(initialState);

    // Subscribe to state changes
    const unsubscribe = stateManager.subscribe((event: StateChangeEvent) => {
      console.log(
        `${ONESIGNAL_LOG_PREFIXES.ONESIGNAL} Device state updated:`,
        event.type,
      );
      setDeviceState(event.currentState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return deviceState;
}
