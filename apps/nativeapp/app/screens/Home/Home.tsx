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
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import moment from 'moment';
import MapboxGL from '@rnmapbox/maps';
import centroid from '@turf/centroid';
import {polygon} from '@turf/helpers';
import {SvgXml} from 'react-native-svg';
import Config from 'react-native-config';
import Lottie from 'lottie-react-native';
import Auth0, {useAuth0} from 'react-native-auth0';
import {useFocusEffect} from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useToast} from 'react-native-toast-notifications';
import Geolocation from 'react-native-geolocation-service';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {
  LayerModal,
  AlertModal,
  BottomSheet,
  CustomButton,
  FloatingInput,
} from '../../components';
import {
  CopyIcon,
  LayerIcon,
  MyLocIcon,
  RadarIcon,
  CrossIcon,
  LogoutIcon,
  PencilIcon,
  PointSiteIcon,
  SatelliteIcon,
  MapOutlineIcon,
  LocationPinIcon,
  UserPlaceholder,
  TrashOutlineIcon,
} from '../../assets/svgs';
import {
  getUserDetails,
  updateIsLoggedIn,
} from '../../redux/slices/login/loginSlice';
import {
  PermissionDeniedAlert,
  PermissionBlockedAlert,
} from './permissionAlert/locationPermissionAlerts';

import {WEB_URLS} from '../../constants';
import {trpc} from '../../services/trpc';
import {Colors, Typography} from '../../styles';
import {daysFromToday} from '../../utils/moment';
import {clearAll} from '../../utils/localStorage';
import {categorizedRes} from '../../utils/filters';
import handleLink from '../../utils/browserLinking';
import {getFireIcon} from '../../utils/getFireIcon';
import {locationPermission} from '../../utils/permissions';
import {useAppDispatch, useAppSelector} from '../../hooks';
import {highlightWave} from '../../assets/animation/lottie';
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

