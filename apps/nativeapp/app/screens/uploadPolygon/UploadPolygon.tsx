import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import DocumentPicker, {
  isInProgress,
  DocumentPickerResponse,
  DirectoryPickerResponse,
} from 'react-native-document-picker';

import {DOMParser} from 'xmldom';
import RNFS from 'react-native-fs';
import {kml} from '@tmcw/togeojson';
import gjv from 'geojson-validation';
import React, {useState} from 'react';
import {useToast} from 'react-native-toast-notifications';

import {trpc} from '../../services/trpc';
import {Colors, Typography} from '../../styles';
import {CustomButton, FloatingInput} from '../../components';
import {BackArrowIcon, UploadCloud} from '../../assets/svgs';
import {fileExtensionExtract} from '../../utils/fileExtensionExtract';

const PICKER_OPTIONS = {
  presentationStyle: 'pageSheet',
  copyTo: 'documentDirectory',
  // type: ['application/vnd.google-earth.kml+xml', 'application/json'],
};

const UploadPolygon = ({navigation}) => {
  const [siteName, setSiteName] = useState<string>('');
  const [result, setResult] = useState<
    Array<DocumentPickerResponse> | DirectoryPickerResponse | undefined | null
  >();
  const [validToUpload, setValidToUpload] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const toast = useToast();

  const postSite = trpc.site.createSite.useMutation({
    retryDelay: 3000,
    onSuccess: () => {
      setLoading(false);
      navigation.navigate('Home');
    },
    onError: () => {
      setLoading(false);
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const handleBack = () => navigation.goBack();

  const handleError = (err: unknown) => {
    if (DocumentPicker.isCancel(err)) {
      console.warn('cancelled');
      // User cancelled the picker, exit any dialogs or menus and move on
    } else if (isInProgress(err)) {
      console.warn(
        'multiple pickers were opened, only the last will be considered',
      );
    } else {
      throw err;
    }
  };

  const readFile = async MyPath => {
    try {
      const path = MyPath;
      const contents = await RNFS.readFile(path, 'utf8');
      return '' + contents;
    } catch (e) {
      console.log(e);
    }
  };

  const addSiteApi = () => {
    setLoading(true);
    const geometry = {
      type: result?.features[0]?.geometry?.type,
      coordinates: result?.features[0]?.geometry?.coordinates,
    };
    postSite.mutate({
      json: {
        geometry,
        type: result?.features[0]?.geometry?.type,
        name: siteName,
      },
    });
  };

  const handleUploadFile = async () => {
    try {
      const pickerResult = await DocumentPicker.pickSingle(PICKER_OPTIONS);
      const read = await readFile(pickerResult.uri);

      if (fileExtensionExtract(pickerResult?.name) === 'geojson') {
        const geo = JSON.parse(read);
        if (gjv.valid(geo)) {
          if (geo?.features?.length === 1) {
            setValidToUpload(true);
            setSiteName(pickerResult?.name);
            setResult(geo);
          } else {
            console.warn('single polygon can be uploaded');
            toast.show('single polygon can be uploaded', {type: 'warning'});
          }
        } else {
          console.warn('wrong Json');
          toast.show('file contains wrong Json', {type: 'warning'});
        }
      } else if (fileExtensionExtract(pickerResult?.name) === 'kml') {
        const theKml = new DOMParser().parseFromString(read);
        const converted = kml(theKml);
        if (gjv.valid(converted)) {
          if (converted?.features?.length === 1) {
            setValidToUpload(true);
            setSiteName(pickerResult?.name);
            setResult(converted);
          } else {
            console.warn('single polygon can be uploaded');
            toast.show('single polygon can be uploaded', {type: 'warning'});
          }
        } else {
          console.warn('wrong Json');
          toast.show('file contains wrong Json', {type: 'warning'});
        }
      } else {
        setValidToUpload(false);
        console.log('file not supported');
        toast.show('file not supported', {type: 'warning'});
      }
    } catch (e) {
      handleError(e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.myProjects, styles.commonPadding]}>
        <TouchableOpacity onPress={handleBack} style={styles.backIcon}>
          <BackArrowIcon />
        </TouchableOpacity>
        <Text style={styles.mainHeading}>New Site</Text>
        <View style={styles.uploadImageCon}>
          <TouchableOpacity
            onPress={handleUploadFile}
            style={styles.uploadImageSubCon}>
            <UploadCloud />
            <Text style={styles.uploadTxt}>
              Add <Text style={{color: Colors.DEEP_PRIMARY}}>.geojson</Text> or{' '}
              <Text style={{color: Colors.DEEP_PRIMARY}}>.kml</Text> file
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.form}>
          <Text style={styles.uploadTxt}>Site Name</Text>
          <FloatingInput
            isFloat={false}
            value={siteName}
            onChangeText={setSiteName}
            placeholder={'Add site name'}
            containerStyle={styles.inputContainer}
          />
        </View>
      </View>
      <CustomButton
        isLoading={loading}
        title="Upload Site"
        onPress={addSiteApi}
        disabled={!validToUpload}
        titleStyle={styles.title}
        style={styles.btnContinueSiteModal}
      />
    </SafeAreaView>
  );
};

export default UploadPolygon;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  myProjects: {
    marginTop: 20,
  },
  backIcon: {
    width: 40,
    height: 25,
    paddingRight: 20,
    marginBottom: 10,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commonPadding: {
    paddingHorizontal: 30,
  },
  mainHeading: {
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_24,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
  },
  uploadImageCon: {
    height: 200,
    marginTop: 20,
    borderWidth: 2,
    borderRadius: 10,
    alignItems: 'center',
    borderStyle: 'dashed',
    justifyContent: 'center',
    backgroundColor: Colors.GRAY_MEDIUM,
  },
  uploadImageSubCon: {
    height: 200,
    width: '100%',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTxt: {
    marginTop: 10,
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_14,
    fontWeight: Typography.FONT_WEIGHT_MEDIUM,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  form: {
    marginTop: 40,
  },
  inputContainer: {
    width: '100%',
  },
  btnContinueSiteModal: {
    position: 'absolute',
    bottom: 40,
  },
  title: {
    color: Colors.WHITE,
  },
});
