import {
  Text,
  View,
  Modal,
  Image,
  Linking,
  Platform,
  StatusBar,
  Dimensions,
  StyleSheet,
  BackHandler,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native';
import moment from 'moment';
import MapboxGL from '@rnmapbox/maps';
import {SvgXml} from 'react-native-svg';
import Config from 'react-native-config';
import Auth0, {useAuth0} from 'react-native-auth0';
import React, {useEffect, useRef, useState} from 'react';
import Geolocation from 'react-native-geolocation-service';

import {
  LayerModal,
  AlertModal,
  BottomSheet,
  CustomButton,
  FloatingInput,
} from '../../components';
import {
  LayerIcon,
  MyLocIcon,
  RadarIcon,
  CrossIcon,
  LogoutIcon,
  PencilIcon,
  active_marker,
  SatelliteIcon,
  MapOutlineIcon,
  LocationPinIcon,
} from '../../assets/svgs';
import {
  editUserProfile,
  getUserDetails,
  updateIsLoggedIn,
} from '../../redux/slices/login/loginSlice';
import {
  PermissionDeniedAlert,
  PermissionBlockedAlert,
} from './permissionAlert/LocationPermissionAlerts';

import {WEB_URLS} from '../../constants';
import {Colors, Typography} from '../../styles';
import {clearAll} from '../../utils/localStorage';
import handleLink from '../../utils/browserLinking';
import {locationPermission} from '../../utils/permissions';
import {useAppDispatch, useAppSelector} from '../../hooks';
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

const Home = ({navigation}) => {
  const {clearCredentials} = useAuth0();
  const {state} = useMapLayers(MapLayerContext);
  const {userDetails} = useAppSelector(state => state.loginSlice);
  const {sites} = useAppSelector(state => state.siteSlice);
  const {alerts} = useAppSelector(state => state.alertSlice);

  const [isInitial, setIsInitial] = useState(true);
  const [isCameraRefVisible, setIsCameraRefVisible] = useState(false);

  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [isPermissionBlocked, setIsPermissionBlocked] = useState(false);
  const [isLocationAlertShow, setIsLocationAlertShow] = useState(false);

  const [visible, setVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const [profileName, setProfileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileEditModal, setProfileEditModal] = useState(false);

  const [location, setLocation] = useState<
    MapboxGL.Location | Geolocation.GeoPosition
  >();

  const [selectedAlert, setSelectedAlert] = useState({});

  const dispatch = useAppDispatch();
  const map = useRef(null);
  const camera = useRef<MapboxGL.Camera | null>(null);

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

  const onPressLocationAlertPrimaryBtn = () => {
    setIsLocationAlertShow(false);
    if (IS_ANDROID) {
      updateCurrentPosition();
    } else {
      Linking.openURL('app-settings:');
    }
  };

  const onPressLocationAlertSecondaryBtn = () => setIsLocationAlertShow(false);

  //getting current position of the user with high accuracy
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

  const checkPermission = async (showAlert = true) => {
    try {
      await locationPermission();
      // MapboxGL.setTelemetryEnabled(false);

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

  const handleUser = () => {
    setProfileModalVisible(true);
  };

  const handleLogout = () => {
    try {
      setProfileModalVisible(false);
      const auth0 = new Auth0({
        domain: Config.AUTH0_DOMAIN,
        clientId: Config.AUTH0_CLIENT_ID,
      });
      auth0.webAuth.clearSession().then(async () => {
        dispatch(updateIsLoggedIn(false));
        await clearAll();
        await clearCredentials();
      });
    } catch (e) {
      console.log('Log out cancelled');
    }
  };

  const handleEditProfileName = () => {
    setLoading(true);
    const payload = {
      name: profileName,
      guid: userDetails?.guid,
    };
    const request = {
      payload,
      onSuccess: () => {
        setLoading(false);
        setProfileEditModal(false);
        const req = {
          onSuccess: () => {},
          onFail: () => {},
        };
        setTimeout(() => dispatch(getUserDetails(req)), 500);
      },
      onFail: () => {
        setLoading(false);
        setProfileEditModal(false);
      },
    };
    dispatch(editUserProfile(request));
  };

  const handlePencil = () => {
    setProfileName(userDetails?.name);
    setProfileModalVisible(false);
    setTimeout(() => setProfileEditModal(true), 500);
  };

  const handleOpenPlatform = () => handleLink(WEB_URLS.PP_ECO);

  const handleGoogleRedirect = () => {
    const lat = Number.parseFloat(selectedAlert?.latitude);
    const lng = Number.parseFloat(selectedAlert?.longitude);
    handleLink(`https://maps.google.com/?q=${lat},${lng}`);
  };

  const handleLayer = () => setVisible(true);
  const closeMapLayer = () => setVisible(false);

  const onPressPerBlockedAlertPrimaryBtn = () => {};
  const onPressPerBlockedAlertSecondaryBtn = () => {
    BackHandler.exitApp();
  };

  const onPressPerDeniedAlertPrimaryBtn = () => checkPermission();
  const onPressPerDeniedAlertSecondaryBtn = () => checkPermission();

  const onListPress = () => navigation.navigate('Settings');
  const onMapPress = () => {};

  const handleCloseProfileModal = () => setProfileEditModal(false);

  const renderAnnotation = counter => {
    const id = alerts[counter]?.guid;
    const coordinate = [alerts[counter]?.latitude, alerts[counter]?.longitude];
    const title = `Longitude: ${alerts[counter]?.latitude} Latitude: ${alerts[counter]?.longitude}`;
    return (
      <MapboxGL.PointAnnotation
        id={'alert_fire'}
        key={id}
        title={title}
        onSelected={e => {
          setSelectedAlert(alerts[counter]), console.log(e);
        }}
        coordinate={coordinate}>
        <View
          style={[
            {
              backgroundColor:
                Colors.GRADIENT_PRIMARY + `${alerts[counter]?.confidence}`,
            },
            styles.alertSpot,
          ]}
        />
      </MapboxGL.PointAnnotation>
    );
  };

  const renderSelectedPoint = counter => {
    const id = sites?.point[counter]?.guid;
    const coordinate = JSON.parse(sites?.point[counter]?.geometry)?.coordinates;
    const title = `Longitude: ${coordinate[0]} Latitude: ${coordinate[1]}`;
    return (
      <MapboxGL.PointAnnotation
        id={id}
        key={id}
        title={title}
        // onSelected={e => {
        //   setSelectedAlert(sites?.point[counter]), console.log(e);
        // }}
        coordinate={coordinate}>
        <SvgXml xml={active_marker} style={styles.markerImage} />
      </MapboxGL.PointAnnotation>
    );
  };

  const renderAnnotations = isAlert => {
    const items = [];
    const arr = isAlert ? alerts : sites?.point;

    for (let i = 0; i < arr?.length; i++) {
      {
        isAlert
          ? items.push(renderAnnotation(i))
          : items.push(renderSelectedPoint(i));
      }
    }

    return items;
  };

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
        {Object.keys(selectedAlert).length ? (
          <MapboxGL.PointAnnotation
            title={'title'}
            coordinate={[selectedAlert?.latitude, selectedAlert?.longitude]}>
            <View
              style={[
                styles.alertSpot,
                {borderWidth: 2, borderColor: Colors.BLACK},
              ]}
            />
          </MapboxGL.PointAnnotation>
        ) : null}
        {renderAnnotations(true)}
        {renderAnnotations(false)}
        <MapboxGL.ShapeSource
          id={'polygon'}
          shape={{
            type: 'FeatureCollection',
            features:
              sites?.polygon?.map((singleSite, i) => {
                return {
                  type: 'Feature',
                  properties: {id: singleSite?.guid},
                  geometry: JSON.parse(singleSite?.geometry),
                };
              }) || [],
          }}
          onPress={e => {
            console.log(e);
          }}>
          <MapboxGL.FillLayer
            id={'polyFill'}
            style={{
              fillColor: Colors.WHITE,
              fillOpacity: 0.6,
            }}
          />
          <MapboxGL.LineLayer
            id={'polyline'}
            style={{
              lineWidth: 2,
              lineColor: Colors.WHITE,
              lineOpacity: 1,
              lineJoin: 'bevel',
            }}
          />
        </MapboxGL.ShapeSource>
      </MapboxGL.MapView>
      <StatusBar translucent backgroundColor={Colors.TRANSPARENT} />
      <LayerModal visible={visible} onRequestClose={closeMapLayer} />
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
        onPress={handleUser}
        style={[styles.layerIcon, styles.avatarContainer]}
        accessibilityLabel="layer"
        accessible={true}
        testID="layer">
        <Image
          source={{uri: userDetails?.avatar || userDetails?.picture}}
          style={styles.userAvatar}
        />
      </TouchableOpacity>
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
      {/* profile modal */}
      <BottomSheet
        isVisible={profileModalVisible}
        onBackdropPress={() => setProfileModalVisible(false)}>
        <View style={[styles.modalContainer, styles.commonPadding]}>
          <View style={styles.modalHeader} />
          <View style={styles.siteTitleCon}>
            <Text style={styles.siteTitle}>
              {userDetails?.name || 'Anonymous Firefighter'}
            </Text>
            <TouchableOpacity onPress={handlePencil}>
              <PencilIcon />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleOpenPlatform} style={styles.btn}>
            <MapOutlineIcon />
            <Text style={styles.siteActionText}>Open Platform</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.btn}>
            <LogoutIcon />
            <Text style={styles.siteActionText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
      {/* fire alert info modal */}
      <BottomSheet
        onBackdropPress={() => setSelectedAlert({})}
        isVisible={Object.keys(selectedAlert).length > 0}>
        <View style={[styles.modalContainer, styles.commonPadding]}>
          <View style={styles.modalHeader} />
          <View style={styles.satelliteInfoCon}>
            <View style={styles.satelliteIcon}>
              <SatelliteIcon />
            </View>
            <View style={styles.satelliteInfo}>
              <Text style={styles.satelliteText}>
                DETECTED BY {selectedAlert?.detectedBy}
              </Text>
              <Text style={styles.eventDate}>
                <Text style={styles.eventFromNow}>
                  {moment(selectedAlert?.eventDate, 'MM/DD/YYYY').fromNow()}
                </Text>{' '}
                (
                {moment(selectedAlert?.eventDate, 'MM/DD/YYYY').format(
                  'DD MMM YYYY',
                )}
                )
              </Text>
              <Text style={styles.confidence}>
                {selectedAlert?.confidence}% alert confidence
              </Text>
            </View>
          </View>
          <View style={styles.satelliteInfoCon}>
            <View style={styles.satelliteIcon}>
              <LocationPinIcon />
            </View>
            <View style={styles.satelliteInfo}>
              <Text style={styles.satelliteText}>LOCATION</Text>
              <Text style={styles.eventDate}>
                {Number.parseFloat(selectedAlert?.latitude).toFixed(5)},{' '}
                {Number.parseFloat(selectedAlert?.longitude).toFixed(5)}
              </Text>
              <Text style={styles.confidence}>
                {selectedAlert?.confidence}% alert confidence
              </Text>
            </View>
          </View>
          <View style={styles.satelliteInfoCon}>
            <View style={styles.satelliteIcon}>
              <RadarIcon />
            </View>
            <View style={styles.satelliteInfo}>
              <Text style={styles.eventDate}>
                Search for the fire within a 1km radius around the location.
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleGoogleRedirect} style={styles.btn}>
            <Text style={[styles.siteActionText, {marginLeft: 0}]}>
              Open in Google Maps
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
      {/* profile edit modal */}
      <Modal visible={profileEditModal} animationType={'slide'} transparent>
        <KeyboardAvoidingView
          {...(Platform.OS === 'ios' ? {behavior: 'padding'} : {})}
          style={styles.siteModalStyle}>
          <TouchableOpacity
            onPress={handleCloseProfileModal}
            style={styles.crossContainer}>
            <CrossIcon fill={Colors.GRADIENT_PRIMARY} />
          </TouchableOpacity>
          <Text style={[styles.heading, {paddingHorizontal: 40}]}>
            Edit Your Name
          </Text>
          <View
            style={[styles.siteModalStyle, {justifyContent: 'space-between'}]}>
            <FloatingInput
              autoFocus
              isFloat={false}
              value={profileName}
              onChangeText={setProfileName}
            />
            <CustomButton
              title="Continue"
              isLoading={loading}
              titleStyle={styles.title}
              onPress={handleEditProfileName}
              style={styles.btnContinueSiteModal}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

export default Home;

const styles = StyleSheet.create({
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
    top: IS_ANDROID ? 152 : 152,
    backgroundColor: Colors.WHITE,
    borderColor: Colors.GRAY_LIGHT,
  },
  avatarContainer: {
    width: 45,
    height: 45,
    top: 90,
  },
  userAvatar: {
    width: 45,
    height: 45,
    borderRadius: 100,
  },
  modalContainer: {
    // flex: 1,
    bottom: 0,
    borderRadius: 15,
    paddingBottom: 30,
    width: SCREEN_WIDTH,
    // position: 'absolute',
    backgroundColor: Colors.WHITE,
  },
  modalHeader: {
    width: 46,
    height: 8,
    marginTop: 13,
    borderRadius: 5,
    alignSelf: 'center',
    backgroundColor: Colors.GRAY_MEDIUM,
  },
  commonPadding: {
    paddingHorizontal: 30,
  },
  siteTitleCon: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  siteTitle: {
    fontSize: Typography.FONT_SIZE_24,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
  },
  btn: {
    height: 56,
    marginTop: 22,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Colors.GRADIENT_PRIMARY,
  },
  siteActionText: {
    marginLeft: 30,
    color: Colors.GRADIENT_PRIMARY,
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
  },
  alertSpot: {
    width: 25,
    height: 25,
  },
  satelliteInfoCon: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  satelliteInfo: {
    marginLeft: 10,
  },
  satelliteText: {
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_10,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  eventFromNow: {
    color: Colors.GRADIENT_PRIMARY,
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
  },
  eventDate: {
    marginVertical: 5,
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  confidence: {
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
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
  siteModalStyle: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: Colors.WHITE,
  },
  btnContinueSiteModal: {
    position: 'absolute',
    bottom: 40,
  },
  title: {
    color: Colors.WHITE,
  },
});