const Home = ({navigation, route}) => {
  const siteInfo = route?.params;
  const {clearCredentials} = useAuth0();
  const {state} = useMapLayers(MapLayerContext);
  const {alerts} = useAppSelector(state => state.alertSlice);
  const {userDetails} = useAppSelector(state => state.loginSlice);

  const [isInitial, setIsInitial] = useState<boolean>(true);
  const [isCameraRefVisible, setIsCameraRefVisible] = useState<boolean>(false);

  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [isPermissionBlocked, setIsPermissionBlocked] =
    useState<boolean>(false);
  const [isLocationAlertShow, setIsLocationAlertShow] =
    useState<boolean>(false);

  const [visible, setVisible] = useState<boolean>(false);
  const [profileModalVisible, setProfileModalVisible] =
    useState<boolean>(false);

  const [profileName, setProfileName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [profileEditModal, setProfileEditModal] = useState<boolean>(false);

  const [location, setLocation] = useState<
    MapboxGL.Location | Geolocation.GeoPosition
  >();

  const [selectedAlert, setSelectedAlert] = useState<object | null>({});
  const [selectedSite, setSelectedSite] = useState<object | null>({});
  const [siteNameModalVisible, setSiteNameModalVisible] =
    useState<boolean>(false);
  const [siteName, setSiteName] = useState<string | null>('');
  const [siteId, setSiteId] = useState<string | null>('');

  const {data: sites, refetch: refetchSites} = trpc.site.getAllSites.useQuery(
    undefined,
    {
      enabled: true,
      retryDelay: 3000,
      refetchInterval: 10000,
      refetchIntervalInBackground: true,
      onError: () => {
        toast.show('something went wrong', {type: 'danger'});
      },
    },
  );

  const formattedSites = useMemo(
    () => categorizedRes(sites?.json?.data || [], 'type'),
    [categorizedRes, sites],
  );

  const toast = useToast();
  const dispatch = useAppDispatch();
  const map = useRef(null);
  const camera = useRef<MapboxGL.Camera | null>(null);
  const updateUser = trpc.user.updateUser.useMutation({
    retryDelay: 3000,
    onSuccess: () => {
      const request = {
        onSuccess: async message => {},
        onFail: () => {
          toast.show('something went wrong', {type: 'danger'});
        },
      };
      setLoading(false);
      setProfileEditModal(false);
      dispatch(getUserDetails(request));
    },
    onError: () => {
      setLoading(false);
      setProfileEditModal(false);
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const deleteSite = trpc.site.deleteSite.useMutation({
    retryDelay: 3000,
    onSuccess: () => {
      refetchSites();
      setSelectedSite({});
    },
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const updateSite = trpc.site.updateSite.useMutation({
    retryDelay: 3000,
    onSuccess: () => {
      refetchSites();
      setSiteNameModalVisible(false);
    },
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  useFocusEffect(
    useCallback(() => {
      if (siteInfo && isCameraRefVisible && camera?.current?.setCamera) {
        let center = centroid(polygon(siteInfo?.geometry?.coordinates));
        const lat = center?.geometry?.coordinates[1];
        const long = center?.geometry?.coordinates[0];
        camera.current.setCamera({
          centerCoordinate: [long, lat],
          // centerCoordinate: [75.3855852018891, 28.111672923634202],
          zoomLevel: ZOOM_LEVEL,
          animationDuration: ANIMATION_DURATION,
        });
      }
    }, [isCameraRefVisible, siteInfo]),
  );

  const handleEditSite = site => {
    setSelectedSite({});
    setSiteName(site.name);
    setSiteId(site.id);
    setTimeout(() => setSiteNameModalVisible(true), 500);
  };

  const handleEditSiteInfo = () => {
    updateSite.mutate({json: {params: {siteId}, body: {name: siteName}}});
  };

  const handleDeleteSite = (id: string) => {
    deleteSite.mutate({json: {siteId: id}});
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
      name: profileName.trim(),
    };
    updateUser.mutate({json: {body: payload}});
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
    const scheme = Platform.select({ios: 'maps:0,0?q=', android: 'geo:0,0?q='});
    const latLng = `${lat},${lng}`;
    const label = selectedAlert?.site;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });
    handleLink(url);
  };

  const _copyToClipboard = loc => () => {
    Clipboard.setString(JSON.stringify(loc));
  };

  const handleLayer = () => setVisible(true);
  const closeMapLayer = () => setVisible(false);

  const onPressPerBlockedAlertPrimaryBtn = () => {};
  const onPressPerBlockedAlertSecondaryBtn = () => {
    BackHandler.exitApp();
  };

  const onPressPerDeniedAlertPrimaryBtn = () => checkPermission();
  const onPressPerDeniedAlertSecondaryBtn = () => checkPermission();

  const handleCloseProfileModal = () => setProfileEditModal(false);
  const handleCloseSiteModal = () => setSiteNameModalVisible(false);

  const renderAnnotation = counter => {
    const id = alerts[counter]?.guid;
    const coordinate = [alerts[counter]?.latitude, alerts[counter]?.longitude];
    const title = `Longitude: ${alerts[counter]?.latitude} Latitude: ${alerts[counter]?.longitude}`;
    return (
      <MapboxGL.PointAnnotation
        id={id}
        key={id}
        title={title}
        onSelected={e => {
          camera.current.setCamera({
            centerCoordinate: [
              alerts[counter]?.latitude,
              alerts[counter]?.longitude,
            ],
            padding: {paddingBottom: SCREEN_HEIGHT / 4},
            zoomLevel: ZOOM_LEVEL,
            animationDuration: ANIMATION_DURATION,
          });
          setTimeout(
            () => setSelectedAlert(alerts[counter]),
            ANIMATION_DURATION,
          );
        }}
        coordinate={coordinate}>
        {getFireIcon(daysFromToday(alerts[counter]?.eventDate))}
      </MapboxGL.PointAnnotation>
    );
  };

  const renderSelectedPoint = counter => {
    const id = formattedSites?.point[counter]?.guid;
    const coordinate = formattedSites?.point[counter]?.geometry?.coordinates;
    const title = `Longitude: ${coordinate[0]} Latitude: ${coordinate[1]}`;
    return (
      <MapboxGL.PointAnnotation
        id={id}
        key={id}
        title={title}
        // onSelected={e => {
        //   setSelectedAlert(formattedSites?.point[counter]), console.log(e);
        // }}
        coordinate={coordinate}>
        <PointSiteIcon />
      </MapboxGL.PointAnnotation>
    );
  };

  const renderAnnotations = isAlert => {
    const items = [];
    const arr = isAlert ? alerts : formattedSites?.point;
    for (let i = 0; i < arr?.length; i++) {
      {
        isAlert
          ? items.push(renderAnnotation(i))
          : items.push(renderSelectedPoint(i));
      }
    }
    return items;
  };

  const renderMapSource = () => (
    <MapboxGL.ShapeSource
      id={'polygon'}
      shape={{
        type: 'FeatureCollection',
        features:
          formattedSites?.polygon?.map((singleSite, i) => {
            return {
              type: 'Feature',
              properties: {site: singleSite},
              geometry: singleSite?.geometry,
            };
          }) || [],
      }}
      onPress={e => {
        camera.current.setCamera({
          centerCoordinate: [
            e?.coordinates?.longitude,
            e?.coordinates?.latitude,
          ],
          zoomLevel: 10,
          animationDuration: ANIMATION_DURATION,
        });

        setTimeout(
          () => setSelectedSite(e?.features[0]?.properties),
          ANIMATION_DURATION,
        );
      }}>
      <MapboxGL.FillLayer
        id={'polyFill'}
        layerIndex={2}
        style={{
          fillColor: Colors.WHITE,
          fillOpacity: 0.4,
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
  );

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
        {renderMapSource()}
        {/* for alerts */}
        {renderAnnotations(true)}
        {/* for point sites */}
        {renderAnnotations(false)}
      </MapboxGL.MapView>
      {Object.keys(selectedAlert).length ? (
        <Lottie source={highlightWave} autoPlay loop style={styles.alertSpot} />
      ) : null}
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
        {userDetails?.avatar || userDetails?.picture ? (
          <Image
            source={{uri: userDetails?.avatar || userDetails?.picture}}
            style={styles.userAvatar}
          />
        ) : (
          <UserPlaceholder />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleLayer}
        style={styles.layerIcon}
        accessibilityLabel="layer"
        accessible={true}
        testID="layer">
        <LayerIcon />
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
          <View
            style={[
              styles.satelliteInfoCon,
              {justifyContent: 'space-between'},
            ]}>
            <View style={styles.satelliteInfoLeft}>
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
            <TouchableOpacity
              onPress={_copyToClipboard([
                Number.parseFloat(selectedAlert?.latitude),
                Number.parseFloat(selectedAlert?.longitude),
              ])}>
              <CopyIcon />
            </TouchableOpacity>
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
      {/* site Info modal */}
      <BottomSheet
        isVisible={Object.keys(selectedSite)?.length > 0}
        backdropColor={Colors.BLACK + '80'}
        onBackdropPress={() => setSelectedSite({})}>
        <View style={[styles.modalContainer, styles.commonPadding]}>
          <View style={styles.modalHeader} />
          <View style={styles.siteTitleCon}>
            <Text style={styles.siteTitle}>
              {selectedSite?.site?.name || selectedSite?.site?.guid}
            </Text>
            <TouchableOpacity
              onPress={() => handleEditSite(selectedSite?.site)}>
              <PencilIcon />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.btn}>
            <MapOutlineIcon />
            <Text style={styles.siteActionText}>View on Map</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={deleteSite?.isLoading}
            onPress={() => handleDeleteSite(selectedSite?.site?.id)}
            style={styles.btn}>
            {deleteSite?.isLoading ? (
              <ActivityIndicator color={Colors.PRIMARY} />
            ) : (
              <>
                <TrashOutlineIcon />
                <Text style={styles.siteActionText}>Delete Site</Text>
              </>
            )}
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
      {/* site edit modal */}
      <Modal visible={siteNameModalVisible} animationType={'slide'} transparent>
        <KeyboardAvoidingView
          {...(Platform.OS === 'ios' ? {behavior: 'padding'} : {})}
          style={styles.siteModalStyle}>
          <TouchableOpacity
            onPress={handleCloseSiteModal}
            style={styles.crossContainer}>
            <CrossIcon fill={Colors.GRADIENT_PRIMARY} />
          </TouchableOpacity>
          <Text style={[styles.heading, {paddingHorizontal: 40}]}>
            Enter Site Name
          </Text>
          <View
            style={[styles.siteModalStyle, {justifyContent: 'space-between'}]}>
            <FloatingInput
              autoFocus
              isFloat={false}
              value={siteName}
              onChangeText={setSiteName}
            />
            <CustomButton
              title="Continue"
              titleStyle={styles.title}
              onPress={handleEditSiteInfo}
              isLoading={updateSite?.isLoading}
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
    borderWidth: 1,
    borderRadius: 100,
    alignItems: 'center',
    position: 'absolute',
    justifyContent: 'center',
    bottom: IS_ANDROID ? 72 : 101,
    backgroundColor: Colors.WHITE,
    borderColor: Colors.GRAY_LIGHT,
  },
  layerIcon: {
    right: 16,
    borderWidth: 1,
    borderRadius: 100,
    alignItems: 'center',
    position: 'absolute',
    justifyContent: 'center',
    top: 108,
    backgroundColor: Colors.WHITE,
    borderColor: Colors.GRAY_LIGHT,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    top: 66,
  },
  userAvatar: {
    width: 31,
    height: 31,
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
    width: 150,
    zIndex: 20,
    height: 150,
    position: 'absolute',
    bottom: IS_ANDROID ? SCREEN_HEIGHT / 3.56 : SCREEN_HEIGHT / 5.85,
    alignSelf: 'center',
  },
  satelliteInfoCon: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  satelliteInfoLeft: {
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
