// src/services/inAppUpdates.ts
import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import SpInAppUpdates, {
  IAUUpdateKind,
  NeedsUpdateResponse,
  StartUpdateOptions,
} from 'sp-react-native-in-app-updates';

const inApp = new SpInAppUpdates(false); // set to true to enable debug logs if you want

export type CheckOptions = {
  curVersion?: string; // optional, the lib will fallback to device version via react-native-device-info
  country?: string; // iOS only
};

export async function checkNeedsUpdate(
  opts?: CheckOptions,
): Promise<NeedsUpdateResponse | null> {
  try {
    const curVersion = opts?.curVersion ?? DeviceInfo.getVersion();
    const result = await inApp.checkNeedsUpdate({...opts, curVersion});
    return result;
  } catch (e) {
    console.warn('checkNeedsUpdate error:', e);
    return null;
  }
}

export async function startUpdateForPlatform() {
  if (Platform.OS === 'android') {
    const options: StartUpdateOptions = {
      updateType: IAUUpdateKind.FLEXIBLE, // or IAUUpdateKind.IMMEDIATE
    };
    try {
      await inApp.startUpdate(options);
    } catch (e) {
      console.warn('startUpdate error:', e);
    }
  } else {
    // iOS will show an alert directing to App Store; you can customize text
    const options: StartUpdateOptions = {
      ios: {
        title: 'Update available',
        message:
          'A new version is available in the App Store. Do you want to update?',
        buttonUpgradeText: 'Update',
        buttonCancelText: 'Cancel',
      },
    };
    try {
      await inApp.startUpdate(options);
    } catch (e) {
      console.warn('startUpdate iOS error:', e);
    }
  }
}

// Android: call installUpdate() after Fexible download is complete (or let Play handle it)
export function installDownloadedUpdateIfNeeded() {
  if (Platform.OS === 'android') {
    try {
      inApp.installUpdate(); // installs the downloaded update (Android only)
    } catch (e) {
      console.warn('installUpdate error:', e);
    }
  }
}

export function addStatusUpdateListener(cb: (evt: any) => void) {
  inApp.addStatusUpdateListener(cb);
  return cb;
}

export function removeStatusUpdateListener(cb: (evt: any) => void) {
  inApp.removeStatusUpdateListener(cb);
}
