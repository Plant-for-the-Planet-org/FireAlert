import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {OrangeFireIcon, IncidentActiveIcon} from '../../../assets/svgs';
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
        <OrangeFireIcon
          width={20}
          height={20}
          // fill={mode === 'alerts' ? Colors.WHITE : Colors.GRAY_DEEP}
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
          // fill={mode === 'incidents' ? Colors.WHITE : Colors.GRAY_DEEP}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.WHITE,
    borderRadius: 16,
    overflow: 'hidden',
  },
  segment: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Colors.GRADIENT_PRIMARY,
  },
  leftSegment: {
    borderRightWidth: 2,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  rightSegment: {
    borderLeftWidth: 2,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  activeSegment: {
    borderWidth: 4,
    borderColor: Colors.GRADIENT_PRIMARY,
  },
});
