import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {styles as settingsStyles} from './Settings';

export function DisabledBadge() {
  return (
    <View
      style={[
        styles.badgeMarginLeft,
        settingsStyles.deviceTagCon,
        settingsStyles.comingSoonCon,
      ]}>
      <Text style={settingsStyles.deviceTag}>Disabled</Text>
    </View>
  );
}

export function DisabledNotificationInfo(props: {method: string}) {
  return (
    <Text
      style={[
        styles.infoMerginBottom,
        settingsStyles.commonPadding,
        settingsStyles.desc,
      ]}>
      Sending {props.method} notifications is currently paused.
    </Text>
  );
}

export function ComingSoonBadge() {
  return (
    <View style={[settingsStyles.deviceTagCon, settingsStyles.comingSoon]}>
      <Text style={settingsStyles.deviceTag}>Coming Soon</Text>
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
