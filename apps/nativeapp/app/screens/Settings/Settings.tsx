import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useContext,
  useCallback,
} from 'react';
import {
  Text,
  View,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  ScrollView,
  Dimensions,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import bbox from '@turf/bbox';
import rewind from '@mapbox/geojson-rewind';
import {OneSignal} from 'react-native-onesignal';
import DeviceInfo from 'react-native-device-info';
import Toast from 'react-native-toast-notifications';
import {useQueryClient} from '@tanstack/react-query';
import LinearGradient from 'react-native-linear-gradient';
import {useToast} from 'react-native-toast-notifications';
import {point, polygon, multiPolygon} from '@turf/helpers';

import {
  Switch,
  DropDown,
  BottomSheet,
  CustomButton,
  FloatingInput,
} from '../../components';
import {
  AddIcon,
  SmsIcon,
  NatureBg,
  NasaLogo,
  BellIcon,
  PhoneIcon,
  CrossIcon,
  GlobeIcon,
  EmailIcon,
  PlanetLogo,
  PencilIcon,
  LayerCheck,
  WarningIcon,
  LocationWave,
  GlobeWebIcon,
  DistanceIcon,
  DropdownArrow,
  TrashSolidIcon,
  MapOutlineIcon,
  TrashOutlineIcon,
  VerificationWarning,
  DisabledTrashOutlineIcon,
  WhatsAppIcon,
} from '../../assets/svgs';
import {trpc} from '../../services/trpc';
import {Colors, Typography} from '../../styles';
import handleLink from '../../utils/browserLinking';
import {getDeviceInfo} from '../../utils/deviceInfo';
import {FONT_FAMILY_BOLD} from '../../styles/typography';
// import {useAppDispatch, useAppSelector} from '../../hooks';
import {BottomBarContext} from '../../global/reducers/bottomBar';
import {extractCountryCode} from '../../utils/countryCodeFilter';
// import {updateUserDetails} from '../../redux/slices/login/loginSlice';
import {POINT_RADIUS_ARR, RADIUS_ARR, WEB_URLS} from '../../constants';
import {categorizedRes, groupSitesAsProject} from '../../utils/filters';
import ProtectedSitesSettings from './ProtectedSitesSettings';
import {
  ComingSoonBadge,
  DisabledBadge,
  DisabledNotificationInfo,
} from './Badges';
import {useSelector} from 'react-redux';
import {RootState} from '../../redux/store';
import {useNavigation} from '@react-navigation/native';
// import {PromptInAppUpdatePanel} from '../../PromptInAppUpdate';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const IS_ANDROID = Platform.OS === 'android';

const Settings = () => {
  const navigation = useNavigation();
  const {alertMethods} = useSelector((state: RootState) => state.settingsSlice);

  const [siteId, setSiteId] = useState<string | null>('');
  const [pageXY, setPageXY] = useState<object | null>(null);
  const [siteName, setSiteName] = useState<string | null>('');
  const [siteGeometry, setSiteGeometry] = useState<string | null>('');
  const [siteRad, setSiteRad] = useState<object | null>(RADIUS_ARR[4]);
  const [isEditSite, setIsEditSite] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [dropDownModal, setDropDownModal] = useState<boolean>(false);
  const [sitesInfoModal, setSitesInfoModal] = useState<boolean>(false);
  const [delAlertMethodArr, setDelAlertMethodArr] = useState<Array<string>>([]);
  const [radiusLoaderArr, setRadiusLoaderArr] = useState<Array<string>>([]);
  const [alertMethodLoaderArr, setAlertMethodLoaderArr] = useState<
    Array<string>
  >([]);
  const [reRender, setReRender] = useState<boolean>(false);
  const [deviceAlertPreferences, setDeviceAlertPreferences] = useState<
    object[]
  >([]);
  const [siteNameModalVisible, setSiteNameModalVisible] =
    useState<boolean>(false);
  const [selectedSiteInfo, setSelectedSiteInfo] = useState<boolean | null>(
    null,
  );

  const toast = useToast();
  const modalToast = useRef();
  const queryClient = useQueryClient();
  const {openModal} = useContext(BottomBarContext);

  const {
    data: sites,
    refetch: refetchSites,
    isSuccess: sitesSuccess,
    isFetching: isFetchingSites,
  } = trpc.site.getSites.useQuery(['site', 'getSites'], {
    enabled: true,
    retryDelay: 3000,
    staleTime: 'Infinity',
    cacheTime: 'Infinity',
    keepPreviousData: true,
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const groupOfSites = useMemo(
    () => groupSitesAsProject(sites?.json?.data || []),
    [sites],
  );

  const {
    data: alertPreferences,
    refetch: refetchAlertPreferences,
    isFetching: isFetchingAlertPreferences,
  } = trpc.alertMethod.getAlertMethods.useQuery(undefined, {
    enabled: sitesSuccess,
    retryDelay: 3000,
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });
  const formattedAlertPreferences = useMemo(
    () => categorizedRes(alertPreferences?.json?.data || [], 'method'),
    [alertPreferences],
  );

  const deviceNotification = useCallback(async () => {
    try {
      const {deviceId} = await getDeviceInfo();
      // const {userId} = await OneSignal.getDeviceState(); // Old SDK
      const userId = await OneSignal.User.pushSubscription.getIdAsync();

      const filterDeviceAlertMethod = formattedAlertPreferences.device.filter(
        el => userId === el?.destination && el.deviceId === deviceId,
      );
      if (filterDeviceAlertMethod.length > 0) {
        const filteredData = filterDeviceAlertMethod[0];
        const nonFilteredData = formattedAlertPreferences.device.filter(
          el => userId !== el?.destination || el.deviceId !== deviceId,
        );
        formattedAlertPreferences.device = [
          filteredData,
          ...nonFilteredData,
        ].filter(el => el.deviceName !== '');
      }

      setDeviceAlertPreferences(formattedAlertPreferences?.device);
    } catch {
      setDeviceAlertPreferences([]);
    }
  }, [formattedAlertPreferences, setDeviceAlertPreferences]);

  useEffect(() => {
    deviceNotification();
  }, [reRender, deviceNotification]);

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
      setSitesInfoModal(false);
      toast.show('Site deleted', {type: 'success'});
    },
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const deleteSiteButtonIsLoading = deleteSite.status === 'pending';

  const deleteSiteButtonIsDisabled = (() => {
    const isProjectSite = !!selectedSiteInfo?.project?.id;
    return deleteSite.status === 'pending' || isProjectSite;
  })();

  const deleteAlertMethod = trpc.alertMethod.deleteAlertMethod.useMutation({
    retryDelay: 3000,
    onSuccess: (data, req) => {
      queryClient.setQueryData(
        [['alertMethod', 'getAlertMethods'], {type: 'query'}],
        oldData =>
          oldData
            ? {
                ...oldData,
                json: {
                  ...oldData.json,
                  data: oldData.json.data.filter(
                    item => item.id !== req?.json?.alertMethodId,
                  ),
                },
              }
            : null,
      );
      const loadingArr = delAlertMethodArr.filter(
        el => el !== req?.json?.alertMethodId,
      );
      setDelAlertMethodArr(loadingArr);
      setReRender(!reRender);
    },
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  // const updateUser = trpc.user.updateUser.useMutation({
  //   retryDelay: 3000, // Delay between retry attempts in milliseconds
  //   onSuccess: res => {
  //     dispatch(updateUserDetails(res?.json));
  //   },
  //   onError: () => {
  //     toast.show('Something went wrong', { type: 'danger' });
  //   },
  // });

  const updateSite = trpc.site.updateSite.useMutation({
    retryDelay: 3000,
    onSuccess: res => {
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
      const loadingArr = radiusLoaderArr.filter(
        el => el !== res?.json?.data?.id,
      );
      setRadiusLoaderArr(loadingArr);
      setSiteNameModalVisible(false);
    },
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const updateAlertPreferences = trpc.alertMethod.updateAlertMethod.useMutation(
    {
      retryDelay: 3000,
      onSuccess: res => {
        queryClient.setQueryData(
          [['alertMethod', 'getAlertMethods'], {type: 'query'}],
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
        const loadingArr = alertMethodLoaderArr.filter(
          el => el !== res?.json?.data?.id,
        );
        setAlertMethodLoaderArr(loadingArr);
        setReRender(!reRender);
      },
      onError: () => {
        toast.show('something went wrong', {type: 'danger'});
      },
    },
  );

  const verifyAlertPreference = trpc.alertMethod.sendVerification.useMutation({
    retryDelay: 3000,
    onSuccess: (data, variables) => {
      if (data?.json?.status === 403) {
        return toast.show(data?.json?.message || 'something went wrong', {
          type: 'warning',
        });
      }
      const alertMethod = alertPreferences?.json?.data?.filter(
        item => item.id === variables?.json?.alertMethodId,
      );
      navigation.navigate('Otp', {
        verificationType: alertMethod[0]?.method,
        alertMethod: alertMethod[0],
      });
    },
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const handleSelectRadius = val => {
    if (pageXY.projectId) {
      updateSite.mutate({
        json: {params: {siteId: pageXY?.siteId}, body: {radius: val}},
      });
    } else {
      updateSite.mutate({
        json: {params: {siteId: pageXY?.siteId}, body: {radius: val}},
      });
    }
    setDropDownModal(false);
  };

  const handleRadius = (
    evt,
    projectId,
    projectSiteId,
    projectSiteRadius,
    projectSiteGeometry,
  ) => {
    setPageXY({
      x: evt.nativeEvent.pageX,
      y: evt.nativeEvent.pageY,
      projectId,
      siteId: projectSiteId,
      siteRadius: projectSiteRadius,
      siteGeometry: projectSiteGeometry,
    });
    setDropDownModal(!dropDownModal);
  };

  const handleSiteRadius = (
    evt,
    siteSiteId,
    siteSiteRadius,
    siteSiteGeometry,
  ) => {
    setPageXY({
      x: evt.nativeEvent.pageX,
      y: evt.nativeEvent.pageY,
      siteId: siteSiteId,
      siteRadius: siteSiteRadius,
      siteGeometry: siteSiteGeometry,
    });
    setDropDownModal(!dropDownModal);
  };

  const handleNotifySwitch = (data, isEnabled) => {
    const {alertMethodId} = data;
    setAlertMethodLoaderArr(prevState => [...prevState, alertMethodId]);
    updateAlertPreferences.mutate({
      json: {params: {alertMethodId}, body: {isEnabled}},
    });
  };

  const _handleVerify = alertMethodData => () => {
    verifyAlertPreference.mutate({
      json: {alertMethodId: alertMethodData.id},
    });
  };

  const handleRemoveAlertMethod = alertMethodId => {
    setDelAlertMethodArr(prevState => [...prevState, alertMethodId]);
    deleteAlertMethod.mutate({json: {alertMethodId}});
  };

  const handleSiteInformation = item => {
    setSelectedSiteInfo(item);
    setSitesInfoModal(!sitesInfoModal);
  };

  const handleEditSite = site => {
    setSitesInfoModal(false);
    setSiteName(site.name);
    setSiteId(site.id);
    setIsEditSite(!!site.remoteId);
    setSiteGeometry(site.geometry.type);
    setSiteRad(RADIUS_ARR.filter(el => el.value === site?.radius)[0]);
    setTimeout(() => setSiteNameModalVisible(true), 1000);
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
      modalToast.current.show('Site name must be at least 5 characters long.', {
        type: 'warning',
      });
    }
  };

  const handleAddEmail = () => {
    navigation.navigate('Verification', {
      verificationType: 'Email',
    });
  };

  const handleAddSms = () => {
    navigation.navigate('Verification', {
      verificationType: 'Sms',
    });
  };

  // ----------------- handle whatsapp, and Geostationary
  const handleAddWhatsapp = () => {
    navigation.navigate('Verification', {
      verificationType: 'Whatsapp',
    });
  };

  // const handleGeostationary = val => {
  //   let detectionMethods = [...userDetails?.data?.detectionMethods];
  //   if (!val) {
  //     detectionMethods = detectionMethods.filter(el => el !== 'GEOSTATIONARY');
  //   } else {
  //     detectionMethods = [...detectionMethods, 'GEOSTATIONARY'];
  //   }
  //   updateUser.mutate({
  //     json: {
  //       body: {
  //         detectionMethods,
  //       },
  //     },
  //   });
  // };

  const handleWebhook = () => {
    navigation.navigate('Verification', {
      verificationType: 'Webhook',
    });
  };

  const handleDeleteSite = (id: string) => {
    deleteSite.mutate({json: {siteId: id}});
  };

  const _handleEcoWeb = (URL: string) => () => handleLink(URL);

  const _handleViewMap = (siteInfo: object) => () => {
    let highlightSiteInfo = siteInfo;
    let bboxGeo;
    setSitesInfoModal(false);
    if (siteInfo?.geometry?.type === 'MultiPolygon') {
      bboxGeo = bbox(multiPolygon(rewind(siteInfo?.geometry.coordinates)));
      highlightSiteInfo = rewind(siteInfo?.geometry);
    } else if (siteInfo?.geometry?.type === 'Point') {
      bboxGeo = bbox(point(siteInfo?.geometry.coordinates));
      highlightSiteInfo = siteInfo?.geometry;
    } else {
      bboxGeo = bbox(polygon(siteInfo?.geometry.coordinates));
      highlightSiteInfo = siteInfo?.geometry;
    }
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

  const handleCloseSiteModal = () => setSiteNameModalVisible(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchSites(), refetchAlertPreferences()]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchSites, refetchAlertPreferences]);

  // Auto-stop refreshing when queries complete
  useEffect(() => {
    if (refreshing && !isFetchingSites && !isFetchingAlertPreferences) {
      setRefreshing(false);
    }
  }, [refreshing, isFetchingSites, isFetchingAlertPreferences]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={'dark-content'}
        backgroundColor={Colors.TRANSPARENT}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            title="refreshing"
            onRefresh={onRefresh}
            refreshing={refreshing}
            tintColor={Colors.GRADIENT_PRIMARY}
            titleColor={Colors.GRADIENT_PRIMARY}
          />
        }>
        {/* Prompt In App Update Panel */}
        {/* <PromptInAppUpdatePanel /> */}
        {/* my projects */}
        <View style={[styles.myProjects, styles.commonPadding]}>
          <Text style={styles.mainHeading}>
            My Projects{' '}
            {Object.keys(groupOfSites[0] || {})?.length > 0 && (
              <Text style={styles.ppLink}>
                <Text onPress={_handleEcoWeb(WEB_URLS.PP_ECO)}>pp.eco</Text>
              </Text>
            )}
          </Text>
          {Object.keys(groupOfSites[0] || {})?.length > 0 ? (
            groupOfSites?.map((item, index) => (
              <View key={`projects_${index}`} style={styles.projectsInfo}>
                <View style={styles.projectsNameInfo}>
                  <Text style={styles.projectsName}>{item.name}</Text>
                </View>
                {item?.sites?.length > 0 && (
                  <View style={styles.sitesViewStyle} />
                )}
                {item?.sites
                  ? item?.sites?.map((sitesItem, sitesIndex) => (
                      <View key={`sites_${sitesIndex}`}>
                        <TouchableOpacity
                          disabled={radiusLoaderArr.includes(sitesItem?.id)}
                          onPress={() => handleSiteInformation(sitesItem)}
                          style={styles.sitesInProjects}>
                          <Text style={styles.sitesName}>
                            {sitesItem?.name}
                          </Text>
                          <View style={styles.rightConPro}>
                            <TouchableOpacity
                              onPress={evt =>
                                handleRadius(
                                  evt,
                                  item?.id,
                                  sitesItem?.id,
                                  sitesItem?.radius,
                                  sitesItem?.geometry?.type,
                                )
                              }
                              disabled={radiusLoaderArr.includes(sitesItem?.id)}
                              style={[
                                styles.dropDownRadius,
                                styles.marginRight5,
                              ]}>
                              <Text style={styles.siteRadius}>
                                {sitesItem?.radius
                                  ? `within ${sitesItem?.radius} km`
                                  : 'inside'}
                              </Text>
                              <DropdownArrow />
                            </TouchableOpacity>
                            {radiusLoaderArr.includes(sitesItem?.id) ? (
                              <ActivityIndicator
                                size={'small'}
                                color={Colors.PRIMARY}
                              />
                            ) : (
                              <Switch
                                value={sitesItem?.isMonitored}
                                onValueChange={val => {
                                  updateSite.mutate({
                                    json: {
                                      params: {siteId: sitesItem?.id},
                                      body: {isMonitored: val},
                                    },
                                  });
                                  setRadiusLoaderArr(prevState => [
                                    ...prevState,
                                    sitesItem?.id,
                                  ]);
                                }}
                              />
                            )}
                          </View>
                        </TouchableOpacity>
                        {item?.sites?.length - 1 !== sitesIndex && (
                          <View style={styles.separator} />
                        )}
                      </View>
                    ))
                  : null}
              </View>
            ))
          ) : (
            <View style={[styles.boxShadowPH]}>
              <View
                style={[
                  styles.mySiteNameContainer,
                  styles.paddingVertical20OverflowHidden,
                ]}>
                <View style={styles.emptyPpInfoCon}>
                  <View style={styles.emptyPpInfo}>
                    <Text style={styles.emptySiteText}>
                      Project sites registered{'\n'}on pp.eco will appear here
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={_handleEcoWeb(WEB_URLS.PP_ECO)}>
                      <LinearGradient
                        useAngle
                        angle={135}
                        angleCenter={{x: 0.5, y: 0.5}}
                        colors={Colors.GREEN_GRADIENT_ARR}
                        style={[styles.visitPPecoBtn]}>
                        <Text style={[styles.visitPPecoBtnText]}>
                          Visit pp.eco
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.planetLogo}>
                    <PlanetLogo />
                  </View>
                </View>
                <View style={styles.natureBgCon}>
                  <NatureBg />
                </View>
              </View>
            </View>
          )}
        </View>
        {/* my sites */}
        <View style={[styles.mySites, styles.commonPadding]}>
          <View style={styles.mySitesHead}>
            <Text style={styles.mainHeading}>My Sites</Text>
          </View>
          {sites?.json?.data?.filter(site => site?.project === null).length >
          0 ? (
            sites?.json?.data
              ?.filter(site => site?.project === null)
              .map((item, index) => (
                <TouchableOpacity
                  disabled={radiusLoaderArr.includes(item?.id)}
                  onPress={() => handleSiteInformation(item)}
                  key={`mySites_${index}`}
                  style={styles.mySiteNameContainer}>
                  <Text style={styles.mySiteName}>
                    {item?.name || item?.id}
                  </Text>
                  <View style={styles.rightConPro}>
                    <TouchableOpacity
                      disabled={radiusLoaderArr.includes(item?.id)}
                      onPress={evt =>
                        handleSiteRadius(
                          evt,
                          item?.id,
                          item?.radius,
                          item.geometry.type,
                        )
                      }
                      style={[styles.dropDownRadius]}>
                      <Text style={styles.siteRadius}>
                        {
                          RADIUS_ARR.filter(
                            ({value}) => item?.radius === value,
                          )[0]?.name
                        }
                      </Text>
                      <DropdownArrow />
                    </TouchableOpacity>
                    {radiusLoaderArr.includes(item?.id) ? (
                      <ActivityIndicator
                        size={'small'}
                        color={Colors.PRIMARY}
                      />
                    ) : (
                      <Switch
                        value={item?.isMonitored}
                        onValueChange={val => {
                          updateSite.mutate({
                            json: {
                              params: {siteId: item?.id},
                              body: {isMonitored: val},
                            },
                          });
                          setRadiusLoaderArr(prevState => [
                            ...prevState,
                            item?.id,
                          ]);
                        }}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))
          ) : (
            <View
              style={[styles.mySiteNameContainer, styles.paddingVertical20]}>
              <View>
                <Text style={styles.emptySiteText}>
                  Create Your Own{'\n'}Fire Alert Site{'\n'}
                  <Text style={styles.receiveNotifications}>
                    and Receive Notifications
                  </Text>
                </Text>
                <TouchableOpacity
                  onPress={openModal}
                  activeOpacity={0.7}
                  style={styles.addSiteBtn}>
                  <AddIcon width={11} height={11} color={Colors.WHITE} />
                  <Text style={[styles.emptySiteText, styles.colorWhite]}>
                    Add Site
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.locWaveCon}>
                <LocationWave />
              </View>
            </View>
          )}
        </View>
        <ProtectedSitesSettings
          radiusLoaderArr={radiusLoaderArr}
          setRadiusLoaderArr={setRadiusLoaderArr}
          setRefreshing={setRefreshing}
          toast={toast}
        />
        {/* notifications */}
        <View style={[styles.myNotifications, styles.commonPadding]}>
          <Text style={styles.mainHeading}>Notifications</Text>
          <View style={styles.mySiteNameMainContainer}>
            <View style={styles.mySiteNameSubContainer}>
              <View style={styles.mobileContainer}>
                <PhoneIcon />
                <Text style={[styles.smallHeading]}>Mobile</Text>
                {!alertMethods?.enabled.device && <DisabledBadge />}
              </View>
            </View>
            {!alertMethods?.enabled.device && (
              <DisabledNotificationInfo method="device" />
            )}
            {deviceAlertPreferences?.length > 0 && (
              <View style={styles.emailContainer}>
                {deviceAlertPreferences?.map((item, i) => (
                  <View key={`emails_${i}`}>
                    <View
                      style={[
                        styles.emailSubContainer,
                        styles.justifyContentSpaceBetween,
                      ]}>
                      <View style={styles.deviceItem}>
                        <Text style={styles.myEmailName}>
                          {item?.deviceName}
                        </Text>
                        {i === 0 && (
                          <View style={styles.deviceTagCon}>
                            <Text style={styles.deviceTag}>
                              {''} this device
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.emailSubContainer}>
                        {alertMethodLoaderArr.includes(item?.id) ? (
                          <ActivityIndicator
                            size={'small'}
                            color={Colors.PRIMARY}
                          />
                        ) : (
                          <Switch
                            value={item?.isEnabled}
                            onValueChange={val =>
                              handleNotifySwitch({alertMethodId: item.id}, val)
                            }
                          />
                        )}
                        {!(i === 0) && (
                          <TouchableOpacity
                            style={styles.trashIcon}
                            disabled={delAlertMethodArr.includes(item?.id)}
                            onPress={() => handleRemoveAlertMethod(item?.id)}>
                            {delAlertMethodArr.includes(item?.id) ? (
                              <ActivityIndicator
                                size={'small'}
                                color={Colors.PRIMARY}
                              />
                            ) : (
                              <TrashSolidIcon />
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    {deviceAlertPreferences?.length - 1 !== i && (
                      <View
                        style={[styles.separator, styles.marginVertical12]}
                      />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
          {/* emails */}
          <View style={styles.mySiteNameMainContainer}>
            <View style={styles.mySiteNameSubContainer}>
              <View style={styles.mobileContainer}>
                <EmailIcon />
                <Text style={[styles.smallHeading]}>Email</Text>
                {!alertMethods?.enabled.email && <DisabledBadge />}
              </View>
              <TouchableOpacity onPress={handleAddEmail}>
                <AddIcon />
              </TouchableOpacity>
            </View>
            {!alertMethods?.enabled.email && (
              <DisabledNotificationInfo method="email" />
            )}
            {formattedAlertPreferences?.email?.length > 0 && (
              <View style={styles.emailContainer}>
                {formattedAlertPreferences?.email?.map((item, i) => (
                  <View key={`emails_${i}`}>
                    <View
                      style={[
                        styles.emailSubContainer,
                        styles.justifyContentSpaceBetween,
                      ]}>
                      <Text style={styles.myEmailName}>
                        {item?.destination}
                      </Text>
                      <View style={styles.emailSubContainer}>
                        {item?.isVerified ? (
                          alertMethodLoaderArr.includes(item?.id) ? (
                            <ActivityIndicator
                              size={'small'}
                              color={Colors.PRIMARY}
                            />
                          ) : (
                            <Switch
                              value={item?.isEnabled}
                              onValueChange={val =>
                                handleNotifySwitch(
                                  {alertMethodId: item.id},
                                  val,
                                )
                              }
                            />
                          )
                        ) : (
                          <TouchableOpacity
                            style={styles.verifiedChipsCon}
                            onPress={_handleVerify(item)}>
                            <View style={styles.verifiedChips}>
                              <VerificationWarning />
                              <Text style={styles.verifiedTxt}>Verify</Text>
                            </View>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.trashIcon}
                          disabled={delAlertMethodArr.includes(item?.id)}
                          onPress={() => handleRemoveAlertMethod(item?.id)}>
                          {delAlertMethodArr.includes(item?.id) ? (
                            <ActivityIndicator
                              size={'small'}
                              color={Colors.PRIMARY}
                            />
                          ) : (
                            <TrashSolidIcon />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                    {formattedAlertPreferences?.email?.length - 1 !== i && (
                      <View
                        style={[styles.separator, styles.marginVertical12]}
                      />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
          {/* whatsapp */}
          {/* <View style={styles.mySiteNameMainContainer}>
            <View style={styles.mySiteNameSubContainer}>
              <View style={styles.mobileContainer}>
                <WhatsAppIcon />
                <Text style={styles.smallHeading}>WhatsApp</Text>
                {!alertMethods?.enabled.whatsapp && <DisabledBadge />}
              </View>
              <TouchableOpacity onPress={handleAddWhatsapp}>
                <AddIcon />
              </TouchableOpacity>
            </View>
            {formattedAlertPreferences?.whatsapp?.length > 0 && (
              <View style={styles.emailContainer}>
                {formattedAlertPreferences?.whatsapp?.map((item, i) => (
                  <View key={`whatsapp_${i}`}>
                    <View
                      style={[
                        styles.emailSubContainer,
                        styles.justifyContentSpaceBetween,
                      ]}>
                      <Text style={styles.myEmailName}>
                        {item?.destination}
                      </Text>
                      <View style={styles.emailSubContainer}>
                        {item?.isVerified ? (
                          alertMethodLoaderArr.includes(item?.id) ? (
                            <ActivityIndicator
                              size={'small'}
                              color={Colors.PRIMARY}
                            />
                          ) : (
                            <Switch
                              value={item?.isEnabled}
                              onValueChange={val =>
                                handleNotifySwitch(
                                  {alertMethodId: item?.id},
                                  val,
                                )
                              }
                            />
                          )
                        ) : (
                          <TouchableOpacity
                            style={styles.verifiedChipsCon}
                            onPress={_handleVerify(item)}>
                            <View style={styles.verifiedChips}>
                              <VerificationWarning />
                              <Text style={styles.verifiedTxt}>Verify</Text>
                            </View>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.marginLeft20}
                          onPress={() => handleRemoveAlertMethod(item?.id)}>
                          <TrashSolidIcon />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {formattedAlertPreferences?.whatsapp?.length - 1 !== i && (
                      <View style={[styles.separator, styles.marginVertical12]} />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View> */}
          {/* sms */}
          <View style={styles.mySiteNameMainContainer}>
            <View style={styles.mySiteNameSubContainer}>
              <View style={styles.mobileContainer}>
                <SmsIcon />
                <Text style={styles.smallHeading}>SMS</Text>
                {!alertMethods?.enabled.sms && <DisabledBadge />}
              </View>
              <TouchableOpacity onPress={handleAddSms}>
                <AddIcon />
              </TouchableOpacity>
            </View>
            {!alertMethods?.enabled.sms && (
              <DisabledNotificationInfo method="sms" />
            )}
            {formattedAlertPreferences?.sms?.length > 0 && (
              <View style={styles.emailContainer}>
                {formattedAlertPreferences?.sms?.map((item, i) => (
                  <View key={`sms_${i}`}>
                    <View
                      style={[
                        styles.emailSubContainer,
                        styles.justifyContentSpaceBetween,
                      ]}>
                      <Text style={styles.myEmailName}>
                        {extractCountryCode(item?.destination).countryCode +
                          ' ' +
                          extractCountryCode(item?.destination).remainingNumber}
                      </Text>
                      <View style={styles.emailSubContainer}>
                        {item?.isVerified ? (
                          alertMethodLoaderArr.includes(item?.id) ? (
                            <ActivityIndicator
                              size={'small'}
                              color={Colors.PRIMARY}
                            />
                          ) : (
                            <Switch
                              value={item?.isEnabled}
                              onValueChange={val =>
                                handleNotifySwitch(
                                  {alertMethodId: item.id},
                                  val,
                                )
                              }
                            />
                          )
                        ) : (
                          <TouchableOpacity
                            style={styles.verifiedChipsCon}
                            onPress={_handleVerify(item)}>
                            <View style={styles.verifiedChips}>
                              <VerificationWarning />
                              <Text style={styles.verifiedTxt}>Verify</Text>
                            </View>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={styles.trashIcon}
                          disabled={delAlertMethodArr.includes(item?.id)}
                          onPress={() => handleRemoveAlertMethod(item?.id)}>
                          {delAlertMethodArr.includes(item?.id) ? (
                            <ActivityIndicator color={Colors.PRIMARY} />
                          ) : (
                            <TrashSolidIcon />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                    {formattedAlertPreferences?.sms?.length - 1 !== i && (
                      <View
                        style={[styles.separator, styles.marginVertical12]}
                      />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
          {/* webhooks */}
          <View style={styles.mySiteNameMainContainer}>
            <View style={styles.mySiteNameSubContainer}>
              <View style={styles.mobileContainer}>
                <GlobeWebIcon width={17} height={17} />
                <Text style={styles.smallHeading}>Webhook</Text>
                {!alertMethods?.enabled.webhook && <DisabledBadge />}
              </View>
              <TouchableOpacity onPress={handleWebhook}>
                <AddIcon />
              </TouchableOpacity>
            </View>
            {formattedAlertPreferences?.webhook?.length > 0 && (
              <View style={styles.emailContainer}>
                {formattedAlertPreferences?.webhook?.map((item, i) => (
                  <View key={`webhook_${i}`}>
                    <View
                      style={[
                        styles.emailSubContainer,
                        styles.justifyContentSpaceBetween,
                      ]}>
                      <Text style={styles.myEmailName}>
                        {item?.destination}
                      </Text>
                      <View style={styles.emailSubContainer}>
                        {item?.isVerified ? (
                          alertMethodLoaderArr.includes(item?.id) ? (
                            <ActivityIndicator
                              size={'small'}
                              color={Colors.PRIMARY}
                            />
                          ) : (
                            <Switch
                              value={item?.isEnabled}
                              onValueChange={val =>
                                handleNotifySwitch(
                                  {alertMethodId: item.id},
                                  val,
                                )
                              }
                            />
                          )
                        ) : (
                          <TouchableOpacity
                            style={styles.verifiedChipsCon}
                            onPress={_handleVerify(item)}>
                            <View style={styles.verifiedChips}>
                              <VerificationWarning />
                              <Text style={styles.verifiedTxt}>Verify</Text>
                            </View>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.trashIcon}
                          disabled={delAlertMethodArr.includes(item?.id)}
                          onPress={() => handleRemoveAlertMethod(item?.id)}>
                          {delAlertMethodArr.includes(item?.id) ? (
                            <ActivityIndicator color={Colors.PRIMARY} />
                          ) : (
                            <TrashSolidIcon />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                    {formattedAlertPreferences?.webhook?.length - 1 !== i && (
                      <View
                        style={[styles.separator, styles.marginVertical12]}
                      />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
        {/* Warning */}
        <View style={styles.alertWarningContainer}>
          <View style={styles.warningHeader}>
            <WarningIcon />
            <Text style={styles.warning}>WARNING!</Text>
          </View>
          <View style={styles.alertWarningSubContainer}>
            <Text style={styles.warningHeading}>Not all fires detected</Text>
            <Text style={styles.warningText}>
              You should not rely on FireAlert exclusively. Many fires will not
              be detected by the system, for instance if is cloudy or the fire
              is relatively small.
            </Text>
            <Text style={styles.warningText}>
              Active fire/thermal anomalies may be from fire, hot smoke,
              agriculture, gas flares, volcanoes or other sources.{' '}
              <Text
                style={[
                  styles.secondaryUnderline,
                  styles.textDecorationLineUnderline,
                ]}
                onPress={_handleEcoWeb(WEB_URLS.FIRMS_FAQ)}>
                FAQs
              </Text>
            </Text>
            <Text style={styles.warningText}>
              Sun glint or bright water can cause false alarms.
            </Text>
            <Text style={styles.warningText}>
              Fires must be relatively large to be detected by the main systems.
              For instance, MODIS usually detects both flaming and smouldering
              fires 1000 m2 in size. Under ideal conditions, flaming fires one
              tenth this size can be detected.
            </Text>
          </View>
        </View>
        {/* geoStationary */}
        <View style={[styles.geostationaryMainContainer, styles.commonPadding]}>
          <View style={styles.comingSoonCon}>
            <Text style={styles.subHeading}>Geostationary</Text>
            {/* <View style={[styles.deviceTagCon, styles.comingSoon]}>
              <Text style={styles.deviceTag}>Coming Soon</Text>
            </View> */}
            <ComingSoonBadge />
          </View>
          <Text style={styles.desc}>
            Quick detection but many false alarms [BETA]
          </Text>
          <View style={styles.geostationaryInfoContainer}>
            <View style={styles.iconContainer}>
              <BellIcon />
              <Text style={styles.geoDesc}>Checks every 10 to 15 min</Text>
            </View>
            <View style={styles.iconContainer}>
              <GlobeIcon />
              <Text style={styles.geoDesc}>~30 min alert delay</Text>
            </View>
            <View style={styles.iconContainer}>
              <DistanceIcon />
              <Text style={styles.geoDesc}>2–4.5 km resolution</Text>
            </View>
          </View>
        </View>
        {/* Polar-Orbiting Satellites */}
        <View style={[styles.polarOrbitMainContainer, styles.commonPadding]}>
          <Text style={styles.subHeading}>Polar-Orbiting Satellites</Text>
          <Text style={styles.desc}>Delayed detection but very reliable</Text>
          <View style={styles.geostationaryInfoContainer}>
            <Text style={styles.descBold}>VIIRS</Text>
            <View style={styles.iconContainer}>
              <BellIcon />
              <Text style={styles.geoDesc}>Checks every ~12 hours</Text>
            </View>
            <View style={styles.iconContainer}>
              <GlobeIcon />
              <Text style={styles.geoDesc}>
                ~3h alert delay globally (1-30 min in US and Canada)
              </Text>
            </View>
            <View style={styles.iconContainer}>
              <DistanceIcon />
              <Text style={styles.geoDesc}>375m resolution</Text>
            </View>
          </View>
          <View style={styles.geostationaryInfoContainer}>
            <Text style={styles.descBold}>MODIS</Text>
            <View style={styles.iconContainer}>
              <BellIcon />
              <Text style={styles.geoDesc}>Checks every 1-2 days</Text>
            </View>
            <View style={styles.iconContainer}>
              <GlobeIcon />
              <Text style={styles.geoDesc}>~3-5h alert delay (NRT)</Text>
            </View>
            <View style={styles.iconContainer}>
              <DistanceIcon />
              <Text style={styles.geoDesc}>1km resolution</Text>
            </View>
          </View>
          <View style={styles.geostationaryInfoContainer}>
            <Text style={styles.descBold}>LANDSAT</Text>
            <View style={styles.iconContainer}>
              <BellIcon />
              <Text style={styles.geoDesc}>Checks every ~8 days</Text>
            </View>
            <View style={styles.iconContainer}>
              <GlobeIcon />
              <Text style={styles.geoDesc}>~30 min alert delay</Text>
            </View>
            <View style={styles.iconContainer}>
              <DistanceIcon />
              <Text style={styles.geoDesc}>30km resolution</Text>
            </View>
          </View>
        </View>
        {/* warning */}
        <View style={[styles.warningContainer, styles.marginTop73]}>
          <View style={[styles.warnLogo, styles.boxShadow]}>
            <PlanetLogo />
          </View>
          <Text style={styles.warningText2}>
            <Text
              style={styles.primaryUnderline}
              onPress={_handleEcoWeb(WEB_URLS.PP_FIRE_ALERT)}>
              FireAlert
            </Text>{' '}
            is a project of the{' '}
            <Text
              onPress={_handleEcoWeb(WEB_URLS.PP_ORG)}
              style={styles.primaryUnderline}>
              Plant-for-the-Planet Foundation
            </Text>
            , a non-profit organisation dedicated to restoring and conserving
            the world’s forests.{'\n\n'}
            <Text>
              By using this app, you agree to our{' '}
              <Text
                style={styles.primaryUnderline}
                onPress={_handleEcoWeb(WEB_URLS.PP_TERMS_CON)}>
                Terms & Conditions
              </Text>
              .
            </Text>
          </Text>
        </View>
        <View
          style={[
            styles.warningContainer,
            styles.backgroundColorEB57571A,
            styles.marginTop65,
          ]}>
          <View
            style={[styles.warnLogo, styles.boxShadow, styles.paddingRight14]}>
            <NasaLogo />
          </View>
          <Text style={styles.warningText2}>
            We gratefully acknowledge the use of data and from NASA's{' '}
            <Text
              style={styles.secondaryUnderline}
              onPress={_handleEcoWeb(WEB_URLS.FIRMS)}>
              {' '}
              Information for Resource Management System (FIRMS)
            </Text>
            , part of NASA's Earth Observing System Data and Information System
            (EOSDIS). {'\n\n'}We thank the scientists and engineers who built{' '}
            <Text
              style={styles.secondaryUnderline}
              onPress={_handleEcoWeb(WEB_URLS.MODIS)}>
              MODIS,
            </Text>{' '}
            <Text
              style={styles.secondaryUnderline}
              onPress={_handleEcoWeb(WEB_URLS.VIIRS)}>
              VIIRS
            </Text>{' '}
            and{' '}
            <Text
              style={styles.secondaryUnderline}
              onPress={_handleEcoWeb(WEB_URLS.LANDSAT)}>
              Landsat
            </Text>
            . We appreciate NASA’s dedication to sharing data. This project is
            not affiliated with NASA.{' '}
            <Text
              style={styles.secondaryUnderline}
              onPress={_handleEcoWeb(WEB_URLS.FIRMS_DISCLAIMER)}>
              FIRMS Disclaimer
            </Text>
            .
          </Text>
        </View>
        <View style={styles.appInfoContainer}>
          <Text style={styles.versionText}>
            Version {DeviceInfo.getVersion()} ({DeviceInfo.getBuildNumber()}) •{' '}
            <Text onPress={_handleEcoWeb(WEB_URLS.PP_IMPRINT)}>Imprint</Text> •{' '}
            <Text onPress={_handleEcoWeb(WEB_URLS.PP_PRIVACY_POLICY)}>
              Privacy Policy
            </Text>
          </Text>
        </View>
        {/* site information modal */}
        <BottomSheet
          isVisible={sitesInfoModal}
          backdropColor={Colors.BLACK + '80'}
          onBackdropPress={() => setSitesInfoModal(false)}>
          <View style={[styles.modalContainer, styles.commonPadding]}>
            <View style={styles.modalHeader} />
            <View style={styles.siteTitleCon}>
              <View>
                {selectedSiteInfo?.project && (
                  <Text style={styles.projectsName}>
                    {selectedSiteInfo?.project?.name ||
                      selectedSiteInfo?.project?.id}
                  </Text>
                )}
                <Text style={styles.siteTitle}>
                  {selectedSiteInfo?.name || selectedSiteInfo?.id}
                </Text>
              </View>
              {selectedSiteInfo?.project === null && (
                <TouchableOpacity
                  onPress={() => handleEditSite(selectedSiteInfo)}>
                  <PencilIcon />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={_handleViewMap(selectedSiteInfo)}
              style={styles.btn}>
              <MapOutlineIcon />
              <Text style={styles.siteActionText}>View on Map</Text>
            </TouchableOpacity>
            {selectedSiteInfo?.project === null && (
              <TouchableOpacity
                disabled={deleteSiteButtonIsDisabled}
                onPress={() => handleDeleteSite(selectedSiteInfo?.id)}
                style={[
                  styles.btn,
                  deleteSiteButtonIsDisabled && styles.btnDisabled,
                  selectedSiteInfo?.project !== null &&
                    styles.borderColorGrayLightest,
                ]}>
                {deleteSiteButtonIsLoading ? (
                  <ActivityIndicator color={Colors.PRIMARY} />
                ) : (
                  <>
                    {selectedSiteInfo?.project !== null ? (
                      <DisabledTrashOutlineIcon />
                    ) : (
                      <TrashOutlineIcon />
                    )}
                    <Text
                      style={[
                        styles.siteActionText,
                        selectedSiteInfo?.project !== null &&
                          styles.colorGrayLightest,
                      ]}>
                      Delete Site
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {selectedSiteInfo?.project && (
              <Text style={styles.projectSyncInfo}>
                This site is synced from pp.eco. To make changes, please visit
                the Plant-for-the-Planet Platform.
              </Text>
            )}
          </View>
        </BottomSheet>
        <Modal
          transparent
          animationType={'slide'}
          visible={siteNameModalVisible}>
          <KeyboardAvoidingView
            {...(Platform.OS === 'ios' ? {behavior: 'padding'} : {})}
            style={styles.siteModalStyle}>
            <Toast ref={modalToast} offsetBottom={100} duration={2000} />
            <TouchableOpacity
              onPress={handleCloseSiteModal}
              style={styles.crossContainer}>
              <CrossIcon fill={Colors.GRADIENT_PRIMARY} />
            </TouchableOpacity>
            <Text style={[styles.heading, styles.paddingHorizonatal16]}>
              Enter Site Name
            </Text>
            <View
              style={[
                styles.siteModalStyle,
                styles.justifyContentSpaceBetween,
              ]}>
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
      </ScrollView>
      {dropDownModal ? (
        <>
          <TouchableOpacity
            style={styles.overlay}
            onPress={() => setDropDownModal(false)}
          />
          <View
            style={[
              styles.dropDownModal,
              // TODO: Is there a way to add this in StyleSheet
              {
                top: pageXY.y + 15,
              },
            ]}>
            {RADIUS_ARR.map((item, index) => (
              <View key={`RADIUS_ARR_${index}`} style={styles.subDropDownCon}>
                <TouchableOpacity
                  style={styles.siteRadiusCon}
                  disabled={
                    item?.value === pageXY?.siteRadius ||
                    (pageXY?.siteGeometry === 'Point' && item.value === 0)
                  }
                  onPress={() => handleSelectRadius(item.value)}>
                  <Text
                    style={[
                      styles.siteRadiusText,
                      item?.value === pageXY?.siteRadius &&
                        styles.fontFamilyBoldColorGradientPrimary,
                      pageXY?.siteGeometry === 'Point' &&
                        item.value === 0 &&
                        styles.colorDisable,
                    ]}>
                    {item.name}
                  </Text>
                  {item?.value === pageXY?.siteRadius && <LayerCheck />}
                </TouchableOpacity>
                {RADIUS_ARR.length - 1 !== index && (
                  <View style={[styles.separator, styles.marginHorizontal16]} />
                )}
              </View>
            ))}
          </View>
        </>
      ) : null}
    </SafeAreaView>
  );
};

export default Settings;

export const styles = StyleSheet.create({
  marginRight5: {
    marginRight: 5,
  },
  justifyContentSpaceBetween: {
    justifyContent: 'space-between',
  },
  marginVertical12: {
    marginVertical: 12,
  },
  marginLeft20: {
    marginLeft: 20,
  },
  marginTop73: {
    marginTop: 73,
  },
  textDecorationLineUnderline: {
    textDecorationLine: 'underline',
  },
  backgroundColorEB57571A: {
    backgroundColor: '#EB57571A',
  },
  marginTop65: {
    marginTop: 65,
  },
  marginHorizontal16: {
    marginHorizontal: 16,
  },
  paddingRight14: {
    paddingRight: 14,
  },
  paddingVertical20: {
    paddingVertical: 20,
  },
  paddingHorizonatal16: {
    paddingHorizontal: 16,
  },
  borderColorGrayLightest: {
    borderColor: Colors.GRAY_LIGHTEST,
  },
  colorGrayLightest: {
    color: Colors.GRAY_LIGHTEST,
  },
  fontFamilyBoldColorGradientPrimary: {
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.GRADIENT_PRIMARY,
  },
  colorDisable: {
    color: Colors.DISABLE,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
    paddingTop: IS_ANDROID ? StatusBar.currentHeight : 0,
  },
  scrollContainer: {
    paddingBottom: 100,
  },
  modalContainer: {
    bottom: 0,
    borderRadius: 15,
    width: SCREEN_WIDTH,
    position: 'absolute',
    paddingBottom: 40,
    // height: SCREEN_HEIGHT / 3,
    backgroundColor: Colors.WHITE,
  },
  modalLayer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  mainHeading: {
    fontSize: Typography.FONT_SIZE_20,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.TEXT_COLOR,
  },
  subHeading: {
    fontSize: Typography.FONT_SIZE_16,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.TEXT_COLOR,
  },
  ppLink: {
    color: Colors.PRIMARY,
  },
  underLine: {
    textDecorationLine: 'underline',
  },
  myProjects: {
    marginTop: 20,
  },
  mySites: {
    marginTop: 32,
  },
  myNotifications: {
    marginTop: 32,
  },
  projectsInfo: {
    marginTop: 24,
    borderRadius: 12,
    paddingTop: 20,
    paddingHorizontal: 16,
    backgroundColor: Colors.WHITE,
    // shadow
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.62,
    elevation: 8,
  },
  projectsNameInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  projectsName: {
    fontSize: Typography.FONT_SIZE_16,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.TEXT_COLOR,
    width: SCREEN_WIDTH / 1.3,
  },
  sitesViewStyle: {
    marginTop: 16,
  },
  rightConPro: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sitesInProjects: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sitesName: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
    width: SCREEN_WIDTH / 2.5,
    paddingVertical: 5,
  },
  siteRadius: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.GRADIENT_PRIMARY,
  },
  dropDownRadius: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // paddingVertical: 14,
  },
  dropDownRadiusMarginRight5PaddingVeritcal16: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
    paddingVertical: 16,
  },
  dropDownModal: {
    right: 70,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 12,
    position: 'absolute',
    backgroundColor: Colors.WHITE,
    borderColor: Colors.GRAY_MEDIUM,
  },
  subDropDownCon: {
    width: 150,
  },
  overlay: {
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
    position: 'absolute',
  },
  siteRadiusCon: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  siteRadiusText: {
    color: Colors.TEXT_COLOR,
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    paddingVertical: 8,
  },
  mySitesHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mySiteNameMainContainer: {
    marginTop: 24,
    borderRadius: 12,
    justifyContent: 'space-between',
    backgroundColor: Colors.WHITE,
    // shadow
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.62,
    elevation: 8,
  },
  mySiteNameSubContainer: {
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  mySiteNameContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.WHITE,
    // shadow
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.62,
    elevation: 8,
  },
  paddingVertical20OverflowHidden: {
    paddingVertical: 20,
    overflow: 'hidden',
  },
  notificationContainer: {
    padding: 16,
    marginTop: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.WHITE,
    // shadow
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.62,
    elevation: 8,
  },
  mySiteName: {
    fontSize: Typography.FONT_SIZE_16,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.PLANET_DARK_GRAY,
    paddingVertical: 5,
    width: SCREEN_WIDTH / 2.5,
  },
  myEmailName: {
    paddingVertical: 5,
    maxWidth: SCREEN_WIDTH / 2,
    color: Colors.PLANET_DARK_GRAY,
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    paddingRight: 10,
  },
  smallHeading: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.PLANET_DARK_GRAY,
    paddingVertical: 5,
    marginLeft: 12,
  },
  mobileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emailContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emailSubContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningContainer: {
    borderRadius: 12,
    paddingTop: 57,
    paddingBottom: 20,
    marginHorizontal: 16,
    paddingHorizontal: 20,
    backgroundColor: '#2196531A',
  },
  warnLogo: {
    position: 'absolute',
    top: -40,
    backgroundColor: Colors.WHITE,
    padding: 18,
    borderRadius: SCREEN_WIDTH,
    width: 82,
    height: 82,
    justifyContent: 'center',
    alignSelf: 'center',
    alignItems: 'center',
  },
  alertWarningContainer: {
    marginTop: 32,
    borderRadius: 12,
    marginHorizontal: 16,
    backgroundColor: Colors.GRADIENT_PRIMARY + '12',
  },
  alertWarningSubContainer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  warningHeader: {
    height: 61,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: 'center',
    backgroundColor: Colors.GRADIENT_PRIMARY,
  },
  warning: {
    marginLeft: 10,
    color: Colors.WHITE,
    fontSize: Typography.FONT_SIZE_25,
    fontFamily: Typography.FONT_FAMILY_OSWALD_BOLD,
  },
  warningSubContainer: {
    flexDirection: 'row',
  },
  warningHeading: {
    fontSize: Typography.FONT_SIZE_20,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.PLANET_DARK_GRAY,
  },
  warningText: {
    marginTop: 22,
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
  },
  warningText2: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
  },
  geostationaryMainContainer: {
    marginTop: 32,
    marginHorizontal: 16,
    backgroundColor: Colors.WHITE,
    paddingVertical: 20,
    borderRadius: 12,
    // shadow
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.62,
    elevation: 8,
  },
  polarOrbitMainContainer: {
    marginTop: 32,
    marginHorizontal: 16,
    backgroundColor: Colors.WHITE,
    paddingVertical: 20,
    borderRadius: 12,
    // shadow
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.62,
    elevation: 8,
  },
  geostationaryContainer: {},
  desc: {
    marginTop: 10,
    fontSize: Typography.FONT_SIZE_12,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.PLANET_DARK_GRAY,
  },
  descBold: {
    marginTop: 10,
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.PLANET_DARK_GRAY,
  },
  geostationaryInfoContainer: {
    marginTop: 10,
  },
  iconContainer: {
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  geoDesc: {
    marginLeft: 5,
    color: Colors.PLANET_DARK_GRAY,
  },
  primaryUnderline: {
    fontFamily: FONT_FAMILY_BOLD,
    color: '#68B030',
  },
  secondaryUnderline: {
    fontFamily: FONT_FAMILY_BOLD,
    color: '#EB5757',
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
  btnDisabled: {
    opacity: 0.5,
  },
  siteActionText: {
    marginLeft: 30,
    color: Colors.GRADIENT_PRIMARY,
    fontSize: Typography.FONT_SIZE_18,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
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
  boxShadow: {
    // shadow
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4.62,
    elevation: 5,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#e0e0e0',
  },
  verifiedChipsCon: {
    height: 45,
    justifyContent: 'center',
  },
  verifiedChips: {
    backgroundColor: '#F2994A20',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedTxt: {
    marginLeft: 2,
    fontSize: 8,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.TEXT_COLOR,
  },
  trashIcon: {
    marginLeft: 5,
    paddingVertical: 15,
    paddingLeft: 10,
  },
  projectSyncInfo: {
    fontSize: 12,
    marginTop: 16,
    color: Colors.TEXT_COLOR,
    fontFamily: Typography.FONT_FAMILY_ITALIC,
    paddingHorizontal: 10,
  },
  appInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
  },
  versionText: {
    textAlign: 'center',
    color: Colors.GRAY_LIGHTEST,
    fontSize: Typography.FONT_SIZE_12,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceTagCon: {
    backgroundColor: Colors.ORANGE,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  comingSoonCon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comingSoon: {
    width: 93,
    marginLeft: 10,
  },
  deviceTag: {
    textTransform: 'uppercase',
    fontSize: Typography.FONT_SIZE_10,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.WHITE,
  },
  emptySiteCon: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
  },
  paddingHorizontal0ColorWhite: {
    fontSize: 12,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    paddingHorizontal: 0,
    color: Colors.WHITE,
  },
  colorWhite: {
    color: Colors.WHITE,
  },
  emptySiteText: {
    fontSize: 12,
    color: Colors.PLANET_DARK_GRAY,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    paddingHorizontal: 10,
  },
  receiveNotifications: {
    fontFamily: Typography.FONT_FAMILY_REGULAR,
  },
  justifyContentCenter: {
    justifyContent: 'center',
  },
  visitPPecoBtn: {
    width: 92,
    borderRadius: 8,
    marginTop: 12,
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitPPecoBtnText: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: Colors.WHITE,
  },
  addSiteBtn: {
    backgroundColor: Colors.GRADIENT_PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    width: 92,
    borderRadius: 8,
    marginTop: 12,
    marginLeft: 10,
  },
  locWaveCon: {
    position: 'absolute',
    right: 5,
  },
  emptyPpInfoCon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  emptyPpInfo: {
    width: SCREEN_WIDTH / 1.8,
  },
  natureBgCon: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  planetLogo: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    backgroundColor: Colors.WHITE,
    shadowColor: '#D9EAE0',
    shadowOffset: {
      width: 2,
      height: 2,
    },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.WHITE,
  },
  boxShadowPH: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.62,
    elevation: 8,
  },
});
