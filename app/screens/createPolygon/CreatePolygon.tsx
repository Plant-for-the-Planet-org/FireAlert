import {
  View,
  Text,
  Alert,
  Modal,
  Linking,
  Platform,
  StyleSheet,
  BackHandler,
  TouchableOpacity,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import React, {useEffect, useRef, useState} from 'react';
import Geolocation from 'react-native-geolocation-service';

import {
  AlertModal,
  LayerModal,
  CustomButton,
  FloatingInput,
} from '../../components';
import {
  CrossIcon,
  LayerIcon,
  MyLocIcon,
  SatelliteDish,
} from '../../assets/svgs';
import Map from '../MapMarking/Map';
import {Colors, Typography} from '../../styles';
import {locationPermission} from '../../utils/permissions';
import {
  PermissionBlockedAlert,
  PermissionDeniedAlert,
} from '../home/permissionAlert/LocationPermissionAlerts';
import {toLetters} from '../../utils/mapMarkingCoordinate';
import {getAccuracyColors} from '../../utils/accuracyColors';
import distanceCalculator from '../../utils/distanceCalculator';

const IS_ANDROID = Platform.OS === 'android';
const ZOOM_LEVEL = 15;
const ANIMATION_DURATION = 1000;

const CreatePolygon = ({navigation}) => {
  const camera = useRef<MapboxGL.Camera | null>(null);

  const map = useRef(null);
  const [loader, setLoader] = useState(false);
  const [visible, setVisible] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [alphabets, setAlphabets] = useState<string[]>([]);
  const [isCameraRefVisible, setIsCameraRefVisible] = useState(false);
  const [activePolygonIndex, setActivePolygonIndex] = useState(0);
  const [accuracyInMeters, setAccuracyInMeters] = useState(0);
  const [siteNameModalVisible, setSiteNameModalVisible] = useState(false);

  const [isInitial, setIsInitial] = useState(true);

  const [activeMarkerIndex, setActiveMarkerIndex] = useState(0);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [isPermissionBlocked, setIsPermissionBlocked] = useState(false);
  const [isLocationAlertShow, setIsLocationAlertShow] = useState(false);
  const [isAccuracyModalShow, setIsAccuracyModalShow] = useState(false);

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
      updateCurrentPosition();
    } else {
      Linking.openURL('app-settings:');
    }
  };

  const updateCurrentPosition = async (showAlert = true) => {
    return new Promise(resolve => {
      Geolocation.getCurrentPosition(
        position => {
          setAccuracyInMeters(position.coords.accuracy);
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
      MapboxGL.setTelemetryEnabled(false);

      updateCurrentPosition(showAlert);
      return true;
    } catch (err: any) {
      if (err?.message == 'blocked') {
        setIsPermissionBlocked(true);
      } else if (err?.message == 'denied') {
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

  const addPolygonMarker = async (forceContinue = false) => {
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

  const addPolygon = () => {
    let geo = geoJSON;
    geo.features[0].geometry.coordinates.push(
      geoJSON.features[0].geometry.coordinates[0],
    );
    setGeoJSON(geo);
    setSiteNameModalVisible(true);
  };

  //small button on top right corner which will show accuracy in meters and the respective colour
  const renderAccuracyInfo = () => {
    return (
      <TouchableOpacity
        style={[
          styles.gpsContainer,
          {backgroundColor: getAccuracyColors(accuracyInMeters) + '20'},
        ]}
        onPress={() => setIsAccuracyModalShow(true)}>
        <SatelliteDish fill={getAccuracyColors(accuracyInMeters)} />
        <Text style={styles.gpsText}>
          GPS ~{Math.round(accuracyInMeters * 100) / 100}m
        </Text>
      </TouchableOpacity>
    );
  };

  //this modal shows the information about GPS accuracy and accuracy range for red, yellow and green colour
  const renderAccuracyModal = () => {
    return (
      <Modal transparent visible={isAccuracyModalShow}>
        <View style={styles.modalContainer}>
          <View style={styles.contentContainer}>
            <Text
              style={{
                color: '#000000',
                fontFamily: Typography.FONT_FAMILY_BOLD,
                fontSize: Typography.FONT_SIZE_18,
                paddingBottom: 18,
              }}>
              GPS Accuracy
            </Text>
            <Text style={[styles.accuracyModalText, {marginBottom: 16}]}>
              {`To improve your GPS Accuracy :\n1. Make sure you are outside.\n2. Walk around a little bit.\n\nFireAlert only works properly when thelocation is accurate to 30 meter.`}
            </Text>
            <Text style={styles.accuracyModalText}>
              <Text
                style={{
                  color: '#87B738',
                  fontFamily: Typography.FONT_FAMILY_BOLD,
                }}>
                Green
              </Text>{' '}
              = Accurate up to 10 meter.
            </Text>
            <Text style={styles.accuracyModalText}>
              <Text
                style={{
                  color: '#CBBB03',
                  fontFamily: Typography.FONT_FAMILY_BOLD,
                }}>
                Yellow
              </Text>{' '}
              = Accurate up to 30 meter.
            </Text>
            <Text style={styles.accuracyModalText}>
              <Text
                style={{
                  color: '#FF0000',
                  fontFamily: Typography.FONT_FAMILY_BOLD,
                }}>
                Red
              </Text>{' '}
              = Greater than 30 meter.
            </Text>
            <TouchableOpacity
              style={{
                alignSelf: 'center',
                paddingTop: 25,
              }}>
              <Text
                style={{
                  color: '#87B738',
                  fontFamily: Typography.FONT_FAMILY_REGULAR,
                  fontSize: Typography.FONT_SIZE_14,
                }}
                onPress={() => setIsAccuracyModalShow(false)}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const handleClose = () => navigation.goBack();
  const closeMapLayer = () => setVisible(false);

  const onPressPerBlockedAlertPrimaryBtn = () => {};
  const onPressPerBlockedAlertSecondaryBtn = () => {
    BackHandler.exitApp();
  };

  const onPressPerDeniedAlertPrimaryBtn = () => checkPermission();
  const onPressPerDeniedAlertSecondaryBtn = () => checkPermission();

  const onPressLocationAlertSecondaryBtn = () => setIsLocationAlertShow(false);

  useEffect(() => {
    const watchId = Geolocation.watchPosition(
      position => {
        setAccuracyInMeters(position.coords.accuracy);
        onUpdateUserLocation(position);
        setLocation(position);
      },
      err => {
        setIsLocationAlertShow(true);
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
    onUpdateUserLocation(location);
  }, [isCameraRefVisible, location]);

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
      <Map
        map={map}
        camera={camera}
        loader={loader}
        geoJSON={geoJSON}
        location={location}
        setLoader={setLoader}
        markerText={alphabets[activeMarkerIndex]}
        setLocation={setLocation}
        activePolygonIndex={activePolygonIndex}
        setIsCameraRefVisible={setIsCameraRefVisible}
      />
      <LayerModal visible={visible} onRequestClose={closeMapLayer} />
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose}>
          <CrossIcon fill={'#4D5153'} />
        </TouchableOpacity>
        {renderAccuracyInfo()}
      </View>
      {renderAccuracyModal()}
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
        <LayerIcon width={20} height={20} fill={Colors.TEXT_COLOR} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleMyLocation}
        style={styles.myLocationIcon}
        accessibilityLabel="my_location"
        accessible={true}
        testID="my_location">
        <MyLocIcon />
      </TouchableOpacity>
      <Modal visible={siteNameModalVisible} transparent>
        <View style={styles.siteModalStyle}>
          <FloatingInput label={'Site Name'} onChangeText={setSiteName} />
          <CustomButton
            title="Continue"
            onPress={() => setSiteNameModalVisible(false)}
            style={styles.btnContinueSiteModal}
            titleStyle={styles.title}
          />
        </View>
      </Modal>
    </View>
  );
};

export default CreatePolygon;

const styles = StyleSheet.create({
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
    top: 43,
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
    right: 32,
    width: 45,
    height: 45,
    borderWidth: 1,
    borderRadius: 100,
    alignItems: 'center',
    position: 'absolute',
    justifyContent: 'center',
    top: IS_ANDROID ? 92 : 112,
    backgroundColor: Colors.WHITE,
    borderColor: Colors.GRAY_LIGHT,
  },
  myLocationIcon: {
    right: 32,
    width: 45,
    height: 45,
    borderWidth: 1,
    borderRadius: 100,
    alignItems: 'center',
    position: 'absolute',
    justifyContent: 'center',
    bottom: IS_ANDROID ? 92 : 112,
    backgroundColor: Colors.WHITE,
    borderColor: Colors.GRAY_LIGHT,
  },
  gpsContainer: {
    height: 44,
    width: 122,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    backgroundColor: '#FFC40080',
  },
  gpsText: {
    color: '#6F7173',
    fontFamily: Typography.FONT_FAMILY_BOLD,
    fontWeight: Typography.FONT_WEIGHT_REGULAR,
    fontSize: Typography.FONT_SIZE_12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  contentContainer: {
    backgroundColor: Colors.WHITE,
    width: 300,
    justifyContent: 'center',
    alignItems: 'flex-start',
    borderRadius: 10,
    paddingLeft: 25,
    paddingRight: 15,
    paddingVertical: 25,
  },
  accuracyModalText: {
    color: '#000000',
    lineHeight: Typography.LINE_HEIGHT_20,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_14,
  },
  siteModalStyle: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: Colors.WHITE,
  },
  btnContinueSiteModal: {
    marginTop: 18,
  },
});
