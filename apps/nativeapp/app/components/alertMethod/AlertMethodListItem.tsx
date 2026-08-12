import React from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';

import {TrashSolidIcon, VerificationWarning} from '../../assets/svgs';
import {Colors} from '../../styles';
import {styles} from '../../screens/Settings/Settings';
import Switch from '../switch/Switch';

interface AlertMethodListItemProps {
  destinationText: string;
  isVerified: boolean;
  isEnabled: boolean;
  isToggleLoading: boolean;
  isDeleting: boolean;
  showDelete?: boolean;
  tag?: React.ReactNode;
  isLast: boolean;
  onToggle: (value: boolean) => void;
  onVerify: () => void;
  onDelete: () => void;
}

const AlertMethodListItem = ({
  destinationText,
  isVerified,
  isEnabled,
  isToggleLoading,
  isDeleting,
  showDelete = true,
  tag,
  isLast,
  onToggle,
  onVerify,
  onDelete,
}: AlertMethodListItemProps) => {
  return (
    <View>
      <View
        style={[styles.emailSubContainer, styles.justifyContentSpaceBetween]}>
        <View style={styles.deviceItem}>
          <Text style={styles.myEmailName}>{destinationText}</Text>
          {tag}
        </View>
        <View style={styles.emailSubContainer}>
          {isVerified ? (
            isToggleLoading ? (
              <ActivityIndicator size={'small'} color={Colors.PRIMARY} />
            ) : (
              <Switch value={isEnabled} onValueChange={onToggle} />
            )
          ) : (
            <TouchableOpacity
              style={styles.verifiedChipsCon}
              onPress={onVerify}>
              <View style={styles.verifiedChips}>
                <VerificationWarning />
                <Text style={styles.verifiedTxt}>Verify</Text>
              </View>
            </TouchableOpacity>
          )}
          {showDelete && (
            <TouchableOpacity
              style={styles.trashIcon}
              disabled={isDeleting}
              onPress={onDelete}>
              {isDeleting ? (
                <ActivityIndicator size={'small'} color={Colors.PRIMARY} />
              ) : (
                <TrashSolidIcon />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
      {!isLast && (
        <View style={[styles.separator, styles.marginVertical12]} />
      )}
    </View>
  );
};

export default AlertMethodListItem;
