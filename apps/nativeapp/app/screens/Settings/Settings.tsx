import React, {useRef, useState, useCallback, useContext} from 'react';
import {
  Platform,
  StatusBar,
  ScrollView,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import bbox from '@turf/bbox';
// @ts-ignore - No type definitions available
import rewind from '@mapbox/geojson-rewind';
import Toast from 'react-native-toast-notifications';
import type {ToastType} from 'react-native-toast-notifications';
import {useToast} from 'react-native-toast-notifications';
import {point, polygon, multiPolygon} from '@turf/helpers';
import {useNavigation} from '@react-navigation/native';
import type {NavigationProp} from '../../types/navigation';

import {Colors} from '../../styles';
import {BottomBarContext} from '../../global/reducers/bottomBar';
import ProtectedSitesSettings from './ProtectedSitesSettings';
import handleLink from '../../utils/browserLinking';

// Import hooks
import {useSettingsData} from './hooks/useSettingsData';
import {useSettingsActions} from './hooks/useSettingsActions';
import {useAlertPreferencesVM} from './hooks/useAlertPreferencesVM';

// Import components
import {ProjectsSection} from './components/ProjectsSection';
import {MySitesSection} from './components/MySitesSection';
import {NotificationsSection} from './components/NotificationsSection';
import {WarningSections} from './components/WarningSections';
import {SatelliteInfoSection} from './components/SatelliteInfoSection';
import {SiteInfoSheet} from './components/SiteInfoSheet';
import {EditSiteModal} from './components/EditSiteModal';

// Import styles
import {styles} from './styles/sharedStyles';

const Settings = () => {
  const navigation = useNavigation<NavigationProp<'Settings'>>();
  const toast = useToast();
  const modalToast = useRef<any>(null);
  const {openModal} = useContext(BottomBarContext);

  // Data fetching hooks
  const {sites, groupedProjects, alertMethods, isLoading, refetch} =
    useSettingsData();

  // Device-specific alert preferences filtering
  const {deviceAlertPreferences, refreshDevicePreferences} =
    useAlertPreferencesVM(alertMethods);

  // Action hooks
  const {
    updateSite,
    deleteSite,
    toggleSiteMonitoring,
    toggleAlertMethod,
    removeAlertMethod,
    isUpdating,
    isDeleting,
  } = useSettingsActions();

  // Local UI state
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [sitesInfoModal, setSitesInfoModal] = useState<boolean>(false);
  const [selectedSiteInfo, setSelectedSiteInfo] = useState<any>(null);
  const [siteNameModalVisible, setSiteNameModalVisible] =
    useState<boolean>(false);
  const [editingSite, setEditingSite] = useState<any>(null);
  const [radiusLoaderArr, setRadiusLoaderArr] = useState<Array<string>>([]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      await refreshDevicePreferences();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refreshDevicePreferences]);

  // Site information modal handlers
  const handleSiteInformation = useCallback((site: any) => {
    setSelectedSiteInfo(site);
    setSitesInfoModal(true);
  }, []);

  const handleCloseSiteInfoModal = useCallback(() => {
    setSitesInfoModal(false);
    setSelectedSiteInfo(null);
  }, []);

  // Site editing handlers
  const handleEditSite = useCallback((site: any) => {
    setSitesInfoModal(false);
    setEditingSite(site);
    setTimeout(() => setSiteNameModalVisible(true), 1000);
  }, []);

  const handleCloseSiteModal = useCallback(() => {
    setSiteNameModalVisible(false);
    setEditingSite(null);
  }, []);

  // Save site edit - validates name length and handles Planet RO sites
  // Planet RO sites (remoteId exists) cannot have their name changed
  const handleSaveSiteEdit = useCallback(
    async (name: string, radius: number) => {
      if (!editingSite) return;

      try {
        const payload: any = {radius};
        // Only include name if not a Planet RO site (sites with remoteId are synced from external platform)
        if (!editingSite.remoteId) {
          if (name.length < 5) {
            modalToast.current?.show(
              'Site name must be at least 5 characters long.',
              {type: 'warning'},
            );
            return;
          }
          payload.name = name;
        }

        await updateSite(editingSite.id, payload);
        setSiteNameModalVisible(false);
        setEditingSite(null);
      } catch (error) {
        console.error('Failed to update site:', error);
      }
    },
    [editingSite, updateSite],
  );

  // Site deletion handler
  const handleDeleteSite = useCallback(
    async (siteId: string) => {
      try {
        await deleteSite(siteId);
        setSitesInfoModal(false);
        setSelectedSiteInfo(null);
      } catch (error) {
        console.error('Failed to delete site:', error);
      }
    },
    [deleteSite],
  );

  // Site monitoring toggle handler
  const handleToggleSiteMonitoring = useCallback(
    async (siteId: string, enabled: boolean) => {
      setRadiusLoaderArr(prev => [...prev, siteId]);
      try {
        await toggleSiteMonitoring(siteId, enabled);
      } finally {
        setRadiusLoaderArr(prev => prev.filter(id => id !== siteId));
      }
    },
    [toggleSiteMonitoring],
  );

  // Navigate to map with site - handles different geometry types
  // Calculates bounding box and prepares site info for map display
  const handleNavigateToMap = useCallback(
    (site: any) => {
      let highlightSiteInfo = site;
      let bboxGeo;

      setSitesInfoModal(false);

      // Calculate bounding box based on geometry type
      if (site?.geometry?.type === 'MultiPolygon') {
        // MultiPolygon: Rewind coordinates to ensure correct winding order
        bboxGeo = bbox(multiPolygon(rewind(site?.geometry.coordinates)));
        highlightSiteInfo = rewind(site?.geometry);
      } else if (site?.geometry?.type === 'Point') {
        // Point: Create bounding box around single coordinate
        bboxGeo = bbox(point(site?.geometry.coordinates));
        highlightSiteInfo = site?.geometry;
      } else {
        // Polygon: Use coordinates as-is
        bboxGeo = bbox(polygon(site?.geometry.coordinates));
        highlightSiteInfo = site?.geometry;
      }

      // Navigate to Home screen with bounding box and site info for highlighting
      navigation.navigate('BottomTab', {
        screen: 'Home',
        params: {
          bboxGeo, // [minLng, minLat, maxLng, maxLat]
          siteInfo: [
            {
              type: 'Feature',
              geometry: highlightSiteInfo,
              properties: {site},
            },
          ],
        },
      });
    },
    [navigation],
  );

  // Helper to open external links
  const _handleEcoWeb = (URL: string) => () => handleLink(URL, 0, 0);

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
        {/* My Projects Section */}
        <ProjectsSection
          projects={groupedProjects}
          onSitePress={handleSiteInformation}
          onToggleMonitoring={handleToggleSiteMonitoring}
          isLoading={isLoading}
        />

        {/* My Sites Section */}
        <MySitesSection
          sites={sites}
          onSitePress={handleSiteInformation}
          onAddSite={openModal}
          onToggleMonitoring={handleToggleSiteMonitoring}
          onEditSite={handleEditSite}
          onDeleteSite={handleDeleteSite}
          isLoading={isLoading}
        />

        {/* Protected Sites Section */}
        <ProtectedSitesSettings
          radiusLoaderArr={radiusLoaderArr}
          setRadiusLoaderArr={setRadiusLoaderArr}
          setRefreshing={setRefreshing}
          toast={toast}
        />

        {/* Notifications Section */}
        <NotificationsSection
          alertMethods={alertMethods}
          deviceAlertPreferences={deviceAlertPreferences}
          onToggleMethod={toggleAlertMethod}
          onAddMethod={method => {
            navigation.navigate('Verification', {
              verificationType: method,
            });
          }}
          onVerifyMethod={method => {
            navigation.navigate('Otp', {
              verificationType: method.method,
              alertMethod: method,
            });
          }}
          onRemoveMethod={removeAlertMethod}
          isLoading={isLoading}
        />

        {/* Warning Sections */}
        <WarningSections onLinkPress={_handleEcoWeb} />

        {/* Satellite Info Section */}
        <SatelliteInfoSection onLinkPress={_handleEcoWeb} />
      </ScrollView>

      {/* Site Info Bottom Sheet */}
      <SiteInfoSheet
        visible={sitesInfoModal}
        onClose={handleCloseSiteInfoModal}
        siteInfo={selectedSiteInfo}
        onEditSite={() => selectedSiteInfo && handleEditSite(selectedSiteInfo)}
        onDeleteSite={() =>
          selectedSiteInfo && handleDeleteSite(selectedSiteInfo.id)
        }
        onViewOnMap={() =>
          selectedSiteInfo && handleNavigateToMap(selectedSiteInfo)
        }
        isDeleting={isDeleting}
      />

      {/* Edit Site Modal */}
      <EditSiteModal
        visible={siteNameModalVisible}
        onClose={handleCloseSiteModal}
        site={editingSite}
        onSave={handleSaveSiteEdit}
        isLoading={isUpdating}
        modalToastRef={modalToast}
      />

      {/* Toast for modal */}
      <Toast ref={modalToast} offsetBottom={100} duration={2000} />
    </SafeAreaView>
  );
};

export default Settings;
