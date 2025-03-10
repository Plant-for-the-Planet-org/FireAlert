import React, {useCallback} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors} from '../../styles';
import {
  FONT_SIZE_12,
  FONT_SIZE_18,
  FONT_SIZE_20,
} from '../../styles/typography';

const GRADIENT_COLORS = ['#007A49', '#FFB775', '#EB5757'];
const meter = 50;

export default function RiskGuage({
  primaryLabel,
  secondaryLabel,
  meterValue = meter,
}: {
  primaryLabel: string;
  secondaryLabel: string;
  meterValue?: number;
}) {
  useCallback(() => {
    console.log('Gradient Bottom Border', calculateGradient(meter));
  }, []);

  function calculateGradient(value: number) {
    const ratio = value / 100;
    const index = Math.floor(ratio * GRADIENT_COLORS.length);
    return GRADIENT_COLORS[index];
  }

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container]}>
        <Text style={styles.labelPrimary}>{primaryLabel}</Text>
        <Text style={styles.labelSecondary}>{secondaryLabel}</Text>
        <Text
          style={[
            styles.labelValue,
            {
              color: calculateGradient(meterValue),
            },
          ]}>
          {meterValue}
        </Text>

        <View
          style={[
            styles.meter,
            {
              left: `${meterValue}%`,
              backgroundColor: calculateGradient(meterValue),
            },
          ]}
        />
        <LinearGradient
          colors={['#007A49', '#FFB775', '#EB5757']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={styles.gradientBorder}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexGrow: 1,
  },
  container: {
    position: 'relative',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Colors.GRAY_MEDIUM,
    paddingVertical: 16,
    borderRadius: 8,
    overflow: 'hidden',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelPrimary: {
    fontSize: FONT_SIZE_18,
    fontWeight: 'bold',
  },
  labelSecondary: {
    fontSize: FONT_SIZE_12,
  },
  labelValue: {
    fontSize: FONT_SIZE_20,
    fontWeight: 'bold',
  },
  gradientBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  meter: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    height: 9,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
});
