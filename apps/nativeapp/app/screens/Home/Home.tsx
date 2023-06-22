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
  ImageSourcePropType,
} from 'react-native';
import bbox from '@turf/bbox';
import moment from 'moment-timezone';
import MapboxGL from '@rnmapbox/maps';
import Auth0 from 'react-native-auth0';
import Config from 'react-native-config';
import Lottie from 'lottie-react-native';
import rewind from '@mapbox/geojson-rewind';
import {multiPolygon, polygon} from '@turf/helpers';
import {useQueryClient} from '@tanstack/react-query';
import Clipboard from '@react-native-clipboard/clipboard';
import Geolocation from 'react-native-geolocation-service';
import Toast, {useToast} from 'react-native-toast-notifications';
import React, {useContext, useEffect, useMemo, useRef, useState} from 'react';

import {
  DropDown,
  LayerModal,
  AlertModal,
  BottomSheet,
  CustomButton,
  FloatingInput,
} from '../../components';
import {
  EyeIcon,
  SiteIcon,
  CopyIcon,
  LayerIcon,
  MyLocIcon,
  RadarIcon,
  CrossIcon,
  LogoutIcon,
  EyeOffIcon,
  PencilIcon,
  PointSiteIcon,
  SatelliteIcon,
  MapOutlineIcon,
  TrashSolidIcon,
  LocationPinIcon,
  PencilRoundIcon,
  UserPlaceholder,
  GreenMapOutline,
  TrashOutlineIcon,
  DisabledTrashOutlineIcon,
} from '../../assets/svgs';
import {
  getUserDetails,
  updateIsLoggedIn,
} from '../../redux/slices/login/loginSlice';
import {
  PermissionDeniedAlert,
  PermissionBlockedAlert,
} from './permissionAlert/locationPermissionAlerts';

import {trpc} from '../../services/trpc';
import {useFetchSites} from '../../utils/api';
import {Colors, Typography} from '../../styles';
import {daysFromToday} from '../../utils/moment';
import {clearAll} from '../../utils/localStorage';
import {categorizedRes} from '../../utils/filters';
import handleLink from '../../utils/browserLinking';
import {getFireIcon} from '../../utils/getFireIcon';
import {RADIUS_ARR, WEB_URLS} from '../../constants';
import {locationPermission} from '../../utils/permissions';
import {useAppDispatch, useAppSelector} from '../../hooks';
import {highlightWave} from '../../assets/animation/lottie';
import {BottomBarContext} from '../../global/reducers/bottomBar';
import {MapLayerContext, useMapLayers} from '../../global/reducers/mapLayers';

const IS_ANDROID = Platform.OS === 'android';
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

let attributionPosition: any = {
  bottom: IS_ANDROID ? 72 : 56,
  left: 8,
};

let compassViewMargins = {
  x: IS_ANDROID ? 16 : 17,
  y: IS_ANDROID ? 160 : 160,
};

const compassViewPosition = 3;

const ZOOM_LEVEL = 15;
const ANIMATION_DURATION = 1000;

type CompassImage = 'compass1';
const images: Record<CompassImage, ImageSourcePropType> = {
  compass1: require('../../assets/images/compassImage.png'),
};

