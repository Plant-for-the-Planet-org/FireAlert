import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BackHandler,
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
} from 'react-native';
import {useAuth0} from 'react-native-auth0';
import {useQueryClient} from '@tanstack/react-query';
import Lottie from 'lottie-react-native';
import {useToast} from 'react-native-toast-notifications';
import {AlertModal, LayerModal} from '../../components';
import {
  selectUserDetails,
  selectConfigData,
  updateIsLoggedIn,
} from '../../redux/slices/login/loginSlice';
import {BottomBarContext} from '../../global/reducers/bottomBar';
import {useMapLayers} from '../../global/reducers/mapLayers';
import {useAppDispatch, useAppSelector} from '../../hooks';
import {trpc} from '../../services/trpc';
import {Colors} from '../../styles';
import {useFetchSites} from '../../utils/api';
import handleLink from '../../utils/browserLinking';
import {clearAll} from '../../utils/localStorage';
import {highlightWave} from '../../assets/animation/lottie';
import {HomeMapView} from './components/HomeMapView';
import {HomeMapSources} from './components/HomeMapSources';
import {HomeFloatingActions} from './components/HomeFloatingActions';
import {ProfileSheet} from './components/ProfileSheet';
import {AlertDetailsSheet} from './components/AlertDetailsSheet';
import {SiteDetailsSheet} from './components/SiteDetailsSheet';
import {EditSiteModal} from './components/EditSiteModal';
import {EditProfileModal} from './components/EditProfileModal';
import PermissionModals from './components/PermissionModals';
import {IncidentDebugOverlay} from './components/IncidentDebugOverlay';
import {useHomeLocation} from './hooks/useHomeLocation';
import {useHomeSiteActions} from './hooks/useHomeSiteActions';
import {useHomeIncidentCircle} from './hooks/useHomeIncidentCircle';
import {useHomeMapSelection} from './hooks/useHomeMapSelection';

const IS_ANDROID = Platform.OS === 'android';
const SCREEN_HEIGHT = Dimensions.get('window').width;
const ZOOM_LEVEL = 15;
const ANIMATION_DURATION = 1000;

