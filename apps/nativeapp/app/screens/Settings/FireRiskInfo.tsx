import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import RiskGuage from './RiskGuage';

export default function FireRiskInfo({siteId}: {siteId: string}) {
  // if (!siteId) {
  //   return null;
  // }

  return (
    <View>
      <Text>FireRiskInfo</Text>
      <View style={styles.guageContainer}>
        <RiskGuage
          primaryLabel="Current Site Risk"
          secondaryLabel="Average of your sites: 11"
          meterValue={12}
        />
        <RiskGuage
          primaryLabel="Average Site Risk"
          secondaryLabel="Average of your sites: 11"
          meterValue={67}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  guageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
});
