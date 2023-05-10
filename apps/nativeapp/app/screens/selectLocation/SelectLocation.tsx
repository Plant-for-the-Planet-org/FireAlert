import {
  View,
  Text,
  Modal,
  Linking,
  Platform,
  StyleSheet,
  Dimensions,
  BackHandler,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import {SvgXml} from 'react-native-svg';
import React, {useEffect, useRef, useState} from 'react';
import {useToast} from 'react-native-toast-notifications';
import Geolocation from 'react-native-geolocation-service';

import {
  CrossIcon,
  LayerIcon,
  MyLocIcon,
  active_marker,
  SatelliteDish,
} from '../../assets/svgs';
import {
  PermissionDeniedAlert,
  PermissionBlockedAlert,
} from '../home/permissionAlert/locationPermissionAlerts';

import {
  AlertModal,
  LayerModal,
  CustomButton,
  FloatingInput,
} from '../../components';
import {trpc} from '../../services/trpc';
import {Colors, Typography} from '../../styles';
import {locationPermission} from '../../utils/permissions';
import {getAccuracyColors} from '../../utils/accuracyColors';
import {MapLayerContext, useMapLayers} from '../../global/reducers/mapLayers';

const IS_ANDROID = Platform.OS === 'android';
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

let attributionPosition: any = {
  bottom: IS_ANDROID ? 72 : 56,
  left: 8,
};

let compassViewMargins = {
  x: IS_ANDROID ? 12 : 16,
  y: IS_ANDROID ? 160 : 120,
};

const compassViewPosition = 3;

const ZOOM_LEVEL = 15;
const ANIMATION_DURATION = 1000;

const SelectLocation = ({navigation}) => {
  const {state} = useMapLayers(MapLayerContext);
  const [loader, setLoader] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isInitial, setIsInitial] = useState(true);
  const [accuracyInMeters, setAccuracyInMeters] = useState(0);
  const [isCameraRefVisible, setIsCameraRefVisible] = useState(false);

  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [isPermissionBlocked, setIsPermissionBlocked] = useState(false);
  const [isLocationAlertShow, setIsLocationAlertShow] = useState(false);
  const [isAccuracyModalShow, setIsAccuracyModalShow] = useState(false);

  const [siteName, setSiteName] = useState('');
  const [loading, setLoading] = useState(false);
  const [siteNameModalVisible, setSiteNameModalVisible] = useState(false);

  const [location, setLocation] = useState<
    MapboxGL.Location | Geolocation.GeoPosition
  >();

  const map = useRef(null);
  const camera = useRef<MapboxGL.Camera | null>(null);

  const toast = useToast();

  const postSite = trpc.site.createSite.useMutation({
    retryDelay: 3000,
    onSuccess: () => {
      setLoading(false);
      setSiteNameModalVisible(false);
      navigation.navigate('Home');
    },
    onError: () => {
      setLoading(false);
      setSiteNameModalVisible(false);
      toast.show('something went wrong', {type: 'danger'});
    },
  });

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

  const checkPermission = async (showAlert = true) => {
    try {
      await locationPermission();
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

  // only for the first time map will follow the user's current location by default
  const onUpdateUserLocation = (
    userLocation: MapboxGL.Location | Geolocation.GeoPosition | undefined,
  ) => {
    if (isInitial && userLocation) {
      onPressMyLocationIcon(userLocation);
    }
  };

  const onSelectLocation = async () => {
    setLoading(true);
    let centerCoordinates = await map.current.getCenter();
    const geometry = {
      type: 'Point',
      coordinates: centerCoordinates,
    };
    postSite.mutate({
      json: {
        geometry,
        type: 'Point',
        name: siteName,
      },
    });
  };

  //small button on top right corner which will show accuracy in meters and the respective colour
  const renderAccuracyInfo = () => {
    return (
      <TouchableOpacity
        style={[
          styles.gpsContainer,
          {backgroundColor: getAccuracyColors(accuracyInMeters) + '80'},
        ]}
        onPress={() => setIsAccuracyModalShow(true)}>
        <SatelliteDish fill={Colors.TEXT_COLOR} />
        <Text style={styles.gpsText}>
          GPS ~{Math.round(accuracyInMeters * 100) / 100}m
        </Text>
      </TouchableOpacity>
    );
  };

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

  const handleMyLocation = () => {
    if (location) {
      onPressMyLocationIcon(location);
    } else {
      checkPermission();
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

  const onChangeRegionStart = () => setLoader(true);
  const onChangeRegionComplete = () => {
    setLoader(false);
  };

  const handleSiteModalContinue = () => {
    if (siteName !== '') {
      onSelectLocation();
    }
  };
  const handleCloseSiteModal = () => setSiteNameModalVisible(false);

  const handleLayer = () => setVisible(true);
  const handleClose = () => navigation.goBack();
  const closeMapLayer = () => setVisible(false);
  const handleContinue = () => setSiteNameModalVisible(true);

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

  return (
    <>
      <MapboxGL.MapView
        ref={map}
        style={styles.map}
        logoEnabled={false}
        scaleBarEnabled={false}
        styleURL={MapboxGL.StyleURL[state]}
        compassViewMargins={compassViewMargins}
        compassViewPosition={compassViewPosition}
        onCameraChanged={onChangeRegionStart}
        onMapIdle={onChangeRegionComplete}
        attributionPosition={attributionPosition}>
        <MapboxGL.Camera
          ref={el => {
            camera.current = el;
            setIsCameraRefVisible(!!el);
          }}
        />
        {location && (
          <MapboxGL.UserLocation
            showsUserHeadingIndicator
            onUpdate={data => setLocation(data)}
          />
        )}
        <View style={styles.fakeMarkerCont}>
          <SvgXml xml={active_marker} style={styles.markerImage} />
          {loader && (
            <ActivityIndicator color={Colors.WHITE} style={styles.loader} />
          )}
        </View>
      </MapboxGL.MapView>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose}>
          <CrossIcon fill={'#4D5153'} />
        </TouchableOpacity>
        {renderAccuracyInfo()}
      </View>
      {renderAccuracyModal()}
      <LayerModal visible={visible} onRequestClose={closeMapLayer} />
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
      <CustomButton
        title="Select Location"
        style={styles.btnContinue}
        onPress={handleContinue}
        titleStyle={styles.title}
      />
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
      <Modal visible={siteNameModalVisible} transparent>
        <KeyboardAvoidingView
          {...(Platform.OS === 'ios' ? {behavior: 'padding'} : {})}
          style={styles.siteModalStyle}>
          <TouchableOpacity
            onPress={handleCloseSiteModal}
            style={styles.crossContainer}>
            <CrossIcon fill={Colors.GRADIENT_PRIMARY} />
          </TouchableOpacity>
          <Text style={[styles.heading, styles.commonPadding]}>
            Enter Site Name
          </Text>
          <View
            style={[styles.siteModalStyle, {justifyContent: 'space-between'}]}>
            <FloatingInput
              autoFocus
              isFloat={false}
              label={'Site Name'}
              onChangeText={setSiteName}
            />
            <CustomButton
              title="Continue"
              isLoading={loading}
              titleStyle={styles.title}
              onPress={handleSiteModalContinue}
              style={styles.btnContinueSiteModal}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

export default SelectLocation;

const styles = StyleSheet.create({
  safeAreaView: {
    backgroundColor: '#000',
  },
  map: {
    flex: 1,
  },
  myLocationIcon: {
    right: 16,
    width: 45,
    height: 45,
    borderWidth: 1,
    borderRadius: 100,
    alignItems: 'center',
    position: 'absolute',
    justifyContent: 'center',
    bottom: IS_ANDROID ? 72 : 92,
    backgroundColor: Colors.WHITE,
    borderColor: Colors.GRAY_LIGHT,
  },
  layerIcon: {
    right: 16,
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
  fakeMarkerCont: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerImage: {
    position: 'absolute',
    resizeMode: 'contain',
    bottom: 0,
  },
  loader: {
    position: 'absolute',
    bottom: 67,
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
  btnContinue: {
    position: 'absolute',
    bottom: 24,
    width: 336,
  },
  title: {
    color: Colors.WHITE,
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
    marginHorizontal: 40,
  },
  heading: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: Typography.FONT_SIZE_24,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
  },
  commonPadding: {
    paddingHorizontal: 40,
  },
});