const Home = ({route}: any) => {
  const routeParams = route?.params;

  // Context and Redux
  const {state: selectedLayer} = useMapLayers();
  const {setSelected, selectedSiteBar, passMapInfo} =
    useContext(BottomBarContext);
  const userDetails = useAppSelector(selectUserDetails);
  const configData = useAppSelector(selectConfigData);
  const dispatch = useAppDispatch();
  const {clearSession, clearCredentials} = useAuth0();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Refs
  const mapRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  // UI State
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileEditModalVisible, setProfileEditModalVisible] = useState(false);
  const [siteEditModalVisible, setSiteEditModalVisible] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [layerModalVisible, setLayerModalVisible] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [editingSiteName, setEditingSiteName] = useState('');
  const [editingSiteRadius, setEditingSiteRadius] = useState(0);
  const [editingSiteGeometry, setEditingSiteGeometry] = useState('');
  const [isEditingSiteFromProject, setIsEditingSiteFromProject] =
    useState(false);

  // Custom Hooks
  const {
    location,
    isPermissionDenied,
    isPermissionBlocked,
    requestLocation,
    clearPermissionState,
  } = useHomeLocation();
  const {
    selectedSite,
    selectedAlert,
    selectedArea,
    setSelectedSite,
    setSelectedAlert,
    setSelectedArea,
  } = useHomeMapSelection();
  const {incidentCircleData, generateCircle, clearCircle} =
    useHomeIncidentCircle();
  const {updateSite, deleteSite, isUpdating, isDeleting} = useHomeSiteActions();

  // Data Queries
  const {data: alerts} = useFetchSites({enabled: true} as any);
  const {data: sites} = (trpc.site as any).getSites.useQuery(
    ['site', 'getSites'],
    {
      enabled: true,
      retryDelay: 3000,
      onError: () => toast.show('something went wrong', {type: 'danger'}),
    },
  );
  const {data: protectedSites} = (trpc.site as any).getProtectedSites.useQuery({
    queryKey: ['site', 'getProtectedSites'],
    enabled: true,
    retryDelay: 3000,
    staleTime: 'Infinity',
    cacheTime: 'Infinity',
    keepPreviousData: true,
  });

  // Mutations
  const updateUserMutation = (trpc.user as any).updateUser.useMutation({
    retryDelay: 3000,
    onSuccess: () => {
      setProfileEditModalVisible(false);
      dispatch(
        (trpc.user as any).getUserDetails({
          onSuccess: async () => {},
          onFail: () => toast.show('something went wrong', {type: 'danger'}),
        }),
      );
    },
    onError: () => toast.show('something went wrong', {type: 'danger'}),
  });

  const softDeleteUserMutation = (trpc.user as any).softDeleteUser.useMutation({
    retryDelay: 3000,
    onSuccess: async () => {
      setShowDeleteAccountModal(false);
      queryClient.clear();
      await clearAll();
      dispatch(updateIsLoggedIn(false));
    },
    onError: () => toast.show('something went wrong', {type: 'danger'}),
  });

  const pauseAlertForProtectedSiteMutation = (
    trpc.site as any
  ).pauseAlertForProtectedSite.useMutation({
    retryDelay: 3000,
    onSuccess: async (res: any) => {
      queryClient.setQueryData(
        [
          ['site', 'getProtectedSites'],
          {input: ['site', 'getProtectedSites'], type: 'query'},
        ],
        (oldData: any) =>
          oldData
            ? {
                ...oldData,
                json: {
                  ...oldData?.json,
                  data: oldData?.json?.data?.map((item: any) =>
                    item.id === res?.json?.data?.id ? res?.json?.data : item,
                  ),
                },
              }
            : null,
      );
      if (res?.json?.data.hasOwnProperty('isActive'))
        setSelectedSite(res?.json?.data);
    },
  });

  const deleteProtectedSiteMutation = (
    trpc.site as any
  ).deleteProtectedSite.useMutation({
    retryDelay: 3000,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['site', 'getProtectedSites'],
      });
      await queryClient.invalidateQueries({queryKey: ['alert', 'getAlerts']});
      setSelectedSite(null);
      setSelectedArea(null);
      toast.show('Deleted', {type: 'success'});
    },
    onError: () => toast.show('something went wrong', {type: 'danger'}),
  });

  // Computed Values - Convert sites to SiteFeature format for map rendering
  // Transforms raw site data from tRPC into GeoJSON Feature format
  const sitesFeatures = useMemo(() => {
    const rawSites = sites?.json?.data || [];
    return rawSites.map((site: any) => ({
      type: 'Feature' as const,
      geometry: site.geometry,
      properties: {
        id: site.id,
        name: site.name,
        radius: site.radius,
        geometry: site.geometry?.type || '',
        stopAlerts: site.stopAlerts || false,
        isPlanetRO: !!site.remoteId, // Sites with remoteId are from Plant-for-the-Planet
        projectId: site.projectId,
      },
    }));
  }, [sites]);

  const protectedSitesFeatures = useMemo(() => {
    const rawProtectedSites = protectedSites?.json?.data || [];
    return rawProtectedSites.map((site: any) => ({
      type: 'Feature' as const,
      geometry: site.geometry,
      properties: {
        id: site.id,
        name: site.name,
        radius: site.radius,
        geometry: site.geometry?.type || '',
        stopAlerts: !site.isActive, // Protected sites use isActive instead of stopAlerts
        isPlanetRO: true, // All protected sites are from external sources
        projectId: site.projectId,
      },
    }));
  }, [protectedSites]);

  // Effects
  useEffect(() => {
    async function passProp() {
      setSelectedSite(null);
      setSelectedArea(null);
      setSelectedAlert(null);
      const centerCoordinates = await mapRef.current?.getCenter();
      const currZoom = await mapRef.current?.getZoom();
      passMapInfo({centerCoordinates, currZoom});
    }
    passProp();
  }, [
    selectedSiteBar,
    passMapInfo,
    setSelectedSite,
    setSelectedArea,
    setSelectedAlert,
  ]);

  // Deep linking: Position map to show selected site when navigating from Settings
  useEffect(() => {
    if (
      isCameraReady &&
      routeParams?.bboxGeo?.length > 0 &&
      cameraRef?.current?.fitBounds
    ) {
      setSelected(0); // Switch to Home tab
      // Delay to ensure map is fully ready before camera animation
      setTimeout(() => {
        cameraRef.current?.fitBounds(
          [routeParams.bboxGeo[0], routeParams.bboxGeo[1]], // Southwest corner
          [routeParams.bboxGeo[2], routeParams.bboxGeo[3]], // Northeast corner
          60, // Padding in pixels
          500, // Animation duration in ms
        );
        setSelectedArea(routeParams.siteInfo);
        setSelectedSite(routeParams.siteInfo[0]?.properties);
      }, 1000);
    }
  }, [
    isCameraReady,
    routeParams?.bboxGeo,
    routeParams?.siteInfo,
    setSelected,
    setSelectedArea,
    setSelectedSite,
  ]);

  useEffect(() => {
    if (
      isCameraReady &&
      cameraRef?.current?.setCamera &&
      configData?.loc?.longitude
    )
      cameraRef.current.setCamera({
        centerCoordinate: [
          Number(configData?.loc?.longitude),
          Number(configData?.loc?.latitude),
        ],
        zoomLevel: 4,
        animationDuration: ANIMATION_DURATION,
      });
  }, [configData?.loc?.latitude, configData?.loc?.longitude, isCameraReady]);

  useEffect(() => {
    if (!location && isCameraReady) requestLocation();
  }, [isCameraReady, location, requestLocation]);

  useEffect(() => {
    if (routeParams?.siteIncidentId) generateCircle(routeParams.siteIncidentId);
  }, [routeParams?.siteIncidentId, generateCircle]);

  // Event Handlers - Map
  const handleMapReady = useCallback(() => setIsCameraReady(true), []);
  const handleRegionDidChange = useCallback(() => {}, []);

  const handleMyLocationPress = useCallback(() => {
    if (location && cameraRef?.current?.setCamera)
      cameraRef.current.setCamera({
        centerCoordinate: [location.coords.longitude, location.coords.latitude],
        zoomLevel: ZOOM_LEVEL,
        animationDuration: ANIMATION_DURATION,
      });
    else requestLocation();
  }, [location, requestLocation]);

  const handleLayerPress = useCallback(() => setLayerModalVisible(true), []);
  const handleProfilePress = useCallback(
    () => setProfileModalVisible(true),
    [],
  );

  // Event Handlers - Profile
  const handleEditProfile = useCallback(() => {
    setProfileName(userDetails?.data?.name || '');
    setProfileModalVisible(false);
    setTimeout(() => setProfileEditModalVisible(true), 500);
  }, [userDetails?.data?.name]);

  const handleSaveProfile = useCallback(
    async (name: string) => updateUserMutation.mutate({json: {body: {name}}}),
    [updateUserMutation],
  );

  const handleLogout = useCallback(() => {
    setProfileModalVisible(false);
    setTimeout(() => {
      clearCredentials()
        .then(() => clearSession({}, {useLegacyCallbackUrl: true}))
        .then(async () => {
          dispatch(updateIsLoggedIn(false));
          queryClient.clear();
          await clearAll();
        })
        .catch(error => console.log('Error occurred', error));
    }, 300);
  }, [clearCredentials, clearSession, dispatch, queryClient]);

  const handleDeleteAccountPress = useCallback(() => {
    setProfileModalVisible(false);
    setTimeout(() => setShowDeleteAccountModal(true), 500);
  }, []);

  const handleConfirmDeleteAccount = useCallback(
    () => softDeleteUserMutation.mutate({json: {id: userDetails?.data?.id}}),
    [softDeleteUserMutation, userDetails?.data?.id],
  );

  // Event Handlers - Site
  const handleEditSite = useCallback((site: any) => {
    setEditingSiteId(site.id);
    setEditingSiteName(site.name);
    setEditingSiteRadius(site.radius);
    setEditingSiteGeometry(site.geometry.type);
    setIsEditingSiteFromProject(!!site.remoteId);
    setTimeout(() => setSiteEditModalVisible(true), 500);
  }, []);

  const handleSaveSiteEdit = useCallback(
    async (name: string, radius: number) => {
      if (editingSiteId) {
        await updateSite(editingSiteId, {
          ...(isEditingSiteFromProject ? {} : {name}),
          radius,
        });
        setSiteEditModalVisible(false);
      }
    },
    [editingSiteId, isEditingSiteFromProject, updateSite],
  );

  // Toggle site monitoring - handles both regular sites and protected sites
  // Protected sites use siteRelationId and isActive field
  // Regular sites use stopAlerts field (inverted logic)
  const handleToggleSiteMonitoring = useCallback(
    (siteId: string, isMonitoredUpdated: boolean) => {
      const foundInProtectedSites = protectedSites?.json?.data?.find(
        (site: any) => site.id === siteId,
      );
      const foundInSites = sites?.json?.data?.find(
        (site: any) => site.id === siteId,
      );

      if (foundInProtectedSites) {
        // Protected sites use isActive field (true = monitoring enabled)
        const {siteRelationId, isActive} = foundInProtectedSites;
        pauseAlertForProtectedSiteMutation.mutate({
          json: {params: {siteRelationId, siteId}, body: {isActive: !isActive}},
        });
      } else if (foundInSites) {
        // Regular sites use stopAlerts field (false = monitoring enabled)
        updateSite(siteId, {isMonitored: isMonitoredUpdated});
      }
    },
    [protectedSites, sites, pauseAlertForProtectedSiteMutation, updateSite],
  );

  const handleDeleteSite = useCallback(
    (siteId: string) => {
      const foundInProtectedSites = protectedSites?.json?.data?.find(
        (site: any) => site.id === siteId,
      );
      const foundInSites = sites?.json?.data?.find(
        (site: any) => site.id === siteId,
      );

      if (foundInProtectedSites)
        deleteProtectedSiteMutation.mutate({
          json: {
            params: {
              siteRelationId: foundInProtectedSites?.siteRelationId,
              siteId,
            },
          },
        });
      else if (foundInSites) deleteSite(siteId);
    },
    [protectedSites, sites, deleteProtectedSiteMutation, deleteSite],
  );

  // Event Handlers - Map Interactions
  const handleAlertPress = useCallback(
    (alert: any) => setSelectedAlert(alert),
    [setSelectedAlert],
  );
  const handleSitePress = useCallback(
    (site: any) => setSelectedSite(site),
    [setSelectedSite],
  );

  const handleOpenGoogleMaps = useCallback(() => {
    if (selectedAlert) {
      const lat = Number.parseFloat(String(selectedAlert.latitude));
      const lng = Number.parseFloat(String(selectedAlert.longitude));
      const scheme = Platform.select({ios: 'maps:', android: 'geo:'});
      const latLng = `${lat},${lng}`;
      const url = Platform.select({
        ios: `${scheme}//?q=${lat},${lng}`,
        android: `${scheme}${latLng}`,
      });
      handleLink(url, lat, lng);
    }
  }, [selectedAlert]);

  // Event Handlers - Modal Close
  const handleCloseProfileModal = useCallback(
    () => setProfileModalVisible(false),
    [],
  );
  const handleCloseProfileEditModal = useCallback(
    () => setProfileEditModalVisible(false),
    [],
  );
  const handleCloseSiteEditModal = useCallback(
    () => setSiteEditModalVisible(false),
    [],
  );
  const handleCloseDeleteAccountModal = useCallback(
    () => setShowDeleteAccountModal(false),
    [],
  );
  const handleCloseLayerModal = useCallback(
    () => setLayerModalVisible(false),
    [],
  );

  const handleCloseAlertSheet = useCallback(() => {
    setSelectedAlert(null);
    clearCircle();
  }, [clearCircle, setSelectedAlert]);

  const handleCloseSiteSheet = useCallback(() => {
    setSelectedArea(null);
    setSelectedSite(null);
  }, [setSelectedArea, setSelectedSite]);

  // Event Handlers - Permissions
  const handleLocationAlertRetry = useCallback(() => {
    if (IS_ANDROID) requestLocation();
    else
      import('react-native').then(({Linking}) =>
        Linking.openURL('app-settings:'),
      );
  }, [requestLocation]);

  const handlePermissionRetry = useCallback(
    () => requestLocation(),
    [requestLocation],
  );
  const handlePermissionDismiss = useCallback(
    () => clearPermissionState(),
    [clearPermissionState],
  );
  const handlePermissionOpenSettings = useCallback(
    () => clearPermissionState(),
    [clearPermissionState],
  );
  const handlePermissionExit = useCallback(() => BackHandler.exitApp(), []);

  // Loading States
  const isDeleteSiteLoading =
    isDeleting || deleteProtectedSiteMutation.status === 'pending';
  const isToggleSiteLoading =
    isUpdating || pauseAlertForProtectedSiteMutation.status === 'pending';

  return (
    <>
      <HomeMapView
        mapRef={mapRef}
        cameraRef={cameraRef}
        selectedLayer={selectedLayer}
        location={location}
        onMapReady={handleMapReady}
        onRegionDidChange={handleRegionDidChange}>
        <HomeMapSources
          sites={sitesFeatures}
          alerts={alerts?.json?.data || []}
          protectedSites={protectedSitesFeatures}
          selectedArea={selectedArea}
          selectedAlert={selectedAlert}
          incidentCircleData={incidentCircleData}
          incident={null}
          cameraRef={cameraRef}
          onAlertPress={handleAlertPress}
          onSitePress={handleSitePress}
        />
      </HomeMapView>

      {selectedAlert && (
        <Lottie source={highlightWave} autoPlay loop style={styles.alertSpot} />
      )}

      <IncidentDebugOverlay incidentCircleData={incidentCircleData} />

      <StatusBar
        animated
        translucent
        barStyle={
          profileEditModalVisible || siteEditModalVisible
            ? 'dark-content'
            : 'light-content'
        }
        backgroundColor={
          profileEditModalVisible || siteEditModalVisible
            ? Colors.WHITE
            : Colors.TRANSPARENT
        }
      />

      <HomeFloatingActions
        onLayerPress={handleLayerPress}
        onMyLocationPress={handleMyLocationPress}
        onProfilePress={handleProfilePress}
        userDetails={userDetails}
      />

      <LayerModal
        visible={layerModalVisible}
        onRequestClose={handleCloseLayerModal}
      />

      <AlertModal
        visible={false}
        heading="Location Service"
        message="Location settings are not satisfied. Please make sure you have given location permission to the app and turned on GPS"
        primaryBtnText={IS_ANDROID ? 'Ok' : 'Open Settings'}
        secondaryBtnText="Back"
        onPressPrimaryBtn={handleLocationAlertRetry}
        onPressSecondaryBtn={() => {}}
        showSecondaryButton={true}
      />

      <PermissionModals
        isPermissionDenied={isPermissionDenied}
        isPermissionBlocked={isPermissionBlocked}
        onRetry={handlePermissionRetry}
        onDismiss={handlePermissionDismiss}
        onOpenSettings={handlePermissionOpenSettings}
        onExit={handlePermissionExit}
      />

      <AlertModal
        visible={showDeleteAccountModal}
        heading="Delete Account"
        message="If you proceed, your FireAlert data will be scheduled for deletion in 7 days. If you change your mind please login again to cancel the deletion.\n\nTo delete your Plant-for-the-Planet Account, and Platform data, please visit pp.eco"
        primaryBtnText="Delete"
        secondaryBtnText="Go Back"
        onPressPrimaryBtn={handleConfirmDeleteAccount}
        onPressSecondaryBtn={handleCloseDeleteAccountModal}
        showSecondaryButton={true}
      />

      <ProfileSheet
        visible={profileModalVisible}
        onClose={handleCloseProfileModal}
        userDetails={userDetails}
        onEditProfile={handleEditProfile}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccountPress}
      />

      <AlertDetailsSheet
        visible={!!selectedAlert}
        onClose={handleCloseAlertSheet}
        alertData={selectedAlert}
        incident={null}
        onOpenInMaps={handleOpenGoogleMaps}
      />

      <SiteDetailsSheet
        visible={!!selectedSite}
        onClose={handleCloseSiteSheet}
        siteData={selectedSite}
        onToggleMonitoring={(enabled: boolean) => {
          if (selectedSite?.id)
            handleToggleSiteMonitoring(selectedSite.id, enabled);
        }}
        onEditSite={() => {
          if (selectedSite) handleEditSite(selectedSite);
        }}
        onDeleteSite={() => {
          if (selectedSite?.id) handleDeleteSite(selectedSite.id);
        }}
        isDeleting={isDeleteSiteLoading}
        isUpdating={isToggleSiteLoading}
      />

      <EditProfileModal
        visible={profileEditModalVisible}
        onClose={handleCloseProfileEditModal}
        userName={profileName}
        onSave={handleSaveProfile}
        isLoading={updateUserMutation.status === 'pending'}
      />

      <EditSiteModal
        visible={siteEditModalVisible}
        onClose={handleCloseSiteEditModal}
        siteId={editingSiteId || ''}
        siteName={editingSiteName}
        siteRadius={editingSiteRadius}
        siteGeometry={editingSiteGeometry}
        isPlanetROSite={isEditingSiteFromProject}
        onSave={handleSaveSiteEdit}
        isLoading={isUpdating}
      />
    </>
  );
};

export default Home;

const styles = StyleSheet.create({
  alertSpot: {
    width: 150,
    zIndex: 20,
    height: 150,
    position: 'absolute',
    bottom: IS_ANDROID ? SCREEN_HEIGHT / 1.64 : SCREEN_HEIGHT / 1.95,
    alignSelf: 'center',
  },
});
