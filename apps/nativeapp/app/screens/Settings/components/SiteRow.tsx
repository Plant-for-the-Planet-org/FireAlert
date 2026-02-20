import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {Switch} from '../../../components';
import {DropdownArrow} from '../../../assets/svgs';
import {Colors, Typography} from '../../../styles';
import {RADIUS_ARR} from '../../../constants';

interface SiteRowProps {
  site: {
    id: string;
    name: string;
    radius: number;
    isMonitored: boolean;
    geometry: {
      type: string;
    };
  };
  onPress: () => void;
  onToggleMonitoring: (enabled: boolean) => void;
  onRadiusPress?: (event: any) => void;
  showRadius?: boolean;
  isLoading?: boolean;
}

export const SiteRow: React.FC<SiteRowProps> = ({
  site,
  onPress,
  onToggleMonitoring,
  onRadiusPress,
  showRadius = true,
  isLoading = false,
}) => {
  return (
    <TouchableOpacity
      disabled={isLoading}
      onPress={onPress}
      style={styles.siteRowContainer}>
      <Text style={styles.siteName}>{site.name || site.id}</Text>
      <View style={styles.rightContainer}>
        {showRadius && onRadiusPress && (
          <TouchableOpacity
            onPress={onRadiusPress}
            disabled={isLoading}
            style={[styles.dropDownRadius, styles.marginRight5]}>
            <Text style={styles.siteRadius}>
              {RADIUS_ARR.filter(({value}) => site.radius === value)[0]?.name}
            </Text>
            <DropdownArrow />
          </TouchableOpacity>
        )}
        {isLoading ? (
          <ActivityIndicator size={'small'} color={Colors.PRIMARY} />
        ) : (
          <Switch value={site.isMonitored} onValueChange={onToggleMonitoring} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  siteRowContainer: {
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.WHITE,
    marginTop: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.62,
    elevation: 8,
  },
  siteName: {
    flex: 1,
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.TEXT_COLOR,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropDownRadius: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  siteRadius: {
    marginRight: 4,
    fontSize: Typography.FONT_SIZE_12,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
  },
  marginRight5: {
    marginRight: 5,
  },
});
