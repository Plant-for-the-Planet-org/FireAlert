import React, {useState} from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Modal,
  Pressable,
} from 'react-native';
import {Colors} from '../styles';

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
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

  const selectedOption = DURATION_OPTIONS.find(
    opt => opt.value === durationDays,
  );

  const handleOptionSelect = (days: number) => {
    onDurationChange(days);
    setIsDropdownVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setIsDropdownVisible(true)}
        accessibilityLabel={`Duration filter: ${selectedOption?.label || '7d'}`}
        accessibilityRole="button"
        accessibilityHint="Opens duration selection menu">
        <Text style={styles.buttonText}>{selectedOption?.label || '7d'}</Text>
      </TouchableOpacity>

      <Modal
        visible={isDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDropdownVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsDropdownVisible(false)}>
          <View style={styles.dropdown}>
            {DURATION_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.dropdownItem,
                  option.value === durationDays && styles.dropdownItemSelected,
                ]}
                onPress={() => handleOptionSelect(option.value)}
                accessibilityLabel={`${option.label} duration`}
                accessibilityRole="menuitem"
                accessibilityState={{selected: option.value === durationDays}}>
                <Text
                  style={[
                    styles.dropdownItemText,
                    option.value === durationDays &&
                      styles.dropdownItemTextSelected,
                  ]}>
                  {option.label}
                </Text>
                {option.value === durationDays && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.WHITE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.GRAY_LIGHT,
    minWidth: 60,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.TEXT_COLOR,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    backgroundColor: Colors.WHITE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.GRAY_LIGHT,
    minWidth: 100,
    shadowColor: Colors.BLACK,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.GRAY_LIGHT,
  },
  dropdownItemSelected: {
    backgroundColor: Colors.BACKGROUND,
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.TEXT_COLOR,
  },
  dropdownItemTextSelected: {
    fontWeight: '600',
    color: Colors.GRADIENT_PRIMARY,
  },
  checkmark: {
    fontSize: 16,
    color: Colors.GRADIENT_PRIMARY,
    fontWeight: 'bold',
  },
});
