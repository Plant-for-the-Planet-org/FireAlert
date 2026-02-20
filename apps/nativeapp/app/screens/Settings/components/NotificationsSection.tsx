/**
 * NotificationsSection Component
 *
 * Renders the notifications section of Settings screen with alert method cards.
 * Displays email, SMS, device, WhatsApp, and webhook notification methods with
 * toggle, add, verify, and remove actions.
 *
 * @module Settings/components/NotificationsSection
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import {
  AddIcon,
  SmsIcon,
  EmailIcon,
  GlobeWebIcon,
  PhoneIcon,
  TrashSolidIcon,
  VerificationWarning,
} from '../../../assets/svgs';
import {Colors} from '../../../styles';
import {sharedStyles} from '../styles/sharedStyles';
import {notificationStyles} from '../styles/notificationStyles';
import {DisabledBadge, DisabledNotificationInfo} from '../Badges';
import {extractCountryCode} from '../../../utils/countryCodeFilter';
import {useAppSelector} from '../../../hooks';
import {
  selectIsEmailEnabled,
  selectIsDeviceEnabled,
  selectIsSmsEnabled,
  selectIsWhatsAppEnabled,
  selectIsWebhookEnabled,
} from '../../../redux/slices/login/settingsSlice';
import type {NotificationsSectionProps, AlertMethodType} from '../types';
import type {AlertMethod} from '../../../services/OneSignal/types';

/**
 * NotificationsSection Component
 *
 * Renders notification methods organized by type (email, SMS, device, WhatsApp, webhook).
 * Each method type displays:
 * - Header with icon, label, and disabled badge (if applicable)
 * - Add button for adding new methods
 * - List of existing methods with toggle, verify, and remove actions
 * - Disabled notification info message when method type is disabled
 *
 * @param {NotificationsSectionProps} props - Component props
 * @returns {JSX.Element} Rendered notifications section
 *
 * @example
 * ```tsx
 * <NotificationsSection
 *   alertMethods={categorizedAlertMethods}
 *   deviceAlertPreferences={devicePreferences}
 *   onToggleMethod={handleToggle}
 *   onAddMethod={handleAdd}
 *   onVerifyMethod={handleVerify}
 *   onRemoveMethod={handleRemove}
 *   isLoading={false}
 * />
 * ```
 */
