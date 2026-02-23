import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {DropdownArrow} from '../../../assets/svgs';
import {Colors, Typography} from '../../../styles';

interface MapDurationDropdownProps {
  durationDays: number;
  onDurationChange: (days: number) => void;
}

const DURATION_OPTIONS = [
  {label: '1d', value: 1},
  {label: '3d', value: 3},
  {label: '7d', value: 7},
  {label: '30d', value: 30},
];

export const MapDurationDropdown: React.FC<MapDurationDropdownProps> = ({
  durationDays,
  onDurationChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = DURATION_OPTIONS.find(
    opt => opt.value === durationDays,
  );

  const handleSelect = (value: number) => {
    onDurationChange(value);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setIsOpen(!isOpen)}
        accessibilityLabel="Select duration filter"
        accessibilityRole="button"
        accessibilityState={{expanded: isOpen}}>
        <Text style={styles.buttonText}>{selectedOption?.label || '7d'}</Text>
        <DropdownArrow
          width={12}
          height={12}
          style={{
            transform: [{rotate: isOpen ? '180deg' : '0deg'}],
          }}
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdown}>
          {DURATION_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                option.value === durationDays && styles.selectedOption,
              ]}
              onPress={() => handleSelect(option.value)}
              accessibilityLabel={`${option.label} duration`}
              accessibilityRole="menuitem"
              accessibilityState={{selected: option.value === durationDays}}>
              <Text
                style={[
                  styles.optionText,
                  option.value === durationDays && styles.selectedOptionText,
                ]}>
                {option.label}
              </Text>
              {option.value === durationDays && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.WHITE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.GRAY_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 70,
    height: 44,
  },
  buttonText: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.TEXT_COLOR,
    marginRight: 6,
  },
  dropdown: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: Colors.WHITE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.GRAY_LIGHT,
    shadowColor: Colors.BLACK,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.GRAY_LIGHTEST,
  },
  selectedOption: {
    backgroundColor: Colors.GRADIENT_PRIMARY + '10',
  },
  optionText: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
  },
  selectedOptionText: {
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.GRADIENT_PRIMARY,
  },
  checkmark: {
    fontSize: Typography.FONT_SIZE_16,
    color: Colors.GRADIENT_PRIMARY,
    fontFamily: Typography.FONT_FAMILY_BOLD,
  },
});
