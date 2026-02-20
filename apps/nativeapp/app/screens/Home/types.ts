/**
 * Type definitions for Home screen
 * Defines interfaces for navigation, components, hooks, and data structures
 */

import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import type MapboxGL from '@rnmapbox/maps';
import type Geolocation from 'react-native-geolocation-service';
import type {IncidentCircleResult} from '../../types/incident';
import type {RootStackParamList, SiteFeature} from '../../types/navigation';

// Navigation types
export interface HomeRouteParams {
  bboxGeo?: [number, number, number, number];
  siteInfo?: SiteFeature[];
  siteIncidentId?: string;
}

export type HomeNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

export type HomeRouteProp = RouteProp<RootStackParamList, 'Home'>;

// Site and Alert types
// Note: SiteFeature is imported from navigation.ts to avoid circular dependencies
export interface SiteProperties {
  id: string;
  name: string;
  radius: number;
  geometry: string;
  stopAlerts: boolean;
  isPlanetRO: boolean;
  projectId?: string;
}

export interface AlertData {
  id: string;
  latitude: number;
  longitude: number;
  confidence: string;
  detectedAt: string;
  siteId: string;
  siteName: string;
}

// User types (from Redux state)
export interface UserDetails {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  [key: string]: any;
}

// Site update input (from tRPC schema)
export interface UpdateSiteInput {
  type?: 'Point' | 'Polygon' | 'MultiPolygon';
  name?: string;
  geometry?: GeoJSON.Geometry;
  radius?: number;
  isMonitored?: boolean;
}

// Component Props
export interface HomeMapViewProps {
  mapRef: React.RefObject<MapboxGL.MapView>;
  cameraRef: React.RefObject<MapboxGL.Camera>;
  selectedLayer: string;
  location: MapboxGL.Location | Geolocation.GeoPosition | undefined;
  selectedArea: SiteFeature[] | null;
  selectedAlert: AlertData | null;
  incidentCircleData: IncidentCircleResult | null;
  onMapReady: () => void;
  onRegionDidChange: () => void;
}

export interface HomeMapSourcesProps {
  sites: SiteFeature[];
  alerts: AlertData[];
  selectedArea: SiteFeature[] | null;
  selectedAlert: AlertData | null;
  incidentCircleData: IncidentCircleResult | null;
  onAlertPress: (alert: AlertData) => void;
  onSitePress: (site: SiteProperties) => void;
}

export interface HomeFloatingActionsProps {
  onLayerPress: () => void;
  onMyLocationPress: () => void;
  onProfilePress: () => void;
  userDetails: UserDetails | null;
}

export interface IncidentDebugOverlayProps {
  visible: boolean;
  incidentCircleData: IncidentCircleResult | null;
}

export interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
  userDetails: UserDetails | null;
  onEditProfile: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

export interface AlertDetailsSheetProps {
  visible: boolean;
  onClose: () => void;
  alertData: AlertData | null;
  siteData: SiteProperties | null;
  onOpenInMaps: () => void;
}

export interface SiteDetailsSheetProps {
  visible: boolean;
  onClose: () => void;
  siteData: SiteProperties | null;
  onToggleMonitoring: (enabled: boolean) => void;
  onEditSite: () => void;
  onDeleteSite: () => void;
  isDeleting: boolean;
}

export interface EditSiteModalProps {
  visible: boolean;
  onClose: () => void;
  siteId: string;
  siteName: string;
  siteRadius: number;
  siteGeometry: string;
  onSave: (name: string, radius: number) => Promise<void>;
  isLoading: boolean;
}

export interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userName: string;
  onSave: (name: string) => Promise<void>;
  isLoading: boolean;
}

export interface PermissionModalsProps {
  isPermissionDenied: boolean;
  isPermissionBlocked: boolean;
  onRetry: () => void;
  onDismiss: () => void;
  onOpenSettings: () => void;
  onExit: () => void;
}

export interface LayerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedLayer: string;
  onSelectLayer: (layer: string) => void;
}

// Hook return types
export interface UseHomeLocationReturn {
  location: MapboxGL.Location | Geolocation.GeoPosition | undefined;
  isPermissionDenied: boolean;
  isPermissionBlocked: boolean;
  requestLocation: () => Promise<void>;
  clearPermissionState: () => void;
}

export interface UseHomeSiteActionsReturn {
  updateSite: (siteId: string, data: UpdateSiteInput) => Promise<void>;
  deleteSite: (siteId: string) => Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;
}

export interface UseHomeIncidentCircleReturn {
  incidentCircleData: IncidentCircleResult | null;
  generateCircle: (siteIncidentId: string) => Promise<void>;
  clearCircle: () => void;
}

export interface UseHomeMapSelectionReturn {
  selectedSite: SiteProperties | null;
  selectedAlert: AlertData | null;
  selectedArea: SiteFeature[] | null;
  setSelectedSite: (site: SiteProperties | null) => void;
  setSelectedAlert: (alert: AlertData | null) => void;
  setSelectedArea: (area: SiteFeature[] | null) => void;
  clearSelection: () => void;
}
