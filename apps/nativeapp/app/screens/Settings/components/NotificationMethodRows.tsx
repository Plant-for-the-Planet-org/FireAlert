import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {Switch} from '../../../components';
import {TrashSolidIcon, VerificationWarning} from '../../../assets/svgs';
import {Colors, Typography} from '../../../styles';
import {extractCountryCode} from '../../../utils/countryCodeFilter';

interface AlertMethod {
  id: string;
  destination: string;
  isEnabled: boolean;
  isVerified: boolean;
  method: string;
  deviceName?: string;
}

interface NotificationMethodRowsProps {
  methods: AlertMethod[];
  onToggle: (methodId: string, enabled: boolean) => void;
  onVerify: (method: AlertMethod) => void;
  onRemove: (methodId: string) => void;
  loadingMethodIds?: string[];
  deletingMethodIds?: string[];
  showDeviceTag?: boolean;
  formatPhoneNumber?: boolean;
}

export const NotificationMethodRows: React.FC<NotificationMethodRowsProps> = ({
  methods,
  onToggle,
  onVerify,
  onRemove,
  loadingMethodIds = [],
  deletingMethodIds = [],
  showDeviceTag = false,
  formatPhoneNumber = false,
}) => {
  const formatDestination = (method: AlertMethod, index: number): string => {
    if (formatPhoneNumber && method.method === 'SMS') {
      const {countryCode, remainingNumber} = extractCountryCode(
        method.destination,
      );
      return `${countryCode} ${remainingNumber}`;
    }
    if (showDeviceTag && method.deviceName) {
      return method.deviceName;
    }
    return method.destination;
  };

  return (
    <View style={styles.emailContainer}>
      {methods.map((item, i) => (
        <View key={`method_${i}`}>
          <View style={[styles.emailSubContainer, styles.spaceBetween]}>
            <View style={styles.deviceItem}>
              <Text style={styles.myEmailName}>
                {formatDestination(item, i)}
              </Text>
              {showDeviceTag && i === 0 && (
                <View style={styles.deviceTagCon}>
                  <Text style={styles.deviceTag}>{''} this device</Text>
                </View>
              )}
            </View>
            <View style={styles.emailSubContainer}>
              {item.isVerified ? (
                loadingMethodIds.includes(item.id) ? (
                  <ActivityIndicator size={'small'} color={Colors.PRIMARY} />
                ) : (
                  <Switch
                    value={item.isEnabled}
                    onValueChange={(val: boolean) => onToggle(item.id, val)}
                  />
                )
              ) : (
                <TouchableOpacity
                  style={styles.verifiedChipsCon}
                  onPress={() => onVerify(item)}>
                  <View style={styles.verifiedChips}>
                    <VerificationWarning />
                    <Text style={styles.verifiedTxt}>Verify</Text>
                  </View>
                </TouchableOpacity>
              )}
              {!(showDeviceTag && i === 0) && (
                <TouchableOpacity
                  style={styles.trashIcon}
                  disabled={deletingMethodIds.includes(item.id)}
                  onPress={() => onRemove(item.id)}>
                  {deletingMethodIds.includes(item.id) ? (
                    <ActivityIndicator size={'small'} color={Colors.PRIMARY} />
                  ) : (
                    <TrashSolidIcon />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
          {methods.length - 1 !== i && (
            <View style={[styles.separator, styles.marginVertical12]} />
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  emailContainer: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.WHITE,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.62,
    elevation: 8,
  },
  emailSubContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  myEmailName: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
    marginRight: 8,
  },
  deviceTagCon: {
    backgroundColor: Colors.ORANGE,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  deviceTag: {
    textTransform: 'uppercase',
    fontSize: Typography.FONT_SIZE_10,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.WHITE,
  },
  verifiedChipsCon: {
    height: 45,
    justifyContent: 'center',
  },
  verifiedChips: {
    backgroundColor: '#F2994A20',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedTxt: {
    marginLeft: 2,
    fontSize: 8,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
  },
  trashIcon: {
    marginLeft: 5,
    paddingVertical: 15,
    paddingLeft: 10,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#e0e0e0',
  },
  marginVertical12: {
    marginVertical: 12,
  },
});
