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
import {useFocusEffect} from '@react-navigation/native';
import {useToast} from 'react-native-toast-notifications';
import React, {useCallback, useMemo, useState} from 'react';

import {
  Switch,
  AlertModal,
  BottomSheet,
  CustomButton,
  FloatingInput,
} from '../../components';
import {
  AddIcon,
  SmsIcon,
  NasaLogo,
  BellIcon,
  PhoneIcon,
  CrossIcon,
  GlobeIcon,
  EmailIcon,
  PlanetLogo,
  PencilIcon,
  WarningIcon,
  DistanceIcon,
  WhatsAppIcon,
  DropdownArrow,
  TrashSolidIcon,
  MapOutlineIcon,
  TrashOutlineIcon,
  VerificationWarning,
  DisabledTrashOutlineIcon,
  GlobeWebIcon,
} from '../../assets/svgs';

import {trpc} from '../../services/trpc';
import {WEB_URLS} from '../../constants';
import {useAppSelector} from '../../hooks';
import {Colors, Typography} from '../../styles';
import handleLink from '../../utils/browserLinking';
import {FONT_FAMILY_BOLD} from '../../styles/typography';
import {categorizedRes, groupSitesAsProject} from '../../utils/filters';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const IS_ANDROID = Platform.OS === 'android';

const PROJECTS = [
  {
    id: 1,
    name: 'Yucatan Restoration',
    enabled: true,
    sites: [
      {
        id: 1,
        name: 'Las Americas 1',
        radius: 100,
      },
      {
        id: 2,
        name: 'Las Americas 2',
        radius: 10,
      },
      {
        id: 3,
        name: 'Las Americas 3',
        radius: null,
      },
    ],
  },
  {
    id: 2,
    name: 'Volcano Valley',
    enabled: false,
    sites: null,
  },
];

const MY_SITES = [
  {id: 1, name: 'Balam Kú Sur', radius: 100, enabled: false},
  {id: 2, name: 'Balam Kú Norte', radius: 100, enabled: false},
];

const RADIUS_ARR = [
  {name: 'within 100 km', value: 100},
  {name: 'within 10 km', value: 10},
  {name: 'within 5 km', value: 5},
  {name: 'inside', value: 0},
];

