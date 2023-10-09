import {
  View,
  Text,
  Alert,
  Modal,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  BackHandler,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native';
import area from '@turf/area';
import bbox from '@turf/bbox';
import MapboxGL from '@rnmapbox/maps';
import {polygon, convertArea} from '@turf/helpers';
import {useQueryClient} from '@tanstack/react-query';
import Geolocation from 'react-native-geolocation-service';
import Toast, {useToast} from 'react-native-toast-notifications';
import React, {useContext, useEffect, useRef, useState} from 'react';

import {
  DropDown,
  AlertModal,
  LayerModal,
  CustomButton,
  FloatingInput,
} from '../../components';
import Map from './mapMarking/map';
import {trpc} from '../../services/trpc';
import {RADIUS_ARR} from '../../constants';
import {useFetchSites} from '../../utils/api';
import {Colors, Typography} from '../../styles';
import {
  PermissionBlockedAlert,
  PermissionDeniedAlert,
} from '../home/permissionAlert/locationPermissionAlerts';
import {locationPermission} from '../../utils/permissions';
import {toLetters} from '../../utils/mapMarkingCoordinate';
import distanceCalculator from '../../utils/distanceCalculator';
import {BottomBarContext} from '../../global/reducers/bottomBar';
import {CrossIcon, LayerIcon, MyLocIcon} from '../../assets/svgs';

const IS_ANDROID = Platform.OS === 'android';
const ZOOM_LEVEL = 15;
const ANIMATION_DURATION = 1000;
const activePolygonIndex: number = 0;

const CreatePolygon = ({navigation}) => {
  const camera = useRef<MapboxGL.Camera | null>(null);
  const {mapInfo} = useContext(BottomBarContext);

  const map = useRef(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const [siteName, setSiteName] = useState<string>('');
  const [siteRad, setSiteRad] = useState<object | null>(RADIUS_ARR[4]);
  const [alphabets, setAlphabets] = useState<string[]>([]);
  const [isCameraRefVisible, setIsCameraRefVisible] = useState<boolean>(false);

  const [siteNameModalVisible, setSiteNameModalVisible] =
    useState<boolean>(false);

  const [isInitial, setIsInitial] = useState<boolean>(true);
  const [enableGetFireAlerts, setEnableGetFireAlerts] =
    useState<boolean>(false);

  const [activeMarkerIndex, setActiveMarkerIndex] = useState<number>(0);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [isPermissionBlocked, setIsPermissionBlocked] =
    useState<boolean>(false);
  const [isLocationAlertShow, setIsLocationAlertShow] =
    useState<boolean>(false);

  const [location, setLocation] = useState<
    MapboxGL.Location | Geolocation.GeoPosition
  >();

  const [geoJSON, setGeoJSON] = useState<any>({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          isPolygonComplete: false,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [],
        },
      },
    ],
  });

  const toast = useToast();
  const modalToast = useRef();
  const queryClient = useQueryClient();
  useFetchSites({enabled: enableGetFireAlerts});

  useEffect(() => {
    if (isCameraRefVisible && camera?.current?.setCamera) {
      setIsInitial(false);
      camera.current.setCamera({
        centerCoordinate: mapInfo?.centerCoordinates,
        zoomLevel: mapInfo?.currZoom,
        animationDuration: 100,
      });
    }
  }, [isCameraRefVisible, mapInfo?.centerCoordinates, mapInfo?.currZoom]);

  const _handleViewMap = (siteInfo: object) => {
    let highlightSiteInfo = siteInfo;
    let bboxGeo = bbox(polygon(siteInfo?.geometry.coordinates));
    highlightSiteInfo = siteInfo?.geometry;

    navigation.navigate('Home', {
      bboxGeo,
      siteInfo: [
        {
          type: 'Feature',
          geometry: highlightSiteInfo,
          properties: {site: siteInfo},
        },
      ],
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
      setEnableGetFireAlerts(true);
      setLoading(false);
      setSiteNameModalVisible(false);
      _handleViewMap(res.json.data);
    },
    onError: () => {
      setLoading(false);
      setSiteNameModalVisible(false);
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  // generates the alphabets
  const generateAlphabets = () => {
    let alphabetsArray: string[] = [];
    for (var x = 1, y; x <= 130; x++) {
      y = toLetters(x);
      alphabetsArray.push(y);
    }
    setAlphabets(alphabetsArray);
  };

  // only for the first time map will follow the user's current location by default
  const onUpdateUserLocation = (
    userLocation: MapboxGL.Location | Geolocation.GeoPosition | undefined,
  ) => {
    if (isInitial && userLocation) {
      onPressMyLocationIcon(userLocation);
    }
  };

  const onPressLocationAlertPrimaryBtn = () => {
    setIsLocationAlertShow(false);
    if (IS_ANDROID) {
      checkPermission();
    } else {
      Linking.openURL('app-settings:');
    }
  };

  const updateCurrentPosition = async (showAlert = true) => {
    return new Promise(resolve => {
      Geolocation.getCurrentPosition(
        position => {
          onUpdateUserLocation(position);
          setLocation(position);
          resolve(position);
        },
        err => {
          console.error(err);
          if (showAlert) {
            setIsLocationAlertShow(true);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          accuracy: {
            android: 'high',
            ios: 'bestForNavigation',
          },
        },
      );
    });
  };

  // recenter the map to the current coordinates of user location
  const onPressMyLocationIcon = (
    position: MapboxGL.Location | Geolocation.GeoPosition,
  ) => {
    if (isCameraRefVisible && camera?.current?.setCamera) {
      setIsInitial(false);
      camera.current.setCamera({
        centerCoordinate: [position.coords.longitude, position.coords.latitude],
        // centerCoordinate: [-90.133284, 18.675638],
        zoomLevel: ZOOM_LEVEL,
        animationDuration: ANIMATION_DURATION,
      });
    }
  };

  const checkPermission = async (showAlert = true) => {
    try {
      await locationPermission();
      // MapboxGL.setTelemetryEnabled(false);

      await updateCurrentPosition(showAlert);
      return true;
    } catch (err: any) {
      if (err?.message === 'blocked') {
        setIsPermissionBlocked(true);
      } else if (err?.message === 'denied') {
        setIsPermissionDenied(true);
      } else {
        console.error(err);
      }
      return false;
    }
  };

  const handleMyLocation = () => {
    if (location) {
      onPressMyLocationIcon(location);
    } else {
      checkPermission();
    }
  };

  const handleLayer = () => setVisible(true);

  const checkIsValidMarker = async (centerCoordinates: number[]) => {
    let isValidMarkers = true;

    for (const oneMarker of geoJSON.features[activePolygonIndex].geometry
      .coordinates) {
      const distanceInMeters = distanceCalculator(
        [centerCoordinates[1], centerCoordinates[0]],
        [oneMarker[1], oneMarker[0]],
        'meters',
      );
      // if the current marker position is less than one meter to already present markers nearby,
      // then makes the current marker position invalid
      if (distanceInMeters < 1) {
        isValidMarkers = false;
      }
    }
    return isValidMarkers;
  };

  const pushMarker = async () => {
    geoJSON.features[0].geometry.coordinates[activeMarkerIndex] =
      await map.current.getCenter();

    setGeoJSON(geoJSON);
    setActiveMarkerIndex(prevState => prevState + 1);
  };

  const addPolygonMarker = async () => {
    let centerCoordinates = await map.current.getCenter();
    let isValidMarkers = await checkIsValidMarker(centerCoordinates);
    if (!isValidMarkers) {
      Alert.alert('Invalid marker location');
      // setShowSecondaryButton(false);
      // setAlertHeading(i18next.t('label.locate_tree_cannot_mark_location'));
      // setAlertSubHeading(i18next.t('label.locate_tree_add_marker_valid'));
      // setShowAlert(true);
    }
    pushMarker();

    // Check distance
  };

  const postPolygon = () => {
    setLoading(true);
    const areaInHactares = convertArea(
      area(polygon([geoJSON.features[0].geometry.coordinates])),
      'meters',
      'hectares',
    );
    if (areaInHactares <= 1000000) {
      const payload = {
        type: 'Polygon',
        name: siteName,
        radius: siteRad?.value,
        geometry: {
          coordinates: [geoJSON.features[0].geometry.coordinates],
          type: 'Polygon',
        },
      };
      postSite.mutate({json: payload});
    } else {
      modalToast.current.show('The area is exceeds 1 million hectares', {
        type: 'warning',
      });
      setLoading(false);
    }
  };

  const addPolygon = () => {
    let geo = geoJSON;
    geo.features[0].properties.isPolygonComplete = true;
    geo.features[0].geometry.coordinates.push(
      geoJSON.features[0].geometry.coordinates[0],
    );
    setGeoJSON(geo);
    setSiteNameModalVisible(true);
  };

  const handleCloseSiteModal = () => setSiteNameModalVisible(false);
  const handleClose = () => navigation.goBack();
  const closeMapLayer = () => setVisible(false);
  const handleSiteModalContinue = () => {
    if (siteName !== '') {
      postPolygon();
    }
  };

  const onPressPerBlockedAlertPrimaryBtn = () =>
    onPressLocationAlertPrimaryBtn();
  const onPressPerBlockedAlertSecondaryBtn = () => {
    BackHandler.exitApp();
  };

  const onPressPerDeniedAlertPrimaryBtn = () => checkPermission();
  const onPressPerDeniedAlertSecondaryBtn = () => checkPermission();

  const onPressLocationAlertSecondaryBtn = () => setIsLocationAlertShow(false);

  useEffect(() => {
    const watchId = Geolocation.watchPosition(
      position => {
        // onUpdateUserLocation(position);
        setLocation(position);
      },
      err => {
        console.log(err);
      },
      {
        enableHighAccuracy: true,
        accuracy: {
          android: 'high',
          ios: 'bestForNavigation',
        },
        interval: 1000,
      },
    );
    return () => {
      Geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    if (geoJSON.features[0].geometry.coordinates.length <= 2) {
      geoJSON.features[0].geometry.type = 'LineString';
    }
  }, [geoJSON]);

  useEffect(() => {
    generateAlphabets();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar
        animated
        translucent
        barStyle={siteNameModalVisible ? 'dark-content' : 'light-content'}
        backgroundColor={
          siteNameModalVisible ? Colors.WHITE : Colors.TRANSPARENT
        }
      />
      <Map
        map={map}
        camera={camera}
        geoJSON={geoJSON}
        location={location}
        setLocation={setLocation}
        activePolygonIndex={activePolygonIndex}
        markerText={alphabets[activeMarkerIndex]}
        setIsCameraRefVisible={setIsCameraRefVisible}
      />
      <LayerModal visible={visible} onRequestClose={closeMapLayer} />
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.crossIcon}
          onPress={handleClose}>
          <CrossIcon width={15} height={15} fill={'#4D5153'} />
        </TouchableOpacity>
      </View>
      {geoJSON.features[0].geometry.coordinates.length <= 2 ? (
        <CustomButton
          title="Continue"
          style={styles.btnContinue}
          onPress={addPolygonMarker}
          titleStyle={styles.title}
        />
      ) : (
        <View style={styles.btnContainer}>
          <CustomButton
            title="Complete"
            style={[styles.btn, styles.btnComplete]}
            onPress={addPolygon}
            titleStyle={styles.titleBtnComplete}
          />
          <CustomButton
            title="Continue"
            style={styles.btn}
            onPress={addPolygonMarker}
            titleStyle={styles.title}
          />
        </View>
      )}
      <AlertModal
        visible={isLocationAlertShow}
        heading={'Location Service'}
        message={
          'Location settings are not satisfied. Please make sure you have given location permission to the app and turned on GPS'
        }
        primaryBtnText={IS_ANDROID ? 'Ok' : 'Open Settings'}
        secondaryBtnText={'Back'}
        onPressPrimaryBtn={onPressLocationAlertPrimaryBtn}
        onPressSecondaryBtn={onPressLocationAlertSecondaryBtn}
        showSecondaryButton={true}
      />
      <PermissionBlockedAlert
        isPermissionBlockedAlertShow={isPermissionBlocked}
        setIsPermissionBlockedAlertShow={setIsPermissionBlocked}
        message={'You need to give location permission to continue.'}
        onPressPrimaryBtn={onPressPerBlockedAlertPrimaryBtn}
        onPressSecondaryBtn={onPressPerBlockedAlertSecondaryBtn}
      />
      <PermissionDeniedAlert
        isPermissionDeniedAlertShow={isPermissionDenied}
        setIsPermissionDeniedAlertShow={setIsPermissionDenied}
        message={'You need to give location permission to continue.'}
        onPressPrimaryBtn={onPressPerDeniedAlertPrimaryBtn}
        onPressSecondaryBtn={onPressPerDeniedAlertSecondaryBtn}
      />
      <TouchableOpacity
        onPress={handleLayer}
        style={styles.layerIcon}
        accessibilityLabel="layer"
        accessible={true}
        testID="layer">
        <LayerIcon width={45} height={45} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleMyLocation}
        style={styles.myLocationIcon}
        accessibilityLabel="my_location"
        accessible={true}
        testID="my_location">
        <MyLocIcon width={45} height={45} />
      </TouchableOpacity>
      <Modal visible={siteNameModalVisible} transparent>
        <KeyboardAvoidingView
          {...(Platform.OS === 'ios' ? {behavior: 'padding'} : {})}
          style={styles.siteModalStyle}>
          <Toast ref={modalToast} offsetBottom={100} duration={1000} />
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
          <View
            style={[styles.siteModalStyle, styles.justifyContentSpaceBetween]}>
            <View>
              <FloatingInput
                autoFocus
                isFloat={false}
                label={'Site Name'}
                onChangeText={setSiteName}
              />
              <View style={[styles.commonPadding]}>
                <DropDown
                  expandHeight={10}
                  items={RADIUS_ARR}
                  value={siteRad?.value}
                  onSelectItem={setSiteRad}
                  defaultValue={siteRad?.value}
                  label={'Notify me if fires occur...'}
                />
              </View>
            </View>
            <CustomButton
              title="Continue"
              isLoading={loading}
              onPress={handleSiteModalContinue}
              style={styles.btnContinueSiteModal}
              titleStyle={styles.title}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default CreatePolygon;

const styles = StyleSheet.create({
  justifyContentSpaceBetween: {
    justifyContent: 'space-between',
  },
  marginTop20MarginBottom10: {
    marginTop: 20,
    marginBottom: 10,
  },
  container: {
    flex: 1,
  },
  addSpecies: {
    color: Colors.ALERT,
    fontSize: Typography.FONT_SIZE_18,
    lineHeight: Typography.LINE_HEIGHT_30,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  header: {
    top: 50,
    width: 336,
    alignSelf: 'center',
    position: 'absolute',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  btn: {
    width: 160,
  },
  btnContainer: {
    width: 336,
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    position: 'absolute',
    justifyContent: 'space-between',
  },
  btnContinue: {
    position: 'absolute',
    bottom: 24,
    width: 336,
  },
  btnComplete: {
    borderWidth: 1,
    borderColor: Colors.PRIMARY,
    backgroundColor: Colors.WHITE,
  },
  titleBtnComplete: {
    color: Colors.PRIMARY,
  },
  title: {
    color: Colors.WHITE,
  },
  layerIcon: {
    right: 16,
    borderRadius: 100,
    alignItems: 'center',
    position: 'absolute',
    justifyContent: 'center',
    top: IS_ANDROID ? 122 : 138,
    backgroundColor: Colors.WHITE,
  },
  myLocationIcon: {
    right: 16,
    // width: 54,
    // height: 54,
    borderRadius: 100,
    alignItems: 'center',
    position: 'absolute',
    justifyContent: 'center',
    bottom: IS_ANDROID ? 102 : 112,
    backgroundColor: Colors.WHITE,
  },
  siteModalStyle: {
    flex: 1,
    backgroundColor: Colors.WHITE,
    justifyContent: 'center',
  },
  btnContinueSiteModal: {
    position: 'absolute',
    bottom: 40,
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
  commonPadding: {
    paddingHorizontal: 16,
  },
  crossIcon: {
    width: 30,
    height: 30,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.WHITE,
  },
});
