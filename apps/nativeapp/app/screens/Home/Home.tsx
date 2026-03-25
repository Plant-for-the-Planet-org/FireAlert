import rewind from '@mapbox/geojson-rewind';
import MapboxGL from '@rnmapbox/maps';
import {useQueryClient} from '@tanstack/react-query';
import {bbox, multiPolygon, polygon} from '@turf/turf';
import Lottie from 'lottie-react-native';
import moment from 'moment-timezone';
import type {Feature, Polygon as GeoJsonPolygon} from 'geojson';
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Image,
  ImageSourcePropType,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useAuth0} from 'react-native-auth0';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Geolocation from 'react-native-geolocation-service';
import Toast, {useToast} from 'react-native-toast-notifications';

import {
  CrossIcon,
  DisabledTrashOutlineIcon,
  EyeIcon,
  EyeOffIcon,
  GreenMapOutline,
  LayerIcon,
  LogoutIcon,
  MyLocIcon,
  PencilIcon,
  PencilRoundIcon,
  PointSiteIcon,
  TrashOutlineIcon,
  TrashSolidIcon,
  UserPlaceholder,
} from '../../assets/svgs';
import {
  AlertModal,
  BottomSheet,
  CustomButton,
  DropDown,
  FloatingInput,
  LayerModal,
} from '../../components';
import {
  backToIncidentDetails,
  closeAllDetails,
  openAlertDetails,
  openIncidentDetails,
} from '../../redux/slices/details/detailsUISlice';
import {
  getUserDetails,
  updateIsLoggedIn,
} from '../../redux/slices/login/loginSlice';
import {
  PermissionBlockedAlert,
  PermissionDeniedAlert,
} from './PermissionAlert/LocationPermissionAlerts';
import {
  AlertDetailsBottomSheet,
  IncidentDetailsBottomSheet,
  MapDisplayModeSwitcher,
  MapDurationDropdown,
} from './components';

import {highlightWave} from '../../assets/animation/lottie';
import {POINT_RADIUS_ARR, RADIUS_ARR, WEB_URLS} from '../../constants';
import {BottomBarContext} from '../../global/reducers/bottomBar';
import {MapLayerContext, useMapLayers} from '../../global/reducers/mapLayers';
import {useAppDispatch, useAppSelector} from '../../hooks';
import {useIncidentData} from '../../hooks/incident/useIncidentData';
import {trpc} from '../../services/trpc';
import {Colors, Typography} from '../../styles';
import type {IncidentCircleResult} from '../../types/incident';
import {useFetchSites} from '../../utils/api';
import handleLink from '../../utils/browserLinking';
import {categorizedRes} from '../../utils/filters';
import {getFireIcon} from '../../utils/getFireIcon';
import {generateIncidentCircle} from '../../utils/incident/incidentCircleUtils';
import {clearAll} from '../../utils/localStorage';
import {
  calculateAlertCamera,
  calculateIncidentCamera,
} from '../../utils/mapZoomUtils';
import {daysFromToday} from '../../utils/moment';
import {locationPermission} from '../../utils/permissions';

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

