import React from 'react';
import {Linking, Platform} from 'react-native';

import {AlertModal} from '../../../components';

const isAndroid = Platform.OS === 'android';

interface IPermissionDeniedAlertProps {
  isPermissionDeniedAlertShow: boolean;
  setIsPermissionDeniedAlertShow: React.Dispatch<React.SetStateAction<boolean>>;
  onPressPrimaryBtn: any;
  onPressSecondaryBtn: any;
  message?: string;
}

export const PermissionDeniedAlert = ({
  isPermissionDeniedAlertShow,
  setIsPermissionDeniedAlertShow,
  onPressPrimaryBtn,
  onPressSecondaryBtn,
  message = '',
}: IPermissionDeniedAlertProps) => {
  message =
    message || 'You need to give location permission to register on-site tree.';

  return (
    <AlertModal
      visible={isPermissionDeniedAlertShow}
      heading={'Permission Denied'}
      message={message}
      primaryBtnText={'Ok'}
      secondaryBtnText={'Back'}
      onPressPrimaryBtn={() => {
        setIsPermissionDeniedAlertShow(false);
        onPressPrimaryBtn();
      }}
      onPressSecondaryBtn={() => {
        setIsPermissionDeniedAlertShow(false);
        onPressSecondaryBtn();
      }}
      showSecondaryButton={true}
    />
  );
};

interface IPermissionBlockAlertProps {
  isPermissionBlockedAlertShow: boolean;
  setIsPermissionBlockedAlertShow: React.Dispatch<
    React.SetStateAction<boolean>
  >;
  onPressPrimaryBtn: any;
  onPressSecondaryBtn: any;
  message?: string;
}

export const PermissionBlockedAlert = ({
  isPermissionBlockedAlertShow,
  setIsPermissionBlockedAlertShow,
  onPressPrimaryBtn,
  onPressSecondaryBtn,
  message = '',
}: IPermissionBlockAlertProps) => {
  message =
    message || 'You need to give location permission to register on-site tree.';
  return (
    <AlertModal
      visible={isPermissionBlockedAlertShow}
      heading={'Permission Blocked'}
      message={message}
      primaryBtnText={'Open Settings'}
      secondaryBtnText={'Back'}
      onPressPrimaryBtn={() => {
        setIsPermissionBlockedAlertShow(false);
        onPressPrimaryBtn();
        if (isAndroid) {
          Linking.openSettings();
        } else {
          Linking.openURL('app-settings');
        }
      }}
      onPressSecondaryBtn={() => {
        setIsPermissionBlockedAlertShow(false);
        onPressSecondaryBtn();
      }}
      showSecondaryButton={true}
    />
  );
};
