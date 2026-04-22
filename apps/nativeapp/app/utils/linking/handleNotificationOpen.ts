import type {NotificationClickEvent} from 'react-native-onesignal';
import {CommonActions} from '@react-navigation/native';

import {DEEP_LINK_HOST, DEEP_LINK_SCHEME, linking} from './linkingConfig';
import {navigationRef} from './navigationRef';

const stripPrefix = (url: string): string => {
  for (const prefix of linking.prefixes) {
    if (url.startsWith(prefix)) {
      return url.slice(prefix.length) || '/';
    }
  }
  return url;
};

const urlFromAdditionalData = (
  data: Record<string, unknown> | null | undefined,
): string | null => {
  if (!data) {
    return null;
  }
  const explicit = typeof data.url === 'string' ? (data.url as string) : null;
  if (explicit) {
    return explicit;
  }
  const incidentId =
    typeof data.incidentId === 'string'
      ? (data.incidentId as string)
      : typeof data.siteIncidentId === 'string'
        ? (data.siteIncidentId as string)
        : null;
  if (incidentId) {
    return `${DEEP_LINK_SCHEME}://incident/${incidentId}`;
  }
  const alertId =
    typeof data.alertId === 'string'
      ? (data.alertId as string)
      : typeof data.id === 'string'
        ? (data.id as string)
        : null;
  if (alertId) {
    return `${DEEP_LINK_SCHEME}://alert/${alertId}`;
  }
  return null;
};

/**
 * Routes a OneSignal notification click to the correct in-app screen by
 * turning its URL (or `additionalData`) into a navigation state via the
 * shared linking config, then applying it to the navigation container.
 *
 * OneSignal's `suppressLaunchURLs` is enabled on Android so the SDK does
 * not open the URL in a browser — we own the routing here.
 */
export const handleNotificationOpen = (event: NotificationClickEvent) => {
  const notification = event.notification;
  const launchUrl = (notification as unknown as {launchURL?: string}).launchURL;
  const additionalData = notification.additionalData as
    | Record<string, unknown>
    | undefined;

  const url = launchUrl || urlFromAdditionalData(additionalData);
  if (!url) {
    return;
  }

  const path = stripPrefix(url);

  if (!navigationRef.isReady() || !linking.getStateFromPath) {
    return;
  }

  const state = linking.getStateFromPath(path.replace(/^\/+/, ''), linking.config);
  if (!state) {
    return;
  }

  navigationRef.dispatch(CommonActions.reset(state));
};
