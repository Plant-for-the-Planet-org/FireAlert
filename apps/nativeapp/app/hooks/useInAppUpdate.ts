// src/hooks/useInAppUpdate.ts
import {useEffect} from 'react';
import {AppState} from 'react-native';
import {
  checkNeedsUpdate,
  startUpdateForPlatform,
} from '../services/inAppUpdates';

export function useInAppUpdate(autoCheck = true) {
  useEffect(() => {
    let mounted = true;

    async function doCheck() {
      const res = await checkNeedsUpdate();
      if (!mounted || !res) return;

      if (res.shouldUpdate) {
        // default behavior: start update immediately — you can change to prompt user
        startUpdateForPlatform();
      }
    }

    if (autoCheck) doCheck();

    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') doCheck();
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [autoCheck]);
}
