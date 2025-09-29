import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
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

const inAppUpdates = new SpInAppUpdates(true);

export async function promptAppUpdateOnInit() {
  try {
    const currentVersion = DeviceInfo.getVersion();
    console.log('Checking for app update. Current version:', currentVersion);

    const installer = await DeviceInfo.getInstallerPackageName();
    console.log('installer', installer);
    // if (Platform.OS === 'android' && installer === 'com.android.vending') {
    // safe to call checkNeedsUpdate
    const result = await inAppUpdates.checkNeedsUpdate({
      curVersion: currentVersion,
    });
    console.log('checkNeedsUpdate result:', result);

    if (result.shouldUpdate) {
      let updateOptions: StartUpdateOptions = {};
      if (Platform.OS === 'android') {
        updateOptions = {updateType: IAUUpdateKind.FLEXIBLE};
      }
      await inAppUpdates.startUpdate(updateOptions);
    }
    // }
  } catch (e) {
    console.log('promptAppUpdateOnInit error:', e);
  }
}

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
