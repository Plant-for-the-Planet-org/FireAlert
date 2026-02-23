import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {RadarIcon, IncidentActiveIcon} from '../assets/svgs';
import {Colors} from '../styles';

interface MapDisplayModeSwitcherProps {
  mode: 'alerts' | 'incidents';
  onModeChange: (mode: 'alerts' | 'incidents') => void;
}

export const MapDisplayModeSwitcher: React.FC<MapDisplayModeSwitcherProps> = ({
  mode,
  onModeChange,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.segment, mode === 'alerts' && styles.activeSegment]}
        onPress={() => onModeChange('alerts')}
        accessibilityLabel="Show alerts on map"
        accessibilityRole="button"
        accessibilityState={{selected: mode === 'alerts'}}>
        <RadarIcon
          fill={mode === 'alerts' ? Colors.WHITE : Colors.TEXT_COLOR}
          width={20}
          height={20}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.segment, mode === 'incidents' && styles.activeSegment]}
        onPress={() => onModeChange('incidents')}
        accessibilityLabel="Show incidents on map"
        accessibilityRole="button"
        accessibilityState={{selected: mode === 'incidents'}}>
        <IncidentActiveIcon
          fill={mode === 'incidents' ? Colors.WHITE : Colors.TEXT_COLOR}
          width={20}
          height={20}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.TRANSPARENT,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.GRAY_LIGHT,
    overflow: 'hidden',
  },
  segment: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    height: 44,
    backgroundColor: Colors.TRANSPARENT,
    borderWidth: 1,
    borderColor: Colors.GRAY_LIGHT,
  },
  activeSegment: {
    backgroundColor: Colors.GRADIENT_PRIMARY,
    borderColor: Colors.GRADIENT_PRIMARY,
  },
});