const Settings = ({navigation}) => {
  const [projects, setProjects] = useState(PROJECTS);
  const [dropDownModal, setDropDownModal] = useState<boolean>(false);
  const [sitesInfoModal, setSitesInfoModal] = useState<boolean>(false);
  const [pageXY, setPageXY] = useState<object | null>(null);
  const [mobileNotify, setMobileNotify] = useState<boolean>(false);
  const [siteName, setSiteName] = useState<string | null>('');
  const [siteId, setSiteId] = useState<string | null>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showDelAccount, setShowDelAccount] = useState<boolean>(false);
  const [delAlertMethodArr, setDelAlertMethodArr] = useState<Array<string>>([]);
  const [siteNameModalVisible, setSiteNameModalVisible] =
    useState<boolean>(false);
  const [selectedSiteInfo, setSelectedSiteInfo] = useState<boolean | null>(
    null,
  );

  const toast = useToast();
  const {userDetails} = useAppSelector(state => state.loginSlice);

  const {data: alertPreferences, refetch: refetchAlertPreferences} =
    trpc.alertMethod.getAllAlertMethods.useQuery(undefined, {
      enabled: true,
      retryDelay: 3000,
      onSuccess: () => {
        setRefreshing(false);
      },
      onError: () => {
        setRefreshing(false);
        toast.show('something went wrong', {type: 'danger'});
      },
    });
  const formattedAlertPreferences = useMemo(
    () => categorizedRes(alertPreferences?.json?.data || [], 'method'),
    [categorizedRes, alertPreferences],
  );

  const {data: sites, refetch: refetchSites} = trpc.site.getAllSites.useQuery(
    undefined,
    {
      enabled: true,
      retryDelay: 3000,
      onSuccess: () => {
        setRefreshing(false);
      },
      onError: () => {
        setRefreshing(false);
        toast.show('something went wrong', {type: 'danger'});
      },
    },
  );

  const groupOfSites = useMemo(
    () => groupSitesAsProject(sites?.json?.data || [], 'projectId'),
    [groupSitesAsProject, sites],
  );

  const deleteSite = trpc.site.deleteSite.useMutation({
    retryDelay: 3000,
    onSuccess: () => {
      refetchSites();
      setSitesInfoModal(false);
    },
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const softDeleteUser = trpc.user.softDeleteUser.useMutation({
    retryDelay: 3000,
    onSuccess: () => {
      setShowDelAccount(false);
    },
    onError: () => {
      toast.show('something went wrong', {type: 'danger'});
    },
  });

  const deleteAlertMethod = trpc.alertMethod.deleteAlertMethod.useMutation({
    retryDelay: 3000,
    onSuccess: data => {
      const loadingArr = delAlertMethodArr.filter(
        el => el !== data?.json?.data?.id,
      );
      setDelAlertMethodArr(loadingArr);
      refetchAlertPreferences();
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

  const updateAlertPreferences = trpc.alertMethod.updateAlertMethod.useMutation(
    {
      retryDelay: 3000,
      onSuccess: () => {
        refetchAlertPreferences();
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

  const handleSwitch = (index, val) => {
    let arr = [...projects];
    arr[index].enabled = val;
    setProjects(arr);
  };

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

  const handleRadius = (evt, projectId, siteId) => {
    setPageXY({
      x: evt.nativeEvent.pageX,
      y: evt.nativeEvent.pageY,
      projectId,
      siteId,
    });
    setDropDownModal(!dropDownModal);
  };

  const handleSiteRadius = (evt, siteId) => {
    setPageXY({
      x: evt.nativeEvent.pageX,
      y: evt.nativeEvent.pageY,
      siteId,
    });
    setDropDownModal(!dropDownModal);
  };

  const handleNotifySwitch = (data, isEnabled) => {
    const {alertMethodId} = data;
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
    setTimeout(() => setSiteNameModalVisible(true), 500);
  };

  const handleEditSiteInfo = () => {
    updateSite.mutate({json: {params: {siteId}, body: {name: siteName}}});
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

  const handleAddWhatsapp = () => {
    navigation.navigate('Verification', {
      verificationType: 'Whatsapp',
    });
  };

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
    setSitesInfoModal(false);
    navigation.navigate('Home', siteInfo);
  };

  const handleCloseSiteModal = () => setSiteNameModalVisible(false);

  const onDeleteAccount = () => {
    softDeleteUser.mutate({json: {id: userDetails?.id}});
  };
  const onGoBack = () => setShowDelAccount(false);

  const handleDelAccount = () => {
    setShowDelAccount(true);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetchSites();
    refetchAlertPreferences();
  }, []);

  useFocusEffect(
    useCallback(() => {
      onRefresh();
    }, []),
  );

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
        {/* my projects */}
        {Object.keys(groupOfSites[0] || {})?.length > 0 ? (
          <View style={[styles.myProjects, styles.commonPadding]}>
            <Text style={styles.mainHeading}>
              My Projects via{' '}
              <Text style={styles.ppLink}>
                <Text onPress={_handleEcoWeb(WEB_URLS.PP_ECO)}>pp.eco</Text>
              </Text>
            </Text>
            {groupOfSites?.map((item, index) => (
              <View key={`projects_${index}`} style={styles.projectsInfo}>
                <View style={styles.projectsNameInfo}>
                  <Text style={styles.projectsName}>{item.name}</Text>
                  <Switch
                    value={item.enabled}
                    onValueChange={val => handleSwitch(index, val)}
                  />
                </View>
                {item?.sites?.length > 0 && <View style={{marginTop: 30}} />}
                {item?.sites
                  ? item?.sites?.map((sites, index) => (
                      <>
                        <TouchableOpacity
                          onPress={() => handleSiteInformation(sites)}
                          key={`sites_${index}`}
                          style={styles.sitesInProjects}>
                          <Text style={styles.sitesName}>{sites?.name}</Text>
                          <View style={styles.rightConPro}>
                            <TouchableOpacity
                              onPress={evt =>
                                handleRadius(evt, item?.id, sites?.id)
                              }
                              style={[styles.dropDownRadius, {marginRight: 5}]}>
                              <Text style={styles.siteRadius}>
                                {sites?.radius
                                  ? `within ${sites?.radius} km`
                                  : 'inside'}
                              </Text>
                              <DropdownArrow />
                            </TouchableOpacity>
                            <Switch
                              value={sites?.isMonitored}
                              onValueChange={val =>
                                updateSite.mutate({
                                  json: {
                                    params: {siteId: sites?.id},
                                    body: {isMonitored: val},
                                  },
                                })
                              }
                            />
                          </View>
                        </TouchableOpacity>
                        {item?.sites?.length - 1 !== index && (
                          <View style={styles.separator} />
                        )}
                      </>
                    ))
                  : null}
              </View>
            ))}
          </View>
        ) : null}
        {/* my sites */}
        {sites?.json?.data?.filter(site => site?.projectId === null).length >
        0 ? (
          <View style={[styles.mySites, styles.commonPadding]}>
            <View style={styles.mySitesHead}>
              <Text style={styles.mainHeading}>My Sites</Text>
            </View>
            {sites?.json?.data
              ?.filter(site => site?.projectId === null)
              .map((item, index) => (
                <TouchableOpacity
                  onPress={() => handleSiteInformation(item)}
                  key={`mySites_${index}`}
                  style={styles.mySiteNameContainer}>
                  <Text style={styles.mySiteName}>
                    {item?.name || item?.id}
                  </Text>
                  <View style={styles.rightConPro}>
                    <TouchableOpacity
                      onPress={evt => handleSiteRadius(evt, item?.id)}
                      style={[
                        styles.dropDownRadius,
                        {marginRight: 5, paddingVertical: 16},
                      ]}>
                      <Text style={styles.siteRadius}>
                        {
                          RADIUS_ARR.filter(
                            ({value}) => item?.radius === value,
                          )[0]?.name
                        }
                      </Text>
                      <DropdownArrow />
                    </TouchableOpacity>
                    <Switch
                      value={item?.isMonitored}
                      onValueChange={val =>
                        updateSite.mutate({
                          json: {
                            params: {siteId: item?.id},
                            body: {isMonitored: val},
                          },
                        })
                      }
                    />
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        ) : null}
        {/* notifications */}
        <View style={[styles.myNotifications, styles.commonPadding]}>
          <Text style={styles.mainHeading}>Notifications</Text>
          <View style={styles.notificationContainer}>
            <View style={styles.mobileContainer}>
              <PhoneIcon />
              <Text style={[styles.smallHeading]}>Mobile</Text>
            </View>
            <Switch
              value={mobileNotify}
              onValueChange={val => setMobileNotify(val)}
            />
          </View>
          {/* emails */}
          <View style={styles.mySiteNameMainContainer}>
            <View style={styles.mySiteNameSubContainer}>
              <View style={styles.mobileContainer}>
                <EmailIcon />
                <Text style={[styles.smallHeading]}>Email</Text>
              </View>
              <TouchableOpacity onPress={handleAddEmail}>
                <AddIcon />
              </TouchableOpacity>
            </View>
            {formattedAlertPreferences?.email?.length > 0 && (
              <View style={styles.emailContainer}>
                {formattedAlertPreferences?.email?.map((item, i) => (
                  <>
                    <View
                      key={`emails_${i}`}
                      style={[
                        styles.emailSubContainer,
                        {justifyContent: 'space-between'},
                      ]}>
                      <Text style={styles.myEmailName}>
                        {item?.destination}
                      </Text>
                      <View style={styles.emailSubContainer}>
                        {item?.isVerified ? (
                          <Switch
                            value={item?.isEnabled}
                            onValueChange={val =>
                              handleNotifySwitch({alertMethodId: item.id}, val)
                            }
                          />
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
                      <View style={[styles.separator, {marginVertical: 12}]} />
                    )}
                  </>
                ))}
              </View>
            )}
          </View>
          {/* whatsapp */}
          <View style={styles.mySiteNameMainContainer}>
            <View style={styles.mySiteNameSubContainer}>
              <View style={styles.mobileContainer}>
                <WhatsAppIcon />
                <Text style={styles.smallHeading}>WhatsApp</Text>
              </View>
              <TouchableOpacity onPress={handleAddWhatsapp}>
                <AddIcon />
              </TouchableOpacity>
            </View>
            {formattedAlertPreferences?.whatsapp?.length > 0 && (
              <View style={styles.emailContainer}>
                {formattedAlertPreferences?.whatsapp?.map((item, i) => (
                  <>
                    <View
                      key={`whatsapp_${i}`}
                      style={[
                        styles.emailSubContainer,
                        {justifyContent: 'space-between'},
                      ]}>
                      <Text style={styles.myEmailName}>
                        {item?.destination}
                      </Text>
                      <View style={styles.emailSubContainer}>
                        {item?.isVerified ? (
                          <Switch
                            value={item?.isEnabled}
                            onValueChange={val =>
                              handleNotifySwitch({guid: item.guid}, val)
                            }
                          />
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
                          style={{marginLeft: 20}}
                          onPress={() => handleRemoveAlertMethod(item?.id)}>
                          <TrashSolidIcon />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {formattedAlertPreferences?.whatsapp?.length - 1 !== i && (
                      <View style={[styles.separator, {marginVertical: 12}]} />
                    )}
                  </>
                ))}
              </View>
            )}
          </View>
          {/* sms */}
          <View style={styles.mySiteNameMainContainer}>
            <View style={styles.mySiteNameSubContainer}>
              <View style={styles.mobileContainer}>
                <SmsIcon />
                <Text style={styles.smallHeading}>Sms</Text>
              </View>
              <TouchableOpacity onPress={handleAddSms}>
                <AddIcon />
              </TouchableOpacity>
            </View>
            {formattedAlertPreferences?.sms?.length > 0 && (
              <View style={styles.emailContainer}>
                {formattedAlertPreferences?.sms?.map((item, i) => (
                  <>
                    <View
                      key={`sms_${i}`}
                      style={[
                        styles.emailSubContainer,
                        {justifyContent: 'space-between'},
                      ]}>
                      <Text style={styles.myEmailName}>
                        {item?.destination}
                      </Text>
                      <View style={styles.emailSubContainer}>
                        {item?.isVerified ? (
                          <Switch
                            value={item?.isEnabled}
                            onValueChange={val =>
                              handleNotifySwitch({alertMethodId: item.id}, val)
                            }
                          />
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
                      <View style={[styles.separator, {marginVertical: 12}]} />
                    )}
                  </>
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
              </View>
              <TouchableOpacity onPress={handleWebhook}>
                <AddIcon />
              </TouchableOpacity>
            </View>
            {formattedAlertPreferences?.webhook?.length > 0 && (
              <View style={styles.emailContainer}>
                {formattedAlertPreferences?.webhook?.map((item, i) => (
                  <>
                    <View
                      key={`webhook_${i}`}
                      style={[
                        styles.emailSubContainer,
                        {justifyContent: 'space-between'},
                      ]}>
                      <Text style={styles.myEmailName}>
                        {item?.destination}
                      </Text>
                      <View style={styles.emailSubContainer}>
                        {item?.isVerified ? (
                          <Switch
                            value={item?.isEnabled}
                            onValueChange={val =>
                              handleNotifySwitch({alertMethodId: item.id}, val)
                            }
                          />
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
                      <View style={[styles.separator, {marginVertical: 12}]} />
                    )}
                  </>
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
                  {textDecorationLine: 'underline'},
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
          <View style={styles.geostationaryContainer}>
            <Text style={styles.subHeading}>Geostationary</Text>
            <Switch
              value={mobileNotify}
              onValueChange={val => setMobileNotify(val)}
            />
          </View>
          <Text style={styles.desc}>Quick but many false alarms [BETA]</Text>
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
              <Text style={styles.geoDesc}>30m resolution</Text>
            </View>
          </View>
        </View>
        {/* warning */}
        <View style={[styles.warningContainer, {marginTop: 73}]}>
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
            {backgroundColor: '#EB57571A', marginTop: 65},
          ]}>
          <View style={[styles.warnLogo, styles.boxShadow, {paddingRight: 14}]}>
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
        <TouchableOpacity onPress={handleDelAccount} style={styles.delTextCon}>
          <Text style={styles.delText}>Delete Account</Text>
        </TouchableOpacity>
        {/* Del Account Alert */}
        <AlertModal
          visible={showDelAccount}
          heading={'Delete Account'}
          message={
            'If you proceed your account will be scheduled for deletion and will be deleted in 7 days. If you change your mind, please login again to cancel the deletion process.'
          }
          primaryBtnText={'Delete'}
          secondaryBtnText={'Go Back'}
          onPressPrimaryBtn={onDeleteAccount}
          onPressSecondaryBtn={onGoBack}
          showSecondaryButton={true}
        />
        {/* site information modal */}
        <BottomSheet
          isVisible={sitesInfoModal}
          backdropColor={Colors.BLACK + '80'}
          onBackdropPress={() => setSitesInfoModal(false)}>
          <View style={[styles.modalContainer, styles.commonPadding]}>
            <View style={styles.modalHeader} />
            <View style={styles.siteTitleCon}>
              <View>
                {selectedSiteInfo?.projectId && (
                  <Text style={styles.projectsName}>
                    {selectedSiteInfo?.projectName || selectedSiteInfo?.guid}
                  </Text>
                )}
                <Text style={styles.siteTitle}>
                  {selectedSiteInfo?.name || selectedSiteInfo?.guid}
                </Text>
              </View>
              <TouchableOpacity
                disabled={selectedSiteInfo?.projectId !== null}
                onPress={() => handleEditSite(selectedSiteInfo)}>
                <PencilIcon />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={_handleViewMap(selectedSiteInfo)}
              style={styles.btn}>
              <MapOutlineIcon />
              <Text style={styles.siteActionText}>View on Map</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={
                deleteSite?.isLoading || selectedSiteInfo?.projectId !== null
              }
              onPress={() => handleDeleteSite(selectedSiteInfo?.id)}
              style={[
                styles.btn,
                selectedSiteInfo?.projectId !== null && {
                  borderColor: Colors.GRAY_LIGHTEST,
                },
              ]}>
              {deleteSite?.isLoading ? (
                <ActivityIndicator color={Colors.PRIMARY} />
              ) : (
                <>
                  {selectedSiteInfo?.projectId !== null ? (
                    <DisabledTrashOutlineIcon />
                  ) : (
                    <TrashOutlineIcon />
                  )}
                  <Text
                    style={[
                      styles.siteActionText,
                      selectedSiteInfo?.projectId !== null && {
                        color: Colors.GRAY_LIGHTEST,
                      },
                    ]}>
                    Delete Site
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {selectedSiteInfo?.projectId && (
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
            <TouchableOpacity
              onPress={handleCloseSiteModal}
              style={styles.crossContainer}>
              <CrossIcon fill={Colors.GRADIENT_PRIMARY} />
            </TouchableOpacity>
            <Text style={[styles.heading, {paddingHorizontal: 40}]}>
              Enter Site Name
            </Text>
            <View
              style={[
                styles.siteModalStyle,
                {justifyContent: 'space-between'},
              ]}>
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
              {
                top: pageXY.y + 15,
              },
            ]}>
            {RADIUS_ARR.map((item, index) => (
              <TouchableOpacity
                key={`RADIUS_ARR_${index}`}
                onPress={() => handleSelectRadius(item.value)}>
                <Text style={styles.siteRadiusText}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}
    </SafeAreaView>
  );
};

export default Settings;

const styles = StyleSheet.create({
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
    paddingVertical: 14,
  },
  dropDownModal: {
    right: 40,
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderWidth: 1,
    borderRadius: 10,
    position: 'absolute',
    backgroundColor: Colors.WHITE,
    borderColor: Colors.GRAY_MEDIUM,
  },
  overlay: {
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
    position: 'absolute',
  },
  siteRadiusText: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.BLACK,
    paddingVertical: 5,
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
  delTextCon: {
    marginTop: 40,
    alignSelf: 'center',
  },
  delText: {
    fontSize: Typography.FONT_SIZE_20,
    fontFamily: Typography.FONT_FAMILY_BOLD,
    color: '#EB5757',
    padding: 10,
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
  geostationaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
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
    marginHorizontal: 40,
  },
  heading: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: Typography.FONT_SIZE_24,
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
    width: '100%',
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
});
