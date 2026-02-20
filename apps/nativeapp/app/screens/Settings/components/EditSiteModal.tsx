import React, {useRef} from 'react';
import {
  Text,
  View,
  Modal,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
  StyleSheet,
} from 'react-native';
import Toast from 'react-native-toast-notifications';
import type {ToastType} from 'react-native-toast-notifications';
import {CustomButton, FloatingInput, DropDown} from '../../../components';
import {CrossIcon} from '../../../assets/svgs';
import {Colors, Typography} from '../../../styles';
import {POINT_RADIUS_ARR, RADIUS_ARR} from '../../../constants';

interface EditSiteModalProps {
  visible: boolean;
  onClose: () => void;
  site: any;
  onSave: (name: string, radius: number) => Promise<void>;
  isLoading?: boolean;
  modalToastRef?: React.RefObject<any>;
}

export const EditSiteModal: React.FC<EditSiteModalProps> = ({
  visible,
  onClose,
  site,
  onSave,
  isLoading = false,
  modalToastRef,
}) => {
  const [siteName, setSiteName] = React.useState('');
  const [siteRadius, setSiteRadius] = React.useState<number>(0);

  React.useEffect(() => {
    if (site) {
      setSiteName(site.name || '');
      setSiteRadius(site.radius || 0);
    }
  }, [site]);

  const radiusOptions =
    site?.geometry?.type === 'Point' ? POINT_RADIUS_ARR : RADIUS_ARR;
  const selectedRadius = radiusOptions.find(r => r.value === siteRadius);

  const handleSave = async () => {
    await onSave(siteName, siteRadius);
  };

  return (
    <Modal transparent animationType={'slide'} visible={visible}>
      <KeyboardAvoidingView
        {...(Platform.OS === 'ios' ? {behavior: 'padding'} : {})}
        style={styles.siteModalStyle}>
        {modalToastRef && (
          <Toast ref={modalToastRef} offsetBottom={100} duration={2000} />
        )}
        <TouchableOpacity onPress={onClose} style={styles.crossContainer}>
          <CrossIcon fill={Colors.GRADIENT_PRIMARY} />
        </TouchableOpacity>
        <Text style={[styles.heading, styles.paddingHorizontal16]}>
          Enter Site Name
        </Text>
        <View
          style={[styles.siteModalStyle, styles.justifyContentSpaceBetween]}>
          <View>
            <FloatingInput
              autoFocus
              isFloat={false}
              value={siteName}
              editable={!site?.remoteId}
              onChangeText={setSiteName}
            />
            <View style={[styles.commonPadding]}>
              <DropDown
                expandHeight={10}
                items={radiusOptions}
                value={selectedRadius?.value}
                onSelectItem={(item: any) => setSiteRadius(item.value)}
                label={'Notify me if fires occur...'}
              />
            </View>
          </View>
          <CustomButton
            title="Continue"
            titleStyle={styles.title}
            onPress={handleSave}
            isLoading={isLoading}
            style={styles.btnContinueSiteModal}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  siteModalStyle: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: Colors.WHITE,
  },
  crossContainer: {
    width: 25,
    marginTop: 60,
    marginHorizontal: 16,
  },
  heading: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
  },
  paddingHorizontal16: {
    paddingHorizontal: 16,
  },
  justifyContentSpaceBetween: {
    justifyContent: 'space-between',
  },
  commonPadding: {
    paddingHorizontal: 16,
  },
  btnContinueSiteModal: {
    position: 'absolute',
    bottom: 40,
  },
  title: {
    color: Colors.WHITE,
  },
});
