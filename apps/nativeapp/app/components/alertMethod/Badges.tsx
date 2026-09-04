import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {alertMethodStyles} from './styles';

export function DisabledBadge() {
  return (
    <View
      style={[
        styles.badgeMarginLeft,
        alertMethodStyles.deviceTagCon,
        alertMethodStyles.comingSoonCon,
      ]}>
      <Text style={alertMethodStyles.deviceTag}>Disabled</Text>
    </View>
  );
}

export function DisabledNotificationInfo(props: {method: string}) {
  return (
    <Text
      style={[
        styles.infoMerginBottom,
        alertMethodStyles.commonPadding,
        alertMethodStyles.desc,
      ]}>
      Sending {props.method} notifications is currently paused.
    </Text>
  );
}

export function ComingSoonBadge() {
  return (
    <View
      style={[alertMethodStyles.deviceTagCon, alertMethodStyles.comingSoon]}>
      <Text style={alertMethodStyles.deviceTag}>Coming Soon</Text>
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
