import {useState, useEffect, useCallback, useRef} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {trpc} from '../../services/trpc';
import {VERSION_CONFIG} from '../../constants/version';

interface UseVersionCheckOptions {
  enabled?: boolean;
  onForceUpdate?: () => void;
  onSoftUpdate?: () => void;
}

interface VersionCheckState {
  isChecking: boolean;
  lastCheck: Date | null;
  updateRequired: 'force' | 'soft' | 'none';
  updateMessage: string | null;
  downloadUrl: string | null;
}

const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Hook for managing version checks and update notifications
 *
 * Features:
 * - Performs version check on mount
 * - Schedules periodic checks every 24 hours
 * - Handles force and soft update scenarios
 * - Implements exponential backoff for network failures
 * - Manages soft update dismissal state
 */
export const useVersionCheck = (options: UseVersionCheckOptions = {}) => {
  const {enabled = true, onForceUpdate, onSoftUpdate} = options;

  const [state, setState] = useState<VersionCheckState>({
    isChecking: false,
    lastCheck: null,
    updateRequired: 'none',
    updateMessage: null,
    downloadUrl: null,
  });

  const retryCountRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate session key for dismissal tracking
  const sessionKey = useRef(`version-soft-update-dismissed-${Date.now()}`);

  const versionCheckMutation = trpc.version.check.useMutation();

  /**
   * Perform version check with exponential backoff retry logic
   */
  const checkVersion = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setState(prev => ({...prev, isChecking: true}));

    try {
      const response = await versionCheckMutation.mutateAsync({
        clientVersion: VERSION_CONFIG.CALVER,
        platform: VERSION_CONFIG.PLATFORM as 'ios' | 'android',
        buildNumber: VERSION_CONFIG.BUILD_NUMBER,
        appVersion: VERSION_CONFIG.SEMVER,
      });

      // Reset retry count on success
      retryCountRef.current = 0;

      // Update state based on response
      if (response.status === 'force_update') {
        setState({
          isChecking: false,
          lastCheck: new Date(),
          updateRequired: 'force',
          updateMessage: response.message,
          downloadUrl: response.downloadUrl || null,
        });

        // Trigger force update callback
        onForceUpdate?.();
      } else if (response.status === 'soft_update') {
        // Check if soft update was dismissed this session
        const dismissed = await AsyncStorage.getItem(sessionKey.current);

        if (!dismissed) {
          setState({
            isChecking: false,
            lastCheck: new Date(),
            updateRequired: 'soft',
            updateMessage: response.message,
            downloadUrl: response.downloadUrl || null,
          });

          // Trigger soft update callback
          onSoftUpdate?.();
        } else {
          setState({
            isChecking: false,
            lastCheck: new Date(),
            updateRequired: 'none',
            updateMessage: null,
            downloadUrl: null,
          });
        }
      } else {
        // Success - no update required
        setState({
          isChecking: false,
          lastCheck: new Date(),
          updateRequired: 'none',
          updateMessage: null,
          downloadUrl: null,
        });
      }
    } catch (error) {
      console.error('Version check failed:', error);

      // Implement exponential backoff retry
      if (retryCountRef.current < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCountRef.current);
        retryCountRef.current += 1;

        console.log(
          `Retrying version check in ${delay}ms (attempt ${retryCountRef.current}/${MAX_RETRIES})`,
        );

        setTimeout(() => {
          checkVersion();
        }, delay);
      } else {
        // Max retries reached, stop checking
        console.error('Max retries reached for version check');
        setState(prev => ({...prev, isChecking: false}));
        retryCountRef.current = 0;
      }
    }
  }, [enabled, versionCheckMutation, onForceUpdate, onSoftUpdate]);

  /**
   * Dismiss soft update notification for current session
   */
  const dismissSoftUpdate = useCallback(async () => {
    try {
      await AsyncStorage.setItem(sessionKey.current, 'true');
      setState(prev => ({
        ...prev,
        updateRequired: 'none',
        updateMessage: null,
        downloadUrl: null,
      }));
    } catch (error) {
      console.error('Failed to dismiss soft update:', error);
    }
  }, []);

  // Perform version check on mount and schedule periodic checks
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Initial check on mount
    checkVersion();

    // Schedule periodic checks every 24 hours
    intervalRef.current = setInterval(() => {
      checkVersion();
    }, CHECK_INTERVAL);

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, checkVersion]);

  return {
    ...state,
    checkVersion,
    dismissSoftUpdate,
  };
};