const Home = ({navigation, route}) => {
  const siteInfo = route?.params;
  const {state} = useMapLayers(MapLayerContext);
  const {selectedSiteBar, passMapInfo} = useContext(BottomBarContext);
  const {userDetails, configData} = useAppSelector(state => state.loginSlice);

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
  const [selectedArea, setSelectedArea] = useState<any>(null);
  const [siteRad, setSiteRad] = useState<object | null>(RADIUS_ARR[3]);
  const [isEditSite, setIsEditSite] = useState<boolean>(false);
  const [showDelAccount, setShowDelAccount] = useState<boolean>(false);

  const map = useRef(null);
  const toast = useToast();
  const modalToast = useRef();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const camera = useRef<MapboxGL.Camera | null>(null);

  useEffect(() => {
    async function passProp() {
      setSelectedSite({});
      setSelectedArea(null);
      setSelectedAlert({});
      const centerCoordinates = await map.current.getCenter();
      const currZoom = await map.current.getZoom();
      passMapInfo({centerCoordinates, currZoom});
    }
    passProp();
  }, [selectedSiteBar]);

  useEffect(() => {
    if (
      isCameraRefVisible &&
      siteInfo?.bboxGeo?.length > 0 &&
      camera?.current?.fitBounds
    ) {
      setTimeout(() => {
        camera.current.fitBounds(
          [siteInfo?.bboxGeo[0], siteInfo?.bboxGeo[1]],
          [siteInfo?.bboxGeo[2], siteInfo?.bboxGeo[3]],
          60,
          500,
        );
        setSelectedArea(siteInfo?.siteInfo);
        setSelectedSite(siteInfo?.siteInfo[0]?.properties);
      }, 1000);
    }
  }, [isCameraRefVisible, siteInfo?.siteInfo]);

  useEffect(() => {
    if (
      isCameraRefVisible &&
      camera?.current?.setCamera &&
      !!configData?.loc?.longitude
    ) {
      setIsInitial(false);
      camera.current.setCamera({
        centerCoordinate: [
          Number(configData?.loc?.longitude),
          Number(configData?.loc?.latitude),
        ],
        zoomLevel: 4,
        animationDuration: ANIMATION_DURATION,
      });
    }
  }, [
    configData?.loc?.latitude,
    configData?.loc?.longitude,
    isCameraRefVisible,
  ]);

  useEffect(() => {
    onUpdateUserLocation(location);
  }, [isCameraRefVisible, location, onUpdateUserLocation]);

  const {data: alerts} = useFetchSites({enabled: true});

  const {data: sites, refetch: refetchSites} = trpc.site.getSites.useQuery(
    ['site', 'getSites'],
    {
      enabled: true,
      retryDelay: 3000,
      onError: () => {
        toast.show('something went wrong', {type: 'danger'});
      },
    },
  );

  const formattedSites = useMemo(
    () => categorizedRes(sites?.json?.data || [], 'type'),
    [sites],
  );

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
    onSuccess: (res, req) => {
      queryClient.setQueryData(
        [['site', 'getSites'], {input: ['site', 'getSites'], type: 'query'}],
        oldData =>
          oldData
            ? {
                ...oldData,
                json: {
                  ...oldData.json,
                  data: oldData.json.data.filter(
                    item => item.id !== req.json.siteId,
                  ),
                },
              }
            : null,
      );
      queryClient.setQueryData(
        [
          ['alert', 'getAlerts'],
          {input: ['alerts', 'getAlerts'], type: 'query'},
        ],
        oldData =>
          oldData
            ? {
                ...oldData,
                json: {
                  ...oldData.json,
                  data: oldData.json.data.filter(
                    item => item?.site?.id !== req.json.siteId,
                  ),
                },
              }
            : null,
      );
      setSelectedSite({});
      setSelectedArea(null);
    },
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const updateSite = trpc.site.updateSite.useMutation({
    retryDelay: 3000,
    onSuccess: (res, req) => {
      queryClient.setQueryData(
        [['site', 'getSites'], {input: ['site', 'getSites'], type: 'query'}],
        oldData =>
          oldData
            ? {
                ...oldData,
                json: {
                  ...oldData?.json,
                  data: oldData?.json?.data?.map(item =>
                    item.id === res?.json?.data?.id ? res?.json?.data : item,
                  ),
                },
              }
            : null,
      );
      if (req?.json?.body.hasOwnProperty('isMonitored')) {
        setSelectedSite({site: res?.json?.data});
      } else {
        setSelectedSite({});
        setSelectedArea(null);
      }
      setSiteNameModalVisible(false);
    },
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const softDeleteUser = trpc.user.softDeleteUser.useMutation({
    retryDelay: 3000,
    onSuccess: async () => {
      setShowDelAccount(false);
      queryClient.clear();
      await clearAll();
      dispatch(updateIsLoggedIn(false));
    },
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const onGoBack = () => setShowDelAccount(false);

  const onDeleteAccount = () => {
    softDeleteUser.mutate({json: {id: userDetails?.data?.id}});
  };

  const handleDelAccount = () => {
    setProfileModalVisible(false);
    setTimeout(() => setShowDelAccount(true), 500);
  };

  const handleEditSite = site => {
    setSelectedSite({});
    setSiteName(site.name);
    setSiteId(site.id);
    setIsEditSite(!!site.remoteId);
    setSiteRad(RADIUS_ARR.filter(el => el.value == site?.radius)[0]);
    setTimeout(() => setSiteNameModalVisible(true), 500);
  };

  const handleEditSiteInfo = () => {
    let payload = {
      json: {params: {siteId}, body: {name: siteName, radius: siteRad?.value}},
    };
    if (isEditSite) {
      delete payload.json.body.name;
    }
    updateSite.mutate(payload);
  };

  const handleDeleteSite = (id: string) => {
    deleteSite.mutate({json: {siteId: id}});
  };

  // recenter the mapmap to the current coordinates of user location
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
        queryClient.clear();
        await clearAll();
      });
    } catch (e) {
      console.log('Log out cancelled');
    }
  };

  const handleEditProfileName = () => {
    setLoading(true);
    const payload = {
      name: profileName?.trim(),
    };
    updateUser.mutate({json: {body: payload}});
  };

  const handlePencil = () => {
    setProfileName(userDetails?.data?.name);
    setProfileModalVisible(false);
    setTimeout(() => setProfileEditModal(true), 500);
  };

  const handleOpenPlatform = () => handleLink(WEB_URLS.PP_ECO);

  const handleGoogleRedirect = () => {
    const lat = Number.parseFloat(selectedAlert?.latitude);
    const lng = Number.parseFloat(selectedAlert?.longitude);
    const scheme = Platform.select({ios: 'maps:', android: 'geo:'});
    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `${scheme}//?q=${lat},${lng}`,
      android: `${scheme}${latLng}`,
    });
    handleLink(url, lat, lng);
  };

  const _copyToClipboard = loc => () => {
    Clipboard.setString(JSON.stringify(loc));
    modalToast.current.show('copied');
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
    const alertsArr = alerts?.json?.data;
    const id = alertsArr[counter]?.id;
    const coordinate = [
      alertsArr[counter]?.longitude,
      alertsArr[counter]?.latitude,
    ];
    const title = `Longitude: ${alertsArr[counter]?.longitude} Latitude: ${alertsArr[counter]?.latitude}`;

    return (
      <MapboxGL.PointAnnotation
        id={id}
        key={id}
        title={title}
        onSelected={e => {
          camera.current.setCamera({
            centerCoordinate: [
              alertsArr[counter]?.longitude,
              alertsArr[counter]?.latitude,
            ],
            padding: {
              paddingBottom: IS_ANDROID
                ? SCREEN_HEIGHT / 2.8
                : SCREEN_HEIGHT / 4,
            },
            zoomLevel: ZOOM_LEVEL,
            animationDuration: ANIMATION_DURATION,
          });
          setTimeout(
            () => setSelectedAlert(alertsArr[counter]),
            ANIMATION_DURATION,
          );
        }}
        coordinate={coordinate}>
        {getFireIcon(daysFromToday(alertsArr[counter]?.eventDate))}
      </MapboxGL.PointAnnotation>
    );
  };

  const renderSelectedPoint = counter => {
    const id = formattedSites?.point[counter]?.id;
    const coordinate = formattedSites?.point[counter]?.geometry?.coordinates;
    const title = `Longitude: ${coordinate[0]} Latitude: ${coordinate[1]}`;
    return (
      <MapboxGL.PointAnnotation
        id={id}
        key={id}
        title={title}
        onSelected={e => {
          let pointInfo = formattedSites?.point?.filter(
            site => site.id === e?.id,
          )[0];
          camera.current.setCamera({
            centerCoordinate: pointInfo?.geometry?.coordinates,
            zoomLevel: 15,
            animationDuration: 500,
          });
          setSelectedSite({site: pointInfo});
        }}
        coordinate={coordinate}>
        <PointSiteIcon />
      </MapboxGL.PointAnnotation>
    );
  };

  const renderAnnotations = isAlert => {
    const items = [];
    const arr = isAlert ? alerts?.json?.data : formattedSites?.point;
    for (let i = 0; i < arr?.length; i++) {
      {
        isAlert
          ? items.push(renderAnnotation(i))
          : items.push(renderSelectedPoint(i));
      }
    }
    return items;
  };

  const renderHighlightedMapSource = () => (
    <MapboxGL.ShapeSource
      id="fillSource"
      shape={{
        type: 'FeatureCollection',
        features:
          selectedArea?.map(singleSite => {
            return {
              type: 'Feature',
              properties: {site: singleSite},
              geometry: singleSite?.geometry,
            };
          }) || [],
      }}>
      <MapboxGL.FillLayer
        id="fillLayer"
        style={{
          fillColor: Colors.GRADIENT_PRIMARY,
          fillOpacity: 0.4,
        }}
      />
      <MapboxGL.LineLayer
        id="fillOutline"
        style={{
          lineWidth: 2,
          lineColor: Colors.GRADIENT_PRIMARY,
          lineOpacity: 1,
          lineJoin: 'bevel',
        }}
      />
    </MapboxGL.ShapeSource>
  );

  const renderMapSource = () => (
    <MapboxGL.ShapeSource
      id={'polygon'}
      shape={{
        type: 'FeatureCollection',
        features:
          (formattedSites?.polygon ?? [])
            .concat(formattedSites?.multipolygon ?? [])
            ?.map((singleSite, i) => {
              return {
                type: 'Feature',
                properties: {site: singleSite},
                geometry: singleSite?.geometry,
              };
            }) || [],
      }}
      onPress={e => {
        let bboxGeo = null;
        setSelectedArea(e?.features);
        if (e?.features[0]?.geometry?.type === 'MultiPolygon') {
          bboxGeo = bbox(
            multiPolygon(rewind(e?.features[0]?.geometry.coordinates)),
          );
        } else {
          bboxGeo = bbox(polygon(e?.features[0]?.geometry.coordinates));
        }
        camera.current.fitBounds(
          [bboxGeo[0], bboxGeo[1]],
          [bboxGeo[2], bboxGeo[3]],
          60,
          500,
        );
        setSelectedSite(e?.features[0]?.properties);
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

  return (
    <>
      <MapboxGL.MapView
        ref={map}
        compassEnabled
        style={styles.map}
        logoEnabled={false}
        scaleBarEnabled={false}
        compassImage={'compass1'}
        styleURL={MapboxGL.StyleURL[state]}
        compassViewMargins={compassViewMargins}
        compassViewPosition={compassViewPosition}
        attributionPosition={attributionPosition}>
        <MapboxGL.Images images={images} />
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
        {/* highlighted */}
        {selectedArea && renderHighlightedMapSource()}
        {/* for alerts */}
        {renderAnnotations(true)}
        {/* for point sites */}
        {renderAnnotations(false)}
      </MapboxGL.MapView>
      {Object.keys(selectedAlert).length ? (
        <Lottie source={highlightWave} autoPlay loop style={styles.alertSpot} />
      ) : null}
      <StatusBar
        translucent
        barStyle={'light-content'}
        backgroundColor={Colors.TRANSPARENT}
      />
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
      <AlertModal
        visible={showDelAccount}
        heading={'Delete Account'}
        message={
          'If you proceed, your FireAlert data will be scheduled for deletion in 7 days. If you change your mind please login again to cancel the deletion.\n\nTo delete your Plant-for-the-Planet Account, and Platform data, please visit pp.eco'
        }
        primaryBtnText={'Delete'}
        secondaryBtnText={'Go Back'}
        onPressPrimaryBtn={onDeleteAccount}
        onPressSecondaryBtn={onGoBack}
        showSecondaryButton={true}
      />
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleUser}
        style={[styles.layerIcon, styles.avatarContainer]}
        accessibilityLabel="layer"
        accessible={true}
        testID="layer">
        {userDetails?.data?.image ? (
          <Image
            source={{uri: userDetails?.data?.image}}
            style={styles.userAvatar}
          />
        ) : (
          <UserPlaceholder width={44} height={44} />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleLayer}
        style={styles.layerIcon}
        accessibilityLabel="layer"
        accessible={true}
        testID="layer">
        <LayerIcon width={45} height={45} />
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleMyLocation}
        style={styles.myLocationIcon}
        accessibilityLabel="my_location"
        accessible={true}
        testID="my_location">
        <MyLocIcon width={45} height={45} />
      </TouchableOpacity>
      {/* profile modal */}
      <BottomSheet
        isVisible={profileModalVisible}
        onBackdropPress={() => setProfileModalVisible(false)}>
        <View style={[styles.modalContainer, styles.commonPadding]}>
          <View style={styles.modalHeader} />
          <View style={styles.siteTitleCon}>
            <View style={styles.profileHeader}>
              {userDetails?.data?.image ? (
                <Image
                  source={{
                    uri: userDetails?.data?.image,
                  }}
                  style={[styles.userAvatar, {width: 81, height: 81}]}
                />
              ) : (
                <UserPlaceholder width={81} height={81} />
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.lightText}>Name</Text>
                <Text style={styles.pfName}>
                  {userDetails?.data?.name || 'Anonymous Firefighter'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handlePencil}>
              <PencilRoundIcon />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={handleOpenPlatform}
            style={styles.platFormBtn}>
            <GreenMapOutline />
            <Text style={styles.siteActionPfText}>Open Platform</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.btn}>
            <LogoutIcon />
            <Text style={styles.siteActionPfText}>Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelAccount}
            style={[styles.btn, {marginBottom: 16}]}>
            <TrashSolidIcon width={20} height={20} />
            <Text style={styles.siteActionPfText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
      {/* fire alert info modal */}
      <BottomSheet
        onBackdropPress={() => setSelectedAlert({})}
        isVisible={Object.keys(selectedAlert).length > 0}>
        <Toast ref={modalToast} offsetBottom={100} duration={1000} />
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
                  {moment(selectedAlert?.localEventDate)
                    ?.tz(selectedAlert?.localTimeZone)
                    ?.fromNow()}
                </Text>{' '}
                (
                {moment(selectedAlert?.localEventDate)
                  ?.tz(selectedAlert?.localTimeZone)
                  ?.format('DD MMM YYYY [at] HH:mm')}
                )
              </Text>
              <Text style={styles.confidence}>
                <Text style={styles.confidenceVal}>
                  {selectedAlert?.confidence}
                </Text>{' '}
                alert confidence
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.alertLocInfoCon,
              {marginTop: 30, justifyContent: 'space-between'},
            ]}>
            <View style={styles.satelliteInfoLeft}>
              <View style={styles.satelliteIcon}>
                <SiteIcon />
              </View>
              {selectedAlert?.site?.project ? (
                <View style={styles.satelliteInfo}>
                  <Text style={styles.satelliteLocText}>PROJECT</Text>
                  <Text style={styles.alertLocText}>
                    {selectedAlert?.site?.project?.name}{' '}
                    <Text style={{fontSize: Typography.FONT_SIZE_12}}>
                      {selectedAlert?.site?.name}
                    </Text>
                  </Text>
                </View>
              ) : (
                <View style={styles.satelliteInfo}>
                  <Text style={styles.satelliteLocText}>SITE</Text>
                  <Text style={styles.alertLocText}>
                    {selectedAlert?.site?.name}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.separator} />
          <View
            style={[styles.alertLocInfoCon, {justifyContent: 'space-between'}]}>
            <View style={styles.satelliteInfoLeft}>
              <View style={styles.satelliteIcon}>
                <LocationPinIcon />
              </View>
              <View style={styles.satelliteInfo}>
                <Text style={styles.satelliteLocText}>LOCATION</Text>
                <Text style={styles.alertLocText}>
                  {Number.parseFloat(selectedAlert?.latitude).toFixed(5)},{' '}
                  {Number.parseFloat(selectedAlert?.longitude).toFixed(5)}
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
          <View style={styles.separator} />
          <View style={styles.alertRadiusInfoCon}>
            <View style={styles.satelliteIcon}>
              <RadarIcon />
            </View>
            <View style={styles.satelliteInfo}>
              <Text style={[styles.alertLocText, {width: SCREEN_WIDTH / 1.3}]}>
                Search for the fire within a{' '}
                <Text
                  style={[styles.confidenceVal, {textTransform: 'lowercase'}]}>
                  {selectedAlert?.distance == 0 ? 1 : selectedAlert?.distance}{' '}
                  km
                </Text>{' '}
                radius around the location.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleGoogleRedirect}
            style={styles.simpleBtn}>
            <Text style={[styles.siteActionText, {marginLeft: 0}]}>
              Open in Google Maps
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
      {/* site Info modal */}
      <BottomSheet
        isVisible={!!Object.keys(selectedSite)?.length}
        backdropColor={'transparent'}
        onBackdropPress={() => {
          setSelectedArea(null);
          setSelectedSite({});
        }}>
        <View style={[styles.modalContainer, styles.commonPadding]}>
          <View style={styles.modalHeader} />
          <View style={styles.siteTitleCon}>
            <View>
              {selectedSite?.site?.project?.id && (
                <Text style={styles.projectsName}>
                  {selectedSite?.site?.project?.name ||
                    selectedSite?.site?.project?.id}
                </Text>
              )}
              <Text style={styles.siteTitle}>
                {selectedSite?.site?.name || selectedSite?.site?.id}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleEditSite(selectedSite?.site)}>
              <PencilIcon />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            disabled={updateSite?.isLoading}
            onPress={() =>
              updateSite.mutate({
                json: {
                  params: {siteId: selectedSite?.site?.id},
                  body: {isMonitored: !selectedSite?.site?.isMonitored},
                },
              })
            }
            style={[styles.simpleBtn]}>
            {updateSite?.isLoading ? (
              <ActivityIndicator color={Colors.PRIMARY} />
            ) : (
              <>
                {selectedSite?.site?.isMonitored ? <EyeOffIcon /> : <EyeIcon />}
                <Text style={[styles.siteActionText]}>
                  {selectedSite?.site?.isMonitored
                    ? 'Disable Monitoring'
                    : 'Enable Monitoring'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            disabled={
              deleteSite?.isLoading || !!selectedSite?.site?.project?.id
            }
            onPress={() => handleDeleteSite(selectedSite?.site?.id)}
            style={[
              styles.simpleBtn,
              selectedSite?.site?.project?.id && {
                borderColor: Colors.GRAY_LIGHTEST,
              },
            ]}>
            {deleteSite?.isLoading ? (
              <ActivityIndicator color={Colors.PRIMARY} />
            ) : (
              <>
                {selectedSite?.site?.project?.id ? (
                  <DisabledTrashOutlineIcon />
                ) : (
                  <TrashOutlineIcon />
                )}
                <Text
                  style={[
                    styles.siteActionText,
                    selectedSite?.site?.project?.id && {
                      color: Colors.GRAY_LIGHTEST,
                    },
                  ]}>
                  Delete Site
                </Text>
              </>
            )}
          </TouchableOpacity>
          {selectedSite?.site?.project?.id && (
            <Text style={styles.projectSyncInfo}>
              This site is synced from pp.eco. To make changes, please visit the
              Plant-for-the-Planet Platform.
            </Text>
          )}
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
          <Text style={[styles.heading, {paddingHorizontal: 16}]}>
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
          <Text style={[styles.heading, {paddingHorizontal: 16}]}>
            Enter Site Name
          </Text>
          <View
            style={[styles.siteModalStyle, {justifyContent: 'space-between'}]}>
            <View>
              <FloatingInput
                autoFocus
                isFloat={false}
                value={siteName}
                editable={!isEditSite}
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
    bottom: IS_ANDROID ? 102 : 101,
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
    top: 138,
    backgroundColor: Colors.WHITE,
    borderColor: Colors.GRAY_LIGHT,
  },
  avatarContainer: {
    width: 45,
    height: 45,
    top: 80,
  },
  userAvatar: {
    width: 44,
    height: 44,
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
    paddingHorizontal: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  lightText: {
    fontSize: Typography.FONT_SIZE_12,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.GRAY_DEEP,
  },
  pfName: {
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
    width: SCREEN_WIDTH / 2,
  },
  profileInfo: {
    marginLeft: 16,
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
    width: SCREEN_WIDTH / 1.3,
  },
  platFormBtn: {
    height: 61,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    backgroundColor: Colors.PLANET_DARK_GREEN + '10',
    borderColor: Colors.PLANET_DARK_GREEN + '20',
  },
  btn: {
    height: 61,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    backgroundColor: Colors.GRADIENT_PRIMARY + '10',
    borderColor: Colors.GRADIENT_PRIMARY + '20',
  },
  simpleBtn: {
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
  siteActionPfText: {
    marginLeft: 15,
    color: Colors.PLANET_DARK_GRAY,
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
  },
  alertSpot: {
    width: 150,
    zIndex: 20,
    height: 150,
    position: 'absolute',
    bottom: IS_ANDROID ? SCREEN_HEIGHT / 1.64 : SCREEN_HEIGHT / 1.95,
    alignSelf: 'center',
  },
  satelliteInfoCon: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.GRADIENT_PRIMARY + '10',
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 12,
  },
  alertLocInfoCon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertRadiusInfoCon: {
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
  satelliteLocText: {
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_8,
    fontFamily: Typography.FONT_FAMILY_BOLD,
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
  alertLocText: {
    marginVertical: 2,
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  confidence: {
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  confidenceVal: {
    fontFamily: Typography.FONT_FAMILY_BOLD,
    textTransform: 'capitalize',
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
  projectsName: {
    fontSize: Typography.FONT_SIZE_16,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.TEXT_COLOR,
  },
  projectSyncInfo: {
    fontSize: 12,
    marginTop: 16,
    color: Colors.TEXT_COLOR,
    fontFamily: Typography.FONT_FAMILY_ITALIC,
    paddingHorizontal: 10,
  },
  separator: {
    height: 0.4,
    marginVertical: 16,
    backgroundColor: '#BDBDBD',
  },
});
