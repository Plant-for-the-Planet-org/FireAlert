/**
 * Push notification consumer hook. Init and state live in PushNotificationProvider
 * (contexts/PushNotificationContext).
 */

export {
  usePushNotification,
  PushNotificationProvider,
  PushNotificationContext,
  type PushNotificationContextValue,
  type PushNotificationProviderProps,
} from '../../contexts/PushNotificationContext';
