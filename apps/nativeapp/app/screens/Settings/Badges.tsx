import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {sharedStyles} from './styles/sharedStyles';
import {notificationStyles} from './styles/notificationStyles';
import {infoCardStyles} from './styles/infoCardStyles';

export function DisabledBadge() {
  return (
    <View
      style={[
        styles.badgeMarginLeft,
        notificationStyles.deviceTagCon,
        notificationStyles.comingSoonCon,
      ]}>
      <Text style={notificationStyles.deviceTag}>Disabled</Text>
    </View>
  );
}

export function DisabledNotificationInfo(props: {method: string}) {
  return (
    <Text
      style={[
        styles.infoMerginBottom,
        sharedStyles.commonPadding,
        infoCardStyles.desc,
      ]}>
      Sending {props.method} notifications is currently paused.
    </Text>
  );
}

export function ComingSoonBadge() {
  return (
    <View
      style={[notificationStyles.deviceTagCon, notificationStyles.comingSoon]}>
      <Text style={notificationStyles.deviceTag}>Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeMarginLeft: {
    marginLeft: 8,
  },
  infoMerginBottom: {
    marginBottom: 16,
  },
});
