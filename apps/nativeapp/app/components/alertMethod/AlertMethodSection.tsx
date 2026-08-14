import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import {AddIcon} from '../../assets/svgs';
import {DisabledBadge, DisabledNotificationInfo} from './Badges';
import {alertMethodStyles as styles} from './styles';

interface AlertMethodSectionProps {
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
  disabledInfoMethod?: string;
  onAdd?: () => void;
  hasItems: boolean;
  children: React.ReactNode;
}

const AlertMethodSection = ({
  icon,
  label,
  enabled,
  disabledInfoMethod,
  onAdd,
  hasItems,
  children,
}: AlertMethodSectionProps) => {
  return (
    <View style={styles.mySiteNameMainContainer}>
      <View style={styles.mySiteNameSubContainer}>
        <View style={styles.mobileContainer}>
          {icon}
          <Text style={[styles.smallHeading]}>{label}</Text>
          {!enabled && <DisabledBadge />}
        </View>
        {onAdd && (
          <TouchableOpacity
            disabled={!enabled}
            style={!enabled && styles.addButtonDisabled}
            onPress={onAdd}>
            <AddIcon />
          </TouchableOpacity>
        )}
      </View>
      {disabledInfoMethod && !enabled && (
        <DisabledNotificationInfo method={disabledInfoMethod} />
      )}
      {hasItems && <View style={styles.emailContainer}>{children}</View>}
    </View>
  );
};

export default AlertMethodSection;
