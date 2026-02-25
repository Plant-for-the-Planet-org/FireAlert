import React, {useState, useCallback} from 'react';
import {
  Text,
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {VERSION_CONFIG, getVersionString} from '../../constants/version';
import {Colors, Typography} from '../../styles';
import {trpc} from '../../services/trpc';

interface VersionInfoProps {
  style?: object;
  textStyle?: object;
}

export const VersionInfo: React.FC<VersionInfoProps> = ({style, textStyle}) => {
  const [tapCount, setTapCount] = useState(0);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);

  // Fetch server version info
  const {
    data: serverVersionInfo,
    isLoading: isLoadingServerVersion,
    refetch: refetchServerVersion,
  } = trpc.version.info.useQuery(undefined, {
    enabled: showDebugModal,
    onSuccess: () => {
      setLastCheckTime(new Date());
    },
  });

  const handleVersionTap = useCallback(() => {
    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);

    if (newTapCount >= 7) {
      setShowDebugModal(true);
      setTapCount(0);
      refetchServerVersion();
    }

    // Reset tap count after 2 seconds of inactivity
    setTimeout(() => {
      setTapCount(0);
    }, 2000);
  }, [tapCount, refetchServerVersion]);

  const handleCloseDebugModal = useCallback(() => {
    setShowDebugModal(false);
    setTapCount(0);
  }, []);

  const formatDateTime = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleString();
  };

  return (
    <>
      <TouchableOpacity
        onPress={handleVersionTap}
        activeOpacity={0.7}
        style={style}>
        <Text style={[styles.versionText, textStyle]}>
          Version {getVersionString()}
          {__DEV__ && (
            <Text style={styles.calverText}> • {VERSION_CONFIG.CALVER}</Text>
          )}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showDebugModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseDebugModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Version Debug Info</Text>
              <TouchableOpacity
                onPress={handleCloseDebugModal}
                style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Client Version (SemVer):</Text>
                <Text style={styles.infoValue}>{VERSION_CONFIG.SEMVER}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Client Version (CalVer):</Text>
                <Text style={styles.infoValue}>{VERSION_CONFIG.CALVER}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Build Number:</Text>
                <Text style={styles.infoValue}>
                  {VERSION_CONFIG.BUILD_NUMBER}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Platform:</Text>
                <Text style={styles.infoValue}>{VERSION_CONFIG.PLATFORM}</Text>
              </View>

              <View style={styles.separator} />

              {isLoadingServerVersion ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={Colors.PRIMARY} />
                  <Text style={styles.loadingText}>
                    Fetching server version...
                  </Text>
                </View>
              ) : serverVersionInfo ? (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Server Version:</Text>
                    <Text style={styles.infoValue}>
                      {serverVersionInfo.calver}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>API Version:</Text>
                    <Text style={styles.infoValue}>
                      {serverVersionInfo.apiVersion}
                    </Text>
                  </View>

                  {serverVersionInfo.bypassEnabled && (
                    <View style={styles.warningContainer}>
                      <Text style={styles.warningText}>
                        ⚠️ Version checks are bypassed
                      </Text>
                      <Text style={styles.warningSubtext}>
                        Development mode active
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.infoRow}>
                  <Text style={styles.errorText}>
                    Failed to fetch server version
                  </Text>
                </View>
              )}

              <View style={styles.separator} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Check:</Text>
                <Text style={styles.infoValue}>
                  {formatDateTime(lastCheckTime)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleCloseDebugModal}
              style={styles.closeModalButton}>
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  versionText: {
    textAlign: 'center',
    color: Colors.GRAY_LIGHTEST,
    fontSize: Typography.FONT_SIZE_12,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  calverText: {
    color: Colors.GRAY_LIGHT,
    fontSize: Typography.FONT_SIZE_10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: Colors.WHITE,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: Typography.FONT_SIZE_24,
    color: Colors.GRAY_LIGHT,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  modalContent: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.GRAY_DARK,
    flex: 1,
  },
  infoValue: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
    flex: 1,
    textAlign: 'right',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.GRAY_LIGHTEST,
    marginVertical: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.GRAY_DARK,
  },
  errorText: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.ALERT,
    textAlign: 'center',
  },
  closeModalButton: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  closeModalButtonText: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.WHITE,
  },
  warningContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  warningText: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: '#856404',
    textAlign: 'center',
  },
  warningSubtext: {
    fontSize: Typography.FONT_SIZE_12,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: '#856404',
    textAlign: 'center',
    marginTop: 4,
  },
});
