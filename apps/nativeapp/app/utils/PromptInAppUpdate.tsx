import React, {
  JSX,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  Linking,
  Platform,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import SpInAppUpdates, {
  IAUUpdateKind,
  StartUpdateOptions,
} from 'sp-react-native-in-app-updates';
import {Colors, Typography} from '../styles';
import {WEB_URLS} from '../constants/webUrls';

const inAppUpdates = new SpInAppUpdates(false);

const STORE_URL =
  Platform.OS === 'ios' ? WEB_URLS.APP_STORE : WEB_URLS.PLAY_STORE;

/**
 * Mandatory update gate. Starting with 1.10.0, any newer version in the
 * store must be installed before the app can be used.
 *
 * - Checks the store on launch and whenever the app comes back to the
 *   foreground.
 * - Android: starts Google Play's IMMEDIATE update flow once per launch.
 * - Both platforms: shows a full-screen "Update required" screen on top of
 *   the app, with no way to dismiss it. The only action opens the update.
 * - If the check itself fails (offline, sideloaded or debug build, store
 *   unreachable), the app stays usable, so a store outage never locks
 *   users out.
 * - Wraps the app: while an update is required, the app below is hidden
 *   from screen readers, so only the gate can be reached. The app tree
 *   stays mounted, so nothing restarts when the gate appears.
 */
export function ForceUpdateGate({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [isRequired, setIsRequired] = useState(false);
  const autoStartedRef = useRef(false);

  const startUpdate = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        await inAppUpdates.startUpdate({updateType: IAUUpdateKind.IMMEDIATE});
        return;
      }
    } catch (e) {
      console.log('ForceUpdateGate startUpdate error:', e);
    }
    // iOS, or Android when the Play flow is not available.
    Linking.openURL(STORE_URL).catch(e =>
      console.log('ForceUpdateGate openURL error:', e),
    );
  }, []);

  const check = useCallback(async () => {
    try {
      const result = await inAppUpdates.checkNeedsUpdate({
        curVersion: DeviceInfo.getVersion(),
      });
      if (!result.shouldUpdate) {
        return;
      }
      setIsRequired(true);
      if (Platform.OS === 'android' && !autoStartedRef.current) {
        autoStartedRef.current = true;
        startUpdate();
      }
    } catch (e) {
      console.log('ForceUpdateGate check error:', e);
    }
  }, [startUpdate]);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        check();
      }
    });
    return () => sub.remove();
  }, [check]);

  return (
    <View style={gateStyles.container}>
      <View
        style={gateStyles.container}
        accessibilityElementsHidden={isRequired}
        importantForAccessibility={isRequired ? 'no-hide-descendants' : 'auto'}>
        {children}
      </View>
      {isRequired && (
        <View style={gateStyles.overlay} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={gateStyles.title}>
            Update required
          </Text>
          <Text style={gateStyles.message}>
            A new version of FireAlert is available. Please update to keep
            getting fire alerts.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={startUpdate}
            style={gateStyles.button}>
            <Text style={gateStyles.buttonText}>Update now</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const gateStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: Colors.WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: Typography.FONT_FAMILY_BOLD,
    fontSize: Typography.FONT_SIZE_22,
    color: Colors.TEXT_COLOR,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_16,
    color: Colors.TEXT_COLOR,
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  buttonText: {
    fontFamily: Typography.FONT_FAMILY_BOLD,
    fontSize: Typography.FONT_SIZE_16,
    color: Colors.WHITE,
  },
});

export function PromptInAppUpdatePanel(): JSX.Element {
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [installer, setInstaller] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<unknown>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      try {
        const ver = DeviceInfo.getVersion();
        setCurrentVersion(ver);
        const inst = await DeviceInfo.getInstallerPackageName();
        setInstaller(inst);
      } catch (e) {
        setError(e);
      }
    };
    init();
  }, []);

  const prettyError = useMemo(() => {
    if (!error) {
      return null;
    }
    if (error instanceof Error) {
      return error.message;
    }
    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return String(error);
    }
  }, [error]);

  const handleCheck = useCallback(async () => {
    setIsChecking(true);
    setError(null);
    setResult(null);
    try {
      const res = await inAppUpdates.checkNeedsUpdate({
        curVersion: currentVersion,
      });
      setResult(res);
    } catch (e) {
      setError(e);
    } finally {
      setIsChecking(false);
    }
  }, [currentVersion]);

  const handleStartUpdate = useCallback(async () => {
    setIsChecking(true);
    setError(null);
    try {
      let updateOptions: StartUpdateOptions = {};
      if (Platform.OS === 'android') {
        updateOptions = {updateType: IAUUpdateKind.FLEXIBLE};
      }
      await inAppUpdates.startUpdate(updateOptions);
    } catch (e) {
      setError(e);
    } finally {
      setIsChecking(false);
    }
  }, []);

  const handleClear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>In-App Update Debug</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Platform:</Text>
        <Text style={styles.value}>{Platform.OS}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Current Version:</Text>
        <Text style={styles.value}>{currentVersion || 'unknown'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Installer Package:</Text>
        <Text style={styles.value}>{installer ?? 'unknown'}</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          onPress={handleCheck}
          disabled={isChecking}
          style={[styles.button, isChecking && styles.buttonDisabled]}>
          <Text style={styles.buttonText}>
            {isChecking ? 'Checking…' : 'Check for Update'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleStartUpdate}
          disabled={!result?.shouldUpdate || isChecking}
          style={[
            styles.button,
            (!result?.shouldUpdate || isChecking) && styles.buttonDisabled,
          ]}>
          <Text style={styles.buttonText}>Start Update</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleClear} style={styles.tertiaryButton}>
          <Text style={styles.tertiaryText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.output}>
        {!!result && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>checkNeedsUpdate Result</Text>
            <Text style={styles.code}>{JSON.stringify(result, null, 2)}</Text>
          </View>
        )}
        {!!prettyError && (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.cardTitle}>Error</Text>
            <Text style={[styles.code, styles.errorText]}>{prettyError}</Text>
          </View>
        )}
        {!result && !prettyError && (
          <Text style={styles.hint}>
            Tap "Check for Update" to see details here.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
    backgroundColor: '#0B0B0B0F',
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    width: 140,
    color: '#333',
    fontWeight: '500',
  },
  value: {
    flex: 1,
    color: '#111',
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  button: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  tertiaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  tertiaryText: {
    color: '#374151',
  },
  output: {
    marginTop: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  errorCard: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  cardTitle: {
    fontWeight: '600',
    marginBottom: 6,
  },
  code: {
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
    fontSize: 12,
    color: '#111827',
  },
  errorText: {
    color: '#991B1B',
  },
  hint: {
    color: '#6B7280',
  },
});