export function NotificationsSection({
  alertMethods,
  deviceAlertPreferences,
  onToggleMethod,
  onAddMethod,
  onVerifyMethod,
  onRemoveMethod,
}: NotificationsSectionProps) {
  // Track loading states for individual methods
  const [alertMethodLoaderArr, setAlertMethodLoaderArr] = useState<string[]>(
    [],
  );
  const [delAlertMethodArr, setDelAlertMethodArr] = useState<string[]>([]);

  // Get enabled states from Redux
  const alertMethodsEnabled = {
    email: useAppSelector(selectIsEmailEnabled),
    device: useAppSelector(selectIsDeviceEnabled),
    sms: useAppSelector(selectIsSmsEnabled),
    whatsapp: useAppSelector(selectIsWhatsAppEnabled),
    webhook: useAppSelector(selectIsWebhookEnabled),
  };

  /**
   * Handle toggle switch for alert method
   * Adds method ID to loading array during mutation
   */
  const handleNotifySwitch = async (
    method: AlertMethod,
    value: boolean,
  ): Promise<void> => {
    setAlertMethodLoaderArr(prev => [...prev, method.id]);
    try {
      await onToggleMethod(method.id, value);
    } finally {
      setAlertMethodLoaderArr(prev => prev.filter(id => id !== method.id));
    }
  };

  /**
   * Handle remove alert method
   * Adds method ID to delete loading array during mutation
   */
  const handleRemoveAlertMethod = async (methodId: string): Promise<void> => {
    setDelAlertMethodArr(prev => [...prev, methodId]);
    try {
      await onRemoveMethod(methodId);
    } finally {
      setDelAlertMethodArr(prev => prev.filter(id => id !== methodId));
    }
  };

  /**
   * Handle verify button press
   * Wraps onVerifyMethod to match existing callback pattern
   */
  const handleVerify = (method: AlertMethod) => () => {
    onVerifyMethod(method);
  };

  /**
   * Render method row with toggle, verify, and remove actions
   */
  const renderMethodRow = (
    method: AlertMethod,
    index: number,
    totalCount: number,
    showDeviceTag: boolean = false,
  ) => {
    const isMethodLoading = alertMethodLoaderArr.includes(method.id);
    const isDeleting = delAlertMethodArr.includes(method.id);

    return (
      <View key={`method_${method.id}_${index}`}>
        <View
          style={[
            notificationStyles.emailSubContainer,
            sharedStyles.justifyContentSpaceBetween,
          ]}>
          <View style={notificationStyles.deviceItem}>
            <Text style={notificationStyles.myEmailName}>
              {method.method === 'sms'
                ? extractCountryCode(method.destination).countryCode +
                  ' ' +
                  extractCountryCode(method.destination).remainingNumber
                : method.method === 'device'
                ? method.deviceName
                : method.destination}
            </Text>
            {showDeviceTag && index === 0 && (
              <View style={notificationStyles.deviceTagCon}>
                <Text style={notificationStyles.deviceTag}> this device</Text>
              </View>
            )}
          </View>
          <View style={notificationStyles.emailSubContainer}>
            {method.isVerified ? (
              isMethodLoading ? (
                <ActivityIndicator size={'small'} color={Colors.PRIMARY} />
              ) : (
                <Switch
                  value={method.isEnabled}
                  onValueChange={val => handleNotifySwitch(method, val)}
                />
              )
            ) : (
              <TouchableOpacity
                style={notificationStyles.verifiedChipsCon}
                onPress={handleVerify(method)}>
                <View style={notificationStyles.verifiedChips}>
                  <VerificationWarning />
                  <Text style={notificationStyles.verifiedTxt}>Verify</Text>
                </View>
              </TouchableOpacity>
            )}
            {/* Hide remove button for first device (current device) */}
            {!(method.method === 'device' && index === 0) && (
              <TouchableOpacity
                style={notificationStyles.trashIcon}
                disabled={isDeleting}
                onPress={() => handleRemoveAlertMethod(method.id)}>
                {isDeleting ? (
                  <ActivityIndicator size={'small'} color={Colors.PRIMARY} />
                ) : (
                  <TrashSolidIcon />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
        {totalCount - 1 !== index && (
          <View
            style={[sharedStyles.separator, sharedStyles.marginVertical12]}
          />
        )}
      </View>
    );
  };

  /**
   * Render notification method card
   */
  const renderMethodCard = (
    methodType: AlertMethodType,
    icon: React.ReactElement,
    label: string,
    methods: AlertMethod[],
    showAddButton: boolean = true,
  ) => {
    const isEnabled = alertMethodsEnabled[methodType];
    const methodsToRender =
      methodType === 'device' ? deviceAlertPreferences : methods;

    return (
      <View style={notificationStyles.mySiteNameMainContainer}>
        <View style={notificationStyles.mySiteNameSubContainer}>
          <View style={notificationStyles.mobileContainer}>
            {icon}
            <Text style={[sharedStyles.smallHeading]}>{label}</Text>
            {!isEnabled && <DisabledBadge />}
          </View>
          {showAddButton && (
            <TouchableOpacity onPress={() => onAddMethod(methodType)}>
              <AddIcon />
            </TouchableOpacity>
          )}
        </View>
        {!isEnabled && <DisabledNotificationInfo method={methodType} />}
        {methodsToRender.length > 0 && (
          <View style={notificationStyles.emailContainer}>
            {methodsToRender.map((method, i) =>
              renderMethodRow(
                method,
                i,
                methodsToRender.length,
                methodType === 'device',
              ),
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View
      style={[notificationStyles.myNotifications, sharedStyles.commonPadding]}>
      <Text style={sharedStyles.mainHeading}>Notifications</Text>

      {/* Device (Mobile) */}
      {renderMethodCard(
        'device',
        <PhoneIcon />,
        'Mobile',
        alertMethods.device,
        false, // No add button for device
      )}

      {/* Email */}
      {renderMethodCard(
        'email',
        <EmailIcon />,
        'Email',
        alertMethods.email,
        true,
      )}

      {/* SMS */}
      {renderMethodCard('sms', <SmsIcon />, 'SMS', alertMethods.sms, true)}

      {/* Webhook */}
      {renderMethodCard(
        'webhook',
        <GlobeWebIcon width={17} height={17} />,
        'Webhook',
        alertMethods.webhook,
        true,
      )}

      {/* WhatsApp - Commented out in original Settings.tsx */}
      {/* {renderMethodCard(
        'whatsapp',
        <WhatsAppIcon />,
        'WhatsApp',
        alertMethods.whatsapp,
        true,
      )} */}
    </View>
  );
}
