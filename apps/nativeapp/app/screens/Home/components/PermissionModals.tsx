import React from 'react';

import {
  PermissionBlockedAlert,
  PermissionDeniedAlert,
} from '../PermissionAlert/LocationPermissionAlerts';
import type {PermissionModalsProps} from '../types';

/**
 * PermissionModals Component
 *
 * Renders location permission alert modals (denied and blocked states).
 * Handles user interactions for retrying permission requests, dismissing alerts,
 * opening system settings, and exiting the app.
 *
 * @component
 * @example
 * ```tsx
 * <PermissionModals
 *   isPermissionDenied={isDenied}
 *   isPermissionBlocked={isBlocked}
 *   onRetry={() => checkPermission()}
 *   onDismiss={() => setIsPermissionDenied(false)}
 *   onOpenSettings={() => setIsPermissionBlocked(false)}
 *   onExit={() => BackHandler.exitApp()}
 * />
 * ```
 */
const PermissionModals: React.FC<PermissionModalsProps> = ({
  isPermissionDenied,
  isPermissionBlocked,
  onRetry,
  onDismiss,
  onOpenSettings,
  onExit,
}) => {
  return (
    <>
      <PermissionBlockedAlert
        isPermissionBlockedAlertShow={isPermissionBlocked}
        setIsPermissionBlockedAlertShow={() => {}}
        message={'You need to give location permission to continue.'}
        onPressPrimaryBtn={onOpenSettings}
        onPressSecondaryBtn={onExit}
      />
      <PermissionDeniedAlert
        isPermissionDeniedAlertShow={isPermissionDenied}
        setIsPermissionDeniedAlertShow={() => {}}
        message={'You need to give location permission to continue.'}
        onPressPrimaryBtn={onRetry}
        onPressSecondaryBtn={onDismiss}
      />
    </>
  );
};

export default React.memo(PermissionModals);