const Home = ({navigation: _navigation, route}) => {
  const siteInfo = route?.params;
  const {state} = useMapLayers(MapLayerContext);
  const {clearSession, clearCredentials} = useAuth0();

  const {setSelected, selectedSiteBar, passMapInfo} =
    useContext(BottomBarContext);
  const {userDetails, configData} = useAppSelector(
    appState => appState.loginSlice,
  );

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
  const [incidentCircleData, setIncidentCircleData] =
    useState<IncidentCircleResult | null>(null);
  const [selectedSite, setSelectedSite] = useState<object | null>({});
  const [siteNameModalVisible, setSiteNameModalVisible] =
    useState<boolean>(false);
  const [siteName, setSiteName] = useState<string | null>('');
  const [siteGeometry, setSiteGeometry] = useState<string | null>('');
  const [siteId, setSiteId] = useState<string | null>('');
  const [selectedArea, setSelectedArea] = useState<any>(null);
  const [siteRad, setSiteRad] = useState<object | null>(RADIUS_ARR[4]);
  const [isEditSite, setIsEditSite] = useState<boolean>(false);
  const [showDelAccount, setShowDelAccount] = useState<boolean>(false);

  // Map display mode state
  const [mapDisplayMode, setMapDisplayMode] = useState<'alerts' | 'incidents'>(
    'alerts',
  );
  const [mapDurationDays, setMapDurationDays] = useState<number>(7);
  const [_selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    null,
  );

  // Redux state for details UI
  const detailsUI = useAppSelector((state: any) => state.detailsUISlice);
  const dispatch = useAppDispatch();

  const map = useRef(null);
  const toast = useToast();
  const modalToast = useRef();
  const queryClient = useQueryClient();
  const camera = useRef<MapboxGL.Camera | null>(null);

  useEffect(() => {
    async function passProp() {
      if (!map.current?.getCenter || !map.current?.getZoom) {
        return;
      }
      setSelectedSite({});
      setSelectedArea(null);
      setSelectedAlert({});
      const centerCoordinates = await map.current.getCenter();
      const currZoom = await map.current.getZoom();
      passMapInfo({centerCoordinates, currZoom});
    }
    passProp();
  }, [passMapInfo, selectedSiteBar]);

  useEffect(() => {
    if (
      isCameraRefVisible &&
      siteInfo?.bboxGeo?.length > 0 &&
      camera?.current?.fitBounds
    ) {
      setSelected(0);
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
  }, [isCameraRefVisible, setSelected, siteInfo?.bboxGeo, siteInfo?.siteInfo]);

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

  // Fetch incident data when an alert with siteIncidentId is selected
  const {incident} = useIncidentData({
    incidentId: selectedAlert?.siteIncidentId,
    enabled: !!selectedAlert?.siteIncidentId,
  });

  const {data: sites} = trpc.site.getSites.useQuery(['site', 'getSites'], {
    enabled: true,
    retryDelay: 3000,
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  // Fetch protected sites to optionally highlight one on app open
  const {data: protectedSites} = (trpc.site as any).getProtectedSites.useQuery(
    ['site', 'getProtectedSites'],
    {
      enabled: true,
      retryDelay: 3000,
      staleTime: 'Infinity',
      cacheTime: 'Infinity',
      keepPreviousData: true,
    },
  );

  const formattedSites = useMemo(
    () => categorizedRes(sites?.json?.data || [], 'type'),
    [sites],
  );

  // Filter alerts by duration
  const filteredAlerts = useMemo(() => {
    if (!alerts?.json?.data) return [];
    const cutoffDate = moment().subtract(mapDurationDays, 'days');
    return alerts.json.data.filter(alert =>
      moment(alert.eventDate).isAfter(cutoffDate),
    );
  }, [alerts, mapDurationDays]);

  // Compose incidents from filtered alerts
  const composedIncidents = useMemo(() => {
    if (mapDisplayMode !== 'incidents') return [];

    const incidentMap = new Map();
    filteredAlerts.forEach(alert => {
      if (alert.siteIncidentId) {
        if (!incidentMap.has(alert.siteIncidentId)) {
          incidentMap.set(alert.siteIncidentId, {
            incidentId: alert.siteIncidentId,
            siteId: alert.site?.id,
            alerts: [],
          });
        }
        incidentMap.get(alert.siteIncidentId).alerts.push(alert);
      }
    });

    return Array.from(incidentMap.values())
      .slice(0, 60)
      .map(incident => ({
        ...incident,
        alertCount: incident.alerts.length,
        circle: generateIncidentCircle(
          incident.alerts.map(a => ({
            latitude: a.latitude,
            longitude: a.longitude,
          })),
          0.5,
        ),
      }));
  }, [filteredAlerts, mapDisplayMode]);

  // Calculate incident circle with memoization
  const incidentCircle = useMemo(() => {
    if (!incident?.siteAlerts) {
      return null;
    }

    const fires = incident.siteAlerts.map(a => ({
      latitude: a.latitude,
      longitude: a.longitude,
    }));

    return generateIncidentCircle(fires, 0.5);
  }, [incident?.siteAlerts]);

  // Update incident circle data when calculation completes
  useEffect(() => {
    setIncidentCircleData(incidentCircle);
  }, [incidentCircle]);

  const updateUser = trpc.user.updateUser.useMutation({
    retryDelay: 3000,
    onSuccess: () => {
      const request = {
        onSuccess: async _message => {},
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

  const updateSite = trpc.site.updateSite.useMutation({
    retryDelay: 3000,
    onSuccess: (res, _req) => {
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

  const deleteProtectedSite = trpc.site.deleteProtectedSite.useMutation({
    retryDelay: 3000,
    onSuccess: async () => {
      await queryClient.invalidateQueries([
        ['site', 'getProtectedSites'],
        {input: ['site', 'getProtectedSites'], type: 'query'},
      ]);
      await queryClient.invalidateQueries([
        ['alert', 'getAlerts'],
        {input: ['alerts', 'getAlerts'], type: 'query'},
      ]);
      setSelectedSite({});
      setSelectedArea(null);
      toast.show('Deleted', {type: 'success'});
    },
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const deleteSiteButtonIsLoading =
    deleteSite.status === 'pending' || deleteProtectedSite.status === 'pending';

  const deleteSiteButtonIsDisabled = (() => {
    const isProjectSite = !!(selectedSite as any)?.site?.project?.id;
    return (
      deleteSite.status === 'pending' ||
      deleteProtectedSite.status === 'pending' ||
      isProjectSite
    );
  })();

  const pauseAlertForProtectedSite = (
    trpc.site as any
  ).pauseAlertForProtectedSite.useMutation({
    retryDelay: 3000,
    onSuccess: async (res, _req) => {
      queryClient.setQueryData(
        [
          ['site', 'getProtectedSites'],
          {input: ['site', 'getProtectedSites'], type: 'query'},
        ],
        (oldData: any) => {
          return oldData
            ? {
                ...oldData,
                json: {
                  ...oldData?.json,
                  data: oldData?.json?.data?.map((item: any) =>
                    item.id === res?.json?.data?.id ? res?.json?.data : item,
                  ),
                },
              }
            : null;
        },
      );
      if (res?.json?.data.hasOwnProperty('isActive')) {
        setSelectedSite({site: res?.json?.data});
      }
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
    setSiteGeometry(site.geometry.type);
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
    if (siteName?.length >= 5) {
      updateSite.mutate(payload);
    } else {
      modalToast?.current?.show(
        'Site name must be at least 5 characters long.',
        {
          type: 'warning',
        },
      );
    }
  };

  const handleUpdateMonitoringSite = ({
    siteId,
    isMonitoredUpdated,
  }: {
    siteId: string;
    isMonitoredUpdated: boolean;
  }) => {
    const foundInProtectedSites = protectedSites?.json?.data?.find(
      site => site.id === siteId,
    );
    const foundInSites = sites?.json?.data?.find(site => site.id === siteId);
    if (foundInProtectedSites) {
      const {siteRelationId: protectedSiteRelationId, isActive} =
        foundInProtectedSites;
      const isActiveUpdated = !isActive;
      pauseAlertForProtectedSite.mutate({
        json: {
          params: {siteRelationId: protectedSiteRelationId, siteId: siteId},
          body: {isActive: isActiveUpdated},
        },
      });
    } else if (foundInSites) {
      updateSite.mutate({
        json: {
          params: {siteId: siteId},
          body: {isMonitored: isMonitoredUpdated},
        },
      });
    }
  };

  const handleDeleteSite = (siteId: string) => {
    const foundInProtectedSites = protectedSites?.json?.data?.find(
      site => site.id === siteId,
    );
    const foundInSites = sites?.json?.data?.find(site => site.id === siteId);
    if (foundInProtectedSites) {
      const protectedSiteRelationId = foundInProtectedSites?.siteRelationId;
      deleteProtectedSite.mutate({
        json: {
          params: {siteRelationId: protectedSiteRelationId, siteId: siteId},
        },
      });
    } else if (foundInSites) {
      deleteSite.mutate({json: {siteId: siteId}});
    }
  };
  // const handleDeleteSite = (siteId: string) => {
  //   if (!siteId) return;

  //   const foundInProtectedSites = protectedSites?.json?.data?.find(
  //     site => site.id === siteId,
  //   );

  //   if (foundInProtectedSites) {
  //     deleteProtectedSite.mutate({
  //       json: {
  //         params: {
  //           siteRelationId: foundInProtectedSites.siteRelationId,
  //           siteId: siteId,
  //         },
  //       },
  //     });
  //   } else {
  //     deleteSite.mutate({json: {siteId: siteId}});
  //   }
  // };

  // Map display mode handlers
  const handleModeChange = (mode: 'alerts' | 'incidents') => {
    setMapDisplayMode(mode);
    if (mode === 'incidents') {
      setSelectedAlert({});
    } else {
      setSelectedIncidentId(null);
      setIncidentCircleData(null);
    }
  };

  const handleDurationChange = (days: number) => {
    setMapDurationDays(days);
  };

  const handleIncidentTap = async (
    incidentId: string,
    incidentBoundary?: Feature<GeoJsonPolygon> | null,
  ) => {
    try {
      const focusPadding = [80, 40, Math.max(240, SCREEN_HEIGHT * 0.45), 40];
      let hasFocused = false;

      // Try using already-rendered boundary first for reliable instant focus.
      const tappedBoundary =
        incidentBoundary ||
        (composedIncidents.find(item => item.incidentId === incidentId)?.circle
          ?.circlePolygon as Feature<GeoJsonPolygon> | undefined);

      if (tappedBoundary && camera?.current?.fitBounds) {
        const [minLng, minLat, maxLng, maxLat] = bbox(tappedBoundary);
        if (
          [minLng, minLat, maxLng, maxLat].every(value =>
            Number.isFinite(value),
          )
        ) {
          camera.current.fitBounds(
            [maxLng, maxLat],
            [minLng, minLat],
            focusPadding,
            500,
          );
          hasFocused = true;
        }
      }

      // Fallback to server fetch and boundary calculation if local boundary was unavailable.
      if (!hasFocused) {
        const incidentResponse = await (
          trpc as any
        ).siteIncident.getIncident.fetch({json: {incidentId}});

        if (
          incidentResponse?.siteAlerts &&
          incidentResponse.siteAlerts.length > 0
        ) {
          const cameraSettings = calculateIncidentCamera(
            incidentResponse.siteAlerts,
          );

          if (cameraSettings?.bounds && camera?.current?.fitBounds) {
            camera.current.fitBounds(
              cameraSettings.bounds.ne,
              cameraSettings.bounds.sw,
              focusPadding,
              500,
            );
            hasFocused = true;
          } else if (cameraSettings && camera?.current?.setCamera) {
            camera.current.setCamera({
              centerCoordinate: cameraSettings.centerCoordinate,
              zoomLevel: cameraSettings.zoomLevel,
              animationDuration: 500,
            });
            hasFocused = true;
          }
        } else {
          console.warn('[Home] No alerts found for incident zoom calculation');
        }
      }

      // Open incident details with Redux
      dispatch(openIncidentDetails({incidentId}));
      setSelectedIncidentId(null);
    } catch (error) {
      console.error('[Home] Error handling incident tap:', error);
      // Fallback: just open details without zoom
      dispatch(openIncidentDetails({incidentId}));
      setSelectedIncidentId(null);
    }
  };

  const handleAlertTapFromIncident = (alert: any) => {
    // Calculate optimal camera for alert
    const cameraSettings = calculateAlertCamera(
      alert,
      alert.detectedBy,
      alert.confidence,
    );

    // Open alert details with Redux
    dispatch(openAlertDetails({alertId: alert.id, fromIncidentDetails: true}));

    // Apply zoom to alert location with optimal settings
    if (camera?.current?.setCamera && cameraSettings) {
      camera.current.setCamera({
        centerCoordinate: cameraSettings.centerCoordinate,
        zoomLevel: cameraSettings.zoomLevel,
        animationDuration: 500,
      });
    }
  };

  const onPressMyLocationIcon = useCallback(
    (position: MapboxGL.Location | Geolocation.GeoPosition) => {
      if (isCameraRefVisible && camera?.current?.setCamera) {
        setIsInitial(false);
        camera.current.setCamera({
          centerCoordinate: [
            position.coords.longitude,
            position.coords.latitude,
          ],
          // centerCoordinate: [-90.133284, 18.675638],
          zoomLevel: ZOOM_LEVEL,
          animationDuration: ANIMATION_DURATION,
        });
      }
    },
    [isCameraRefVisible],
  );

  // only for the first time map will follow the user's current location by default
  const onUpdateUserLocation = useCallback(
    (userLocation: MapboxGL.Location | Geolocation.GeoPosition | undefined) => {
      if (isInitial && userLocation) {
        onPressMyLocationIcon(userLocation);
      }
    },
    [isInitial, onPressMyLocationIcon],
  );

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
    setProfileModalVisible(false);
    setTimeout(() => {
      clearCredentials()
        .then(() => clearSession({}, {useLegacyCallbackUrl: true}))
        .then(async () => {
          dispatch(updateIsLoggedIn(false));
          queryClient.clear();
          await clearAll();
        })
        .catch(error => {
          console.log('Error ocurred', error);
        });
    }, 300);
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
    const alertsArr = filteredAlerts;
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
        onSelected={_e => {
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
          setTimeout(() => {
            const alert = alertsArr[counter];
            // Use Redux state instead of selectedAlert
            dispatch(
              openAlertDetails({
                alertId: alert.id,
                fromIncidentDetails: false,
              }),
            );
          }, ANIMATION_DURATION);
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
          console.log('[0] Is it called?');
          console.log({formattedSites, eId: e?.id});

          let pointInfo = formattedSites?.point?.filter(
            site => site.id === e?.id,
          )[0];
          console.log(pointInfo);
          camera.current.setCamera({
            centerCoordinate: pointInfo?.geometry?.coordinates,
            zoomLevel: 15,
            animationDuration: 500,
          });
          setSelectedSite({...{site: pointInfo}});
        }}
        coordinate={coordinate}>
        <PointSiteIcon />
      </MapboxGL.PointAnnotation>
    );
  };

  const renderAnnotations = isAlert => {
    const items = [];
    const arr = isAlert ? filteredAlerts : formattedSites?.point;
    for (let i = 0; i < arr?.length; i++) {
      {
        isAlert
          ? items.push(renderAnnotation(i))
          : items.push(renderSelectedPoint(i));
      }
    }
    return items;
  };

  const renderIncidentCircles = () => {
    if (mapDisplayMode !== 'incidents' || composedIncidents.length === 0) {
      return null;
    }

    return composedIncidents.map(incident => {
      if (!incident.circle) return null;

      const circleColor = Colors.INCIDENT_ACTIVE_COLOR;

      return (
        <MapboxGL.ShapeSource
          key={`incident-${incident.incidentId}`}
          id={`incident-circle-${incident.incidentId}`}
          shape={incident.circle.circlePolygon}
          onPress={() =>
            handleIncidentTap(
              incident.incidentId,
              incident.circle?.circlePolygon,
            )
          }>
          <MapboxGL.FillLayer
            id={`incident-circle-fill-${incident.incidentId}`}
            style={{
              fillColor: circleColor,
              fillOpacity: 0.25,
            }}
          />
          <MapboxGL.LineLayer
            id={`incident-circle-line-${incident.incidentId}`}
            style={{
              lineWidth: 3,
              lineColor: circleColor,
              lineOpacity: 1,
            }}
          />
        </MapboxGL.ShapeSource>
      );
    });
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
              geometry:
                singleSite?.geometry?.type === 'MultiPolygon'
                  ? (rewind(singleSite?.geometry) as any)
                  : singleSite?.geometry?.type === 'Polygon'
                  ? (rewind(singleSite?.geometry) as any)
                  : singleSite?.geometry,
            };
          }) || [],
      }}>
      <MapboxGL.FillLayer
        id="fillLayer"
        style={{
          fillColor: Colors.GRADIENT_PRIMARY,
          fillOpacity: 0.25,
        }}
      />
      <MapboxGL.LineLayer
        id="fillOutline"
        style={{
          lineWidth: 1.5,
          lineColor: Colors.WHITE,
          lineOpacity: 0.9,
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
            ?.map(singleSite => {
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

  const renderProtectedAreasSource = () => (
    <MapboxGL.ShapeSource
      id={'protected-polygons'}
      shape={{
        type: 'FeatureCollection',
        features:
          (protectedSites?.json?.data || [])
            ?.filter(single => single?.project === null)
            ?.filter(
              single =>
                single?.geometry?.type === 'Polygon' ||
                single?.geometry?.type === 'MultiPolygon',
            )
            ?.map(single => ({
              type: 'Feature',
              properties: {site: single},
              geometry:
                single?.geometry?.type === 'MultiPolygon'
                  ? (rewind(single?.geometry) as any)
                  : single?.geometry?.type === 'Polygon'
                  ? (rewind(single?.geometry) as any)
                  : single?.geometry,
            })) ?? [],
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
        id={'protected-polyFill'}
        layerIndex={2}
        style={{
          fillColor: Colors.WHITE,
          fillOpacity: 0.4,
        }}
      />
      <MapboxGL.LineLayer
        id={'protected-polyline'}
        style={{
          lineWidth: 2,
          lineColor: Colors.WHITE,
          lineOpacity: 1,
          lineJoin: 'bevel',
        }}
      />
    </MapboxGL.ShapeSource>
  );

  /**
   * Renders the incident circle on the map
   * Shows a circular polygon encompassing all fires in the incident
   */
  const renderIncidentCircle = () => {
    if (!incidentCircleData) {
      return null;
    }

    if (!incident) {
      return null;
    }

    const circleColor = incident.isActive
      ? Colors.INCIDENT_ACTIVE_COLOR
      : Colors.INCIDENT_RESOLVED_COLOR;

    return (
      <MapboxGL.ShapeSource
        id="incident-circle"
        shape={incidentCircleData.circlePolygon}>
        <MapboxGL.FillLayer
          id="incident-circle-fill"
          style={{
            fillColor: circleColor,
            fillOpacity: 0.25,
          }}
        />
        <MapboxGL.LineLayer
          id="incident-circle-line"
          style={{
            lineWidth: 3,
            lineColor: circleColor,
            lineOpacity: 1,
          }}
        />
      </MapboxGL.ShapeSource>
    );
  };

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
        {renderProtectedAreasSource()}
        {/* highlighted */}
        {selectedArea && renderHighlightedMapSource()}
        {/* incident circles - shown in incidents mode */}
        {mapDisplayMode === 'incidents' && renderIncidentCircles()}
        {/* incident circle for selected alert - shown in alerts mode */}
        {mapDisplayMode === 'alerts' && renderIncidentCircle()}
        {/* for alerts - shown in alerts mode */}
        {mapDisplayMode === 'alerts' && renderAnnotations(true)}
        {/* for point sites - always shown */}
        {renderAnnotations(false)}
      </MapboxGL.MapView>
      {Object.keys(selectedAlert).length ? (
        <Lottie source={highlightWave} autoPlay loop style={styles.alertSpot} />
      ) : null}
      <StatusBar
        animated
        translucent
        barStyle={
          profileEditModal || siteNameModalVisible
            ? 'dark-content'
            : 'light-content'
        }
        backgroundColor={
          profileEditModal || siteNameModalVisible
            ? Colors.WHITE
            : Colors.TRANSPARENT
        }
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
      {/* Map display mode controls */}
      <View style={styles.mapControlsContainer}>
        <MapDisplayModeSwitcher
          mode={mapDisplayMode}
          onModeChange={handleModeChange}
        />
        <View style={styles.controlSpacer} />
        <MapDurationDropdown
          durationDays={mapDurationDays}
          onDurationChange={handleDurationChange}
        />
      </View>
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
                  style={[styles.userAvatar, {width: 82, height: 82}]}
                />
              ) : (
                <UserPlaceholder width={82} height={82} />
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
      {/* incident details modal */}
      <IncidentDetailsBottomSheet
        isVisible={detailsUI.isIncidentDetailsVisible}
        incidentId={detailsUI.selectedIncidentId}
        onClose={() => dispatch(closeAllDetails())}
        onAlertTap={handleAlertTapFromIncident}
        onStopAlerts={_incidentId => {
          // Placeholder implementation for stopping alerts
          toast.show('Stop alerts feature will be implemented later', {
            type: 'warning',
          });
        }}
      />

      {/* alert details modal */}
      <AlertDetailsBottomSheet
        isVisible={detailsUI.isAlertDetailsVisible}
        alertId={detailsUI.selectedAlertId}
        onClose={() => dispatch(closeAllDetails())}
        onBack={() => dispatch(backToIncidentDetails())}
        showBackButton={
          detailsUI.uiMode === 'alert-details' &&
          detailsUI.alertOpenedFromIncidentDetails
        }
      />
      {/* site Info modal */}
      <BottomSheet
        isVisible={!!Object.keys(selectedSite)?.length}
        backdropColor={'transparent'}
        enableDynamicSizing
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
            {selectedSite?.site?.siteRelationId ? (
              <></>
            ) : (
              <TouchableOpacity
                onPress={() => handleEditSite(selectedSite?.site)}>
                <PencilIcon />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            disabled={
              updateSite?.isLoading || pauseAlertForProtectedSite?.isLoading
            }
            onPress={() => {
              handleUpdateMonitoringSite({
                siteId: selectedSite?.site?.id,
                isMonitoredUpdated: !selectedSite?.site?.isMonitored,
              });
            }}
            style={[styles.simpleBtn]}>
            {updateSite?.isLoading || pauseAlertForProtectedSite?.isLoading ? (
              <ActivityIndicator color={Colors.PRIMARY} />
            ) : (
              <>
                {selectedSite?.site?.siteRelationId ? (
                  selectedSite?.site?.isActive ? (
                    <>
                      <EyeOffIcon />
                      <Text style={[styles.siteActionText]}>
                        Disable Monitoring
                      </Text>
                    </>
                  ) : (
                    <>
                      <EyeIcon />
                      <Text style={[styles.siteActionText]}>
                        Enable Monitoring
                      </Text>
                    </>
                  )
                ) : selectedSite?.site?.isMonitored ? (
                  <>
                    <EyeOffIcon />
                    <Text style={[styles.siteActionText]}>
                      Disable Monitoring
                    </Text>
                  </>
                ) : (
                  <>
                    <EyeIcon />
                    <Text style={[styles.siteActionText]}>
                      Enable Monitoring
                    </Text>
                  </>
                )}
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            disabled={deleteSiteButtonIsDisabled}
            onPress={() => handleDeleteSite((selectedSite as any)?.site?.id)}
            style={[
              styles.simpleBtn,
              deleteSiteButtonIsDisabled && styles.simpleBtnDisabled,
              (selectedSite as any)?.site?.project?.id && {
                borderColor: Colors.GRAY_LIGHTEST,
              },
            ]}>
            {deleteSiteButtonIsLoading ? (
              <ActivityIndicator color={Colors.PRIMARY} />
            ) : (
              <>
                {(selectedSite as any)?.site?.project?.id ? (
                  <DisabledTrashOutlineIcon />
                ) : (
                  <TrashOutlineIcon />
                )}
                <Text
                  style={[
                    styles.siteActionText,
                    (selectedSite as any)?.site?.project?.id && {
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
          <Toast ref={modalToast} offsetBottom={100} duration={2000} />
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
                  items={
                    siteGeometry === 'Point' ? POINT_RADIUS_ARR : RADIUS_ARR
                  }
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
  mapControlsContainer: {
    position: 'absolute',
    top: 80,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  controlSpacer: {
    width: 8,
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
    marginTop: 10,
    marginBottom: 8,
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
  simpleBtnDisabled: {
    opacity: 0.5,
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
