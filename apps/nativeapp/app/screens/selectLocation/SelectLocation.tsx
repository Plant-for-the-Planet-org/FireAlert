import {
  View,
  Text,
  Modal,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  BackHandler,
  TouchableOpacity,
  KeyboardAvoidingView,
  ImageSourcePropType,
} from 'react-native';
import bbox from '@turf/bbox';
import {point} from '@turf/helpers';
import MapboxGL from '@rnmapbox/maps';
import {SvgXml} from 'react-native-svg';
import {useToast} from 'react-native-toast-notifications';
import Geolocation from 'react-native-geolocation-service';
import React, {useContext, useEffect, useRef, useState} from 'react';

import {
  CrossIcon,
  LayerIcon,
  MyLocIcon,
  active_marker,
} from '../../assets/svgs';
import {
  PermissionDeniedAlert,
  PermissionBlockedAlert,
} from '../home/permissionAlert/locationPermissionAlerts';

import {
  DropDown,
  AlertModal,
  LayerModal,
  CustomButton,
  FloatingInput,
} from '../../components';
import {trpc} from '../../services/trpc';
import {useFetchSites} from '../../utils/api';
import {Colors, Typography} from '../../styles';
import {POINT_RADIUS_ARR} from '../../constants';
import {useQueryClient} from '@tanstack/react-query';
import {locationPermission} from '../../utils/permissions';
import {BottomBarContext} from '../../global/reducers/bottomBar';
import {MapLayerContext, useMapLayers} from '../../global/reducers/mapLayers';

const IS_ANDROID = Platform.OS === 'android';

let attributionPosition: any = {
  bottom: IS_ANDROID ? 72 : 56,
  left: 8,
};

let compassViewMargins = {
  x: IS_ANDROID ? 16 : 16,
  y: IS_ANDROID ? 160 : 125,
};

const compassViewPosition = 3;

const ZOOM_LEVEL = 15;
const ANIMATION_DURATION = 1000;

type CompassImage = 'compass1';
const images: Record<CompassImage, ImageSourcePropType> = {
  compass1: require('../../assets/images/compassImage.png'),
};

const SelectLocation = ({navigation}) => {
  const {state} = useMapLayers(MapLayerContext);
  const {mapInfo} = useContext(BottomBarContext);
  const [visible, setVisible] = useState<boolean>(false);
  const [isInitial, setIsInitial] = useState(true);
  const [isCameraRefVisible, setIsCameraRefVisible] = useState<boolean>(false);

  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [isPermissionBlocked, setIsPermissionBlocked] =
    useState<boolean>(false);
  const [isLocationAlertShow, setIsLocationAlertShow] =
    useState<boolean>(false);

  const [siteName, setSiteName] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const [siteNameModalVisible, setSiteNameModalVisible] =
    useState<boolean>(false);

  const [siteRad, setSiteRad] = useState<object | null>(POINT_RADIUS_ARR[3]);

  const [enableGetFireAlerts, setEnableGetFireAlerts] =
    useState<boolean>(false);

  const [location, setLocation] = useState<
    MapboxGL.Location | Geolocation.GeoPosition
  >();

  const map = useRef(null);
  const camera = useRef<MapboxGL.Camera | null>(null);

  const toast = useToast();
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
    let bboxGeo = bbox(point(siteInfo?.geometry.coordinates));
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
      _handleViewMap(res?.json?.data);
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
        radius: siteRad?.value,
      },
    });
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
      checkPermission();
    } else {
      Linking.openURL('app-settings:');
    }
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

  return (
    <>
      <StatusBar
        animated
        translucent
        barStyle={siteNameModalVisible ? 'dark-content' : 'light-content'}
        backgroundColor={
          siteNameModalVisible ? Colors.WHITE : Colors.TRANSPARENT
        }
      />
      <MapboxGL.MapView
        ref={map}
        style={styles.map}
        logoEnabled={false}
        scaleBarEnabled={false}
        compassEnabled
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
      </MapboxGL.MapView>
      <View style={styles.fakeMarkerCont}>
        <SvgXml xml={active_marker} style={styles.markerImage} />
      </View>
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.crossIcon}
          onPress={handleClose}>
          <CrossIcon width={15} height={15} fill={'#4D5153'} />
        </TouchableOpacity>
      </View>
      <LayerModal visible={visible} onRequestClose={closeMapLayer} />
      <TouchableOpacity
        onPress={handleLayer}
        style={styles.layerIcon}
        accessibilityLabel="layer"
        accessible={true}
        testID="layer">
        <LayerIcon width={45} height={45} fill={Colors.TEXT_COLOR} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleMyLocation}
        style={styles.myLocationIcon}
        accessibilityLabel="my_location"
        accessible={true}
        testID="my_location">
        <MyLocIcon width={45} height={45} />
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
                  value={siteRad?.value}
                  items={POINT_RADIUS_ARR}
                  onSelectItem={setSiteRad}
                  defaultValue={siteRad?.value}
                  label={'Notify me if fires occur...'}
                />
              </View>
            </View>
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
  justifyContentSpaceBetween: {
    justifyContent: 'space-between',
  },
  marginTop20MarginBottom10: {
    marginTop: 20,
    marginBottom: 10,
  },
  safeAreaView: {
    backgroundColor: '#000',
  },
  map: {
    flex: 1,
  },
  myLocationIcon: {
    right: 23,
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 100,
    alignItems: 'center',
    position: 'absolute',
    justifyContent: 'center',
    bottom: IS_ANDROID ? 112 : 112,
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
    top: IS_ANDROID ? 122 : 138,
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

  header: {
    top: 50,
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
