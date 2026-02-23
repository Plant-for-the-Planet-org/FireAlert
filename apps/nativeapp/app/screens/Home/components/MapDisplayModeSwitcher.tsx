import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {RadarIcon, IncidentActiveIcon} from '../../../assets/svgs';
import {Colors} from '../../../styles';

export type MapDisplayMode = 'alerts' | 'incidents';

interface MapDisplayModeSwitcherProps {
  mode: MapDisplayMode;
  onModeChange: (mode: MapDisplayMode) => void;
}

export const MapDisplayModeSwitcher: React.FC<MapDisplayModeSwitcherProps> = ({
  mode,
  onModeChange,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.segment,
          styles.leftSegment,
          mode === 'alerts' && styles.activeSegment,
        ]}
        onPress={() => onModeChange('alerts')}
        accessibilityLabel="Show alerts mode"
        accessibilityRole="button"
        accessibilityState={{selected: mode === 'alerts'}}>
        <RadarIcon
          width={20}
          height={20}
          fill={mode === 'alerts' ? Colors.WHITE : Colors.GRAY_DEEP}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.segment,
          styles.rightSegment,
          mode === 'incidents' && styles.activeSegment,
        ]}
        onPress={() => onModeChange('incidents')}
        accessibilityLabel="Show incidents mode"
        accessibilityRole="button"
        accessibilityState={{selected: mode === 'incidents'}}>
        <IncidentActiveIcon
          width={20}
          height={20}
          fill={mode === 'incidents' ? Colors.WHITE : Colors.GRAY_DEEP}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.WHITE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.GRAY_LIGHT,
    overflow: 'hidden',
  },
  segment: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftSegment: {
    borderRightWidth: 1,
    borderRightColor: Colors.GRAY_LIGHT,
  },
  rightSegment: {},
  activeSegment: {
    backgroundColor: Colors.GRADIENT_PRIMARY,
  },
});
