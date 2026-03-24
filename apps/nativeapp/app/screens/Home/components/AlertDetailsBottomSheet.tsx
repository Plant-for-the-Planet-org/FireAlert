import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import {BackArrowIcon} from '../../../assets/svgs';
import {BottomSheet} from '../../../components';
import {
  AlertActionsSection,
  AlertDetectionSection,
  AlertLocationSection,
  AlertRadiusSection,
  AlertSiteSection,
} from '../../../components/Alert';
import {trpc} from '../../../services/trpc';
import {Colors, Typography} from '../../../styles';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface AlertDetailsBottomSheetProps {
  isVisible: boolean;
  alertId: string | null;
  onClose: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
}

export const AlertDetailsBottomSheet: React.FC<
  AlertDetailsBottomSheetProps
> = ({
  isVisible,
  alertId,
  onClose,
  onBack,
  showBackButton,
}) => {
  const handleCopyCoordinates = (_latitude: number, _longitude: number) => {};

  const handleGoogleRedirect = (latitude: number, longitude: number) => {
    const lat = Number.parseFloat(latitude.toString());
    const lng = Number.parseFloat(longitude.toString());
    const scheme = Platform.select({ios: 'maps:', android: 'geo:'});
    const url = Platform.select({
      ios: `${scheme}0,0?q=${lat},${lng}`,
      android: `${scheme}${lat},${lng}?q=${lat},${lng}`,
    });

    if (url) {
      Linking.openURL(url).catch(err => {
        console.error('Failed to open Google Maps:', err);
        Alert.alert('Error', 'Unable to open Google Maps');
      });
    }
  };

  // Fetch alert data
  const {
    data: alertResponse,
    isLoading,
    isError,
  } = (trpc as any).alert.getAlert.useQuery(
    {json: {id: alertId || ''}},
    {
      enabled: !!alertId && isVisible,
      retryDelay: 3000,
    },
  );

  const alert = alertResponse?.json.data;

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.GRADIENT_PRIMARY} />
          <Text style={styles.loadingText}>Loading alert details...</Text>
        </View>
      );
    }

    if (isError || !alert) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Failed to load alert details</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onClose}>
            <Text style={styles.retryButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Create data array for BottomSheetFlatList
    const alertData = [
      {
        id: 'detection',
        type: 'detection',
        component: (
          <View style={styles.detectionSectionContainer}>
            <AlertDetectionSection
              detectedBy={alert.detectedBy}
              localEventDate={alert.localEventDate}
              eventDate={alert.eventDate}
              localTimeZone={alert.localTimeZone}
              confidence={alert.confidence}
            />
          </View>
        ),
      },
      ...(alert.site
        ? [
            {
              id: 'site',
              type: 'site',
              component: <AlertSiteSection site={alert.site} />,
            },
          ]
        : []),
      {
        id: 'location',
        type: 'location',
        component: (
          <AlertLocationSection
            latitude={alert.latitude}
            longitude={alert.longitude}
            onCopyCoordinates={() =>
              handleCopyCoordinates(alert.latitude, alert.longitude)
            }
          />
        ),
      },
      {
        id: 'radius',
        type: 'radius',
        component: <AlertRadiusSection distance={alert.distance} />,
      },
      {
        id: 'actions',
        type: 'actions',
        component: (
          <AlertActionsSection
            onOpenInGoogleMaps={() =>
              handleGoogleRedirect(alert.latitude, alert.longitude)
            }
          />
        ),
      },
    ];

    return (
      <BottomSheetFlatList
        data={alertData}
        renderItem={({item}) => item.component}
        keyExtractor={item => item.id}
        style={styles.alertsList}
        contentContainerStyle={styles.alertsListContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <BottomSheet
      isVisible={isVisible}
      onBackdropPress={onClose}
      backdropColor="transparent"
      snapPoints={['50%']}
      initialSnapIndex={0}
      useScrollableContainer>
      <View style={[styles.modalContainer, styles.commonPadding]}>
        <View style={styles.modalHeaderContainer}>
          <View style={styles.modalHeader} />
        </View>
        <View style={styles.headerActions}>
          {showBackButton && onBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              accessibilityLabel="Go back to incident details"
              accessibilityRole="button">
              <BackArrowIcon />
            </TouchableOpacity>
          )}
        </View>
        {renderContent()}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    bottom: 0,
    borderRadius: 15,
    width: SCREEN_WIDTH,
    backgroundColor: Colors.WHITE,
  },
  modalHeader: {
    width: 46,
    height: 8,
    marginTop: 10,
    marginBottom: 16,
    borderRadius: 5,
    alignSelf: 'center',
    backgroundColor: Colors.GRAY_MEDIUM,
  },
  modalHeaderContainer: {
    position: 'relative',
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerActions: {
    position: 'absolute',
    top: 10,
    left: 16,
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  commonPadding: {
    paddingHorizontal: 16,
  },
  centerContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 16,
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.GRAY_DEEP,
  },
  errorText: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.GRADIENT_PRIMARY,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.WHITE,
  },
  alertsList: {
    flex: 1,
  },
  alertsListContent: {
    paddingHorizontal: 0,
  },
  detectionSectionContainer: {
    backgroundColor: Colors.GRAY_LIGHTEST + '40',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.GRAY_LIGHT,
    marginBottom: 8,
  },
});
