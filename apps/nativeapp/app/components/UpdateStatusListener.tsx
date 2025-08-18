// src/components/UpdateStatusListener.tsx
import {useEffect} from 'react';
import {Platform} from 'react-native';
import {
  addStatusUpdateListener,
  installDownloadedUpdateIfNeeded,
  removeStatusUpdateListener,
} from '../services/inAppUpdates';

// If you want to show nicer UI, replace Alert with your modal/toast system.

export default function UpdateStatusListener(): JSX.Element | null {
  useEffect(() => {
    if (Platform.OS !== 'android') return; // listener is Android-specific

    const handler = (statusEvent: any) => {
      // Example shape: { status, bytesDownloaded, totalBytesToDownload }
      // Play Core InstallStatus.DOWNLOADED === 11 (common) — but don't hardcode other states
      // when downloaded, call install
      try {
        const {status} = statusEvent ?? {};
        // INSTALL_STATUS_DOWNLOADED is the code Play Core uses when download finished.
        // We'll detect it by name if present, otherwise fallback to numeric 11.
        const isDownloaded =
          status === 'DOWNLOADED' || status === 'INSTALLED' || status === 11;

        if (isDownloaded) {
          // Option A: auto-install
          installDownloadedUpdateIfNeeded();

          // Option B: ask user before installing:
          // Alert.alert("Update ready", "An update was downloaded. Restart to apply?", [
          //   { text: "Later" },
          //   { text: "Restart", onPress: () => installDownloadedUpdateIfNeeded() },
          // ]);
        }

        // Optional: show progress
        if (statusEvent.bytesDownloaded && statusEvent.totalBytesToDownload) {
          const pct = Math.round(
            (statusEvent.bytesDownloaded / statusEvent.totalBytesToDownload) *
              100,
          );
          console.log(`Update download ${pct}%`);
          // show a toast or update global progress state if you want
        }
      } catch (err) {
        console.warn('Update status handler error:', err);
      }
    };

    addStatusUpdateListener(handler);
    return () => removeStatusUpdateListener(handler);
  }, []);

  return null; // this component does not render anything
}
