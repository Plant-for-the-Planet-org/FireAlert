import {
  View,
  Text,
  Modal,
  Platform,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native';
import {
  pick,
  isErrorWithCode,
  errorCodes,
} from '@react-native-documents/picker';
import Toast from 'react-native-toast-notifications';
import area from '@turf/area';
import bbox from '@turf/bbox';
import {DOMParser} from 'xmldom';
import RNFS from 'react-native-fs';
import {kml} from '@tmcw/togeojson';
import gjv from 'geojson-validation';
import rewind from '@mapbox/geojson-rewind';
import React, {useRef, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {convertArea, point, polygon} from '@turf/helpers';
import {useToast} from 'react-native-toast-notifications';

import {
  fileNameExtract,
  fileExtensionExtract,
} from '../../utils/fileExtensionExtract';
import {trpc} from '../../services/trpc';
import {Colors, Typography} from '../../styles';
import {POINT_RADIUS_ARR, RADIUS_ARR} from '../../constants';

import {CustomButton, DropDown, FloatingInput} from '../../components';
import {BackArrowIcon, CrossIcon, UploadCloud} from '../../assets/svgs';
import {useNavigation} from '@react-navigation/native';

const UploadPolygon = () => {
  const navigation = useNavigation();
  const [fileName, setFileName] = useState<string>('');
  const [siteName, setSiteName] = useState<string>('');
  const [siteGeometry, setSiteGeometry] = useState<string | null>('');
  const [result, setResult] = useState<
    Array<DocumentPickerResponse> | DirectoryPickerResponse | undefined | null
  >();
  const [validToUpload, setValidToUpload] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [siteRad, setSiteRad] = useState<object | null>({});
  const [siteNameModalVisible, setSiteNameModalVisible] =
    useState<boolean>(false);

  const toast = useToast();
  const modalToast = useRef();
  const queryClient = useQueryClient();

  const _handleViewMap = (siteInfo: object) => {
    let bboxGeo;
    let highlightSiteInfo = siteInfo;
    if (siteInfo?.geometry.type === 'Point') {
      bboxGeo = bbox(point(siteInfo?.geometry.coordinates));
    } else {
      bboxGeo = bbox(polygon(siteInfo?.geometry.coordinates));
    }
    highlightSiteInfo = siteInfo?.geometry;
    navigation.navigate('BottomTab', {
      screen: 'Home',
      params: {
        bboxGeo,
        siteInfo: [
          {
            type: 'Feature',
            geometry: highlightSiteInfo,
            properties: {site: siteInfo},
          },
        ],
      },
    });
  };

  const postSite = trpc.site.createSite.useMutation({
    retryDelay: 3000,
    onSuccess: res => {
      queryClient.setQueryData(
        [['site', 'getSites'], {input: ['site', 'getSites'], type: 'query'}],
        oldData =>
          oldData
            ? {
                ...oldData,
                json: {
                  ...oldData.json,
                  data: [...oldData.json.data, res.json.data],
                },
              }
            : null,
      );
      setLoading(false);
      _handleViewMap(res.json.data);
    },
    onError: () => {
      setLoading(false);
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const handleBack = () => navigation.goBack();

  const handleError = (err: unknown) => {
    if (isErrorWithCode(err)) {
      switch (err.code) {
        case errorCodes.OPERATION_CANCELED:
          console.warn('cancelled');
          // User cancelled the picker, exit any dialogs or menus and move on
          break;
        case errorCodes.IN_PROGRESS:
          console.warn(
            'multiple pickers were opened, only the last will be considered',
          );
          break;
        case errorCodes.UNABLE_TO_OPEN_FILE_TYPE:
          console.warn('Unable to open the selected file type');
          // Handle case where file type cannot be opened
          break;
        default:
          console.error('Unknown picker error:', err);
          throw err;
      }
    } else {
      console.error('Non-picker error:', err);
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
    if (siteName.length >= 5) {
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
          radius: siteRad?.value,
        },
      });
    } else {
      modalToast.current.show('Site name must be at least 5 characters long.', {
        type: 'warning',
      });
    }
  };

  const handleUploadFile = async () => {
    console.log('handleUploadFile');
    try {
      const pickerResults = await pick();
      const pickerResult = pickerResults[0];

      const read = await readFile(pickerResult.uri);

      if (fileExtensionExtract(pickerResult?.name) === 'geojson') {
        const geo = JSON.parse(read);
        if (gjv.valid(geo)) {
          if (geo?.features?.length === 1) {
            setValidToUpload(true);
            setFileName(pickerResult?.name);
            setResult(geo);
          } else {
            toast.show('single polygon can be uploaded', {type: 'warning'});
          }
        } else {
          toast.show('file contains wrong Json', {type: 'warning'});
        }
      } else if (fileExtensionExtract(pickerResult?.name) === 'kml') {
        const theKml = new DOMParser().parseFromString(read);
        const converted = kml(theKml);
        if (gjv.valid(converted)) {
          if (converted?.features?.length === 1) {
            setValidToUpload(true);
            setFileName(pickerResult?.name);
            setResult(converted);
          } else {
            toast.show('single polygon can be uploaded', {type: 'warning'});
          }
        } else {
          toast.show('file contains wrong Json', {type: 'warning'});
        }
      } else {
        setValidToUpload(false);
        toast.show('file not supported', {type: 'warning'});
      }
    } catch (e) {
      handleError(e);
    }
  };

  const handleCloseSiteModal = () => setSiteNameModalVisible(false);

  const handleContinue = () => {
    setSiteRad(POINT_RADIUS_ARR[3]);
    if (result?.features[0]?.geometry?.type === 'Polygon') {
      try {
        const polygonCoordinates = rewind(
          result?.features[0].geometry.coordinates,
        );
        const areaInHactares = convertArea(
          area(polygon(polygonCoordinates)),
          'meters',
          'hectares',
        );
        if (areaInHactares > 1000000) {
          return toast.show('The area is exceeds 1 million hectares', {
            type: 'warning',
          });
        }
        setSiteRad(RADIUS_ARR[4]);
      } catch (e) {
        if (
          e?.message ===
          'Each LinearRing of a Polygon must have 4 or more Positions.'
        ) {
          return toast.show('Multi-polygons are not supported', {
            type: 'warning',
          });
        }
      }
    }
    const extractedFileName = fileNameExtract(fileName);
    setSiteGeometry(result?.features[0]?.geometry?.type);
    setSiteName(extractedFileName);
    setSiteNameModalVisible(true);
  };

  return (
    <>
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
                Add <Text style={{color: Colors.DEEP_PRIMARY}}>.geojson</Text>{' '}
                or <Text style={{color: Colors.DEEP_PRIMARY}}>.kml</Text> file
              </Text>
            </TouchableOpacity>
          </View>
          {fileName !== '' && (
            <View style={styles.form}>
              <Text style={styles.label}>File Name</Text>
              <FloatingInput
                isFloat={false}
                value={fileName}
                editable={false}
                inputStyle={styles.input}
                onChangeText={setFileName}
                containerStyle={styles.inputContainer}
              />
            </View>
          )}
        </View>
        <CustomButton
          isLoading={loading}
          title="Continue"
          onPress={handleContinue}
          disabled={!validToUpload}
          titleStyle={styles.title}
          style={styles.btnContinueSiteModal}
        />
      </SafeAreaView>
      <Modal visible={siteNameModalVisible} transparent>
        <KeyboardAvoidingView
          {...(Platform.OS === 'ios' ? {behavior: 'padding'} : {})}
          style={styles.siteModalStyle}>
          <Toast ref={modalToast} offsetBottom={100} duration={2000} />
          <TouchableOpacity
            onPress={handleCloseSiteModal}
            style={styles.crossContainer}>
            <CrossIcon fill={Colors.GRADIENT_PRIMARY} />
          </TouchableOpacity>
          <Text
            style={[
              styles.heading,
              styles.commonPadding,
              styles.marginTop20MarginBottom10,
            ]}>
            Enter Site Name
          </Text>
          <View style={styles.siteModalStyle}>
            <View>
              <FloatingInput
                autoFocus
                isFloat={false}
                value={siteName}
                label={'Site Name'}
                onChangeText={setSiteName}
              />
              <View style={[styles.commonPadding]}>
                <DropDown
                  expandHeight={10}
                  value={siteRad?.value}
                  items={
                    siteGeometry === 'Point' ? POINT_RADIUS_ARR : RADIUS_ARR
                  }
                  onSelectItem={setSiteRad}
                  defaultValue={siteRad?.value}
                  label={'Notify me if fires occur...'}
                />
              </View>
            </View>
            <CustomButton
              title="Upload Site"
              isLoading={loading}
              onPress={addSiteApi}
              titleStyle={styles.title}
              style={styles.btnContinueSiteModal}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

export default UploadPolygon;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: Colors.WHITE,
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
    paddingHorizontal: 16,
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
  label: {
    color: Colors.GRAY_DEEP,
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_BOLD,
  },
  input: {
    color: Colors.GRAY_DEEP,
  },
  inputContainer: {
    width: '100%',
    marginTop: 8,
  },
  btnContinueSiteModal: {
    position: 'absolute',
    bottom: 40,
  },
  title: {
    color: Colors.WHITE,
  },
  siteModalStyle: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  crossContainer: {
    width: 25,
    marginTop: 60,
    marginHorizontal: 16,
  },
  heading: {
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_BOLD,
  },
  crossIcon: {
    width: 30,
    height: 30,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.WHITE,
  },
  marginTop20MarginBottom10: {
    marginTop: 20,
    marginBottom: 10,
  },
});
