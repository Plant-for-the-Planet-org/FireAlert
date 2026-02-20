/**
 * Settings Screen Type Definitions
 *
 * This file contains all TypeScript interfaces and types for the Settings screen refactoring.
 * It defines component props, hook return types, and utility types used throughout the Settings module.
 *
 * @module Settings/types
 */

// Import shared types from OneSignal service
import type {AlertMethod} from '../../services/OneSignal/types';

/**
 * Site entity representing a monitored geographic area
 */
export interface Site {
  id: string;
  name: string;
  radius: number;
  geometry: {
    type: 'Point' | 'Polygon' | 'MultiPolygon';
    coordinates: number[] | number[][] | number[][][];
  };
  stopAlerts: boolean;
  detectionArea?: number;
  remoteId?: string | null;
  project?: Project | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

/**
 * Project entity from Plant-for-the-Planet platform
 */
export interface Project {
  id: string;
  name: string;
  remoteId?: string;
}

/**
 * Site update input for tRPC mutations
 */
export interface UpdateSiteInput {
  type?: 'Point' | 'Polygon' | 'MultiPolygon';
  name?: string;
  radius?: number;
  isMonitored?: boolean;
  stopAlerts?: boolean;
}

// ============================================================================
// Component Props Interfaces
// ============================================================================

/**
 * Props for ProjectsSection component
 * Displays grouped Plant-for-the-Planet projects with their associated sites
 */
export interface ProjectsSectionProps {
  projects: GroupedProject[];
  onSitePress: (site: Site) => void;
  onToggleMonitoring: (siteId: string, enabled: boolean) => Promise<void>;
  isLoading: boolean;
}

/**
 * Props for MySitesSection component
 * Displays user-created sites (not associated with projects)
 */
export interface MySitesSectionProps {
  sites: Site[];
  onSitePress: (site: Site) => void;
  onAddSite: () => void;
  onToggleMonitoring: (siteId: string, enabled: boolean) => Promise<void>;
  onEditSite: (site: Site) => void;
  onDeleteSite: (siteId: string) => Promise<void>;
  isLoading: boolean;
}

/**
 * Props for NotificationsSection component
 * Manages alert methods and notification preferences
 */
export interface NotificationsSectionProps {
  alertMethods: CategorizedAlertMethods;
  deviceAlertPreferences: AlertMethod[];
  onToggleMethod: (methodId: string, enabled: boolean) => Promise<void>;
  onAddMethod: (method: AlertMethodType) => void;
  onVerifyMethod: (method: AlertMethod) => void;
  onRemoveMethod: (methodId: string) => Promise<void>;
  isLoading: boolean;
}

/**
 * Props for SiteRow component
 * Reusable row component for displaying site information
 */
export interface SiteRowProps {
  site: Site;
  onPress: () => void;
  onToggleMonitoring: (enabled: boolean) => Promise<void>;
  showRadius?: boolean;
  isLoading?: boolean;
}

/**
 * Props for NotificationMethodRow component
 * Displays individual alert method with controls
 */
export interface NotificationMethodRowProps {
  method: AlertMethod;
  onToggle: (enabled: boolean) => Promise<void>;
  onVerify: () => void;
  onRemove: () => Promise<void>;
  isLoading?: boolean;
}

/**
 * Props for SiteInfoSheet component
 * Bottom sheet displaying detailed site information and actions
 */
export interface SiteInfoSheetProps {
  visible: boolean;
  onClose: () => void;
  site: Site | null;
  onToggleMonitoring: (enabled: boolean) => Promise<void>;
  onEditSite: () => void;
  onDeleteSite: () => Promise<void>;
  onNavigateToMap: () => void;
  isLoading: boolean;
}

/**
 * Props for EditSiteModal component
 * Modal for editing site name and radius
 */
export interface EditSiteModalProps {
  visible: boolean;
  onClose: () => void;
  site: Site | null;
  onSave: (name: string, radius: number) => Promise<void>;
  isLoading: boolean;
}

/**
 * Props for RadiusDropdownOverlay component
 * Dropdown overlay for selecting site monitoring radius
 */
export interface RadiusDropdownOverlayProps {
  visible: boolean;
  onClose: () => void;
  currentRadius: number;
  position: {x: number; y: number};
  onSelectRadius: (radius: number) => Promise<void>;
  isLoading: boolean;
}

// ============================================================================
// Hook Return Type Interfaces
// ============================================================================

/**
 * Return type for useSettingsData hook
 * Provides data fetching and caching for Settings screen
 */
export interface UseSettingsDataReturn {
  sites: Site[];
  groupedProjects: GroupedProject[];
  alertMethods: CategorizedAlertMethods;
  deviceAlertPreferences: AlertMethod[];
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<void>;
}

/**
 * Return type for useSettingsActions hook
 * Provides mutation functions for Settings screen operations
 */
export interface UseSettingsActionsReturn {
  updateSite: (siteId: string, data: UpdateSiteInput) => Promise<void>;
  deleteSite: (siteId: string) => Promise<void>;
  toggleSiteMonitoring: (siteId: string, enabled: boolean) => Promise<void>;
  toggleAlertMethod: (methodId: string, enabled: boolean) => Promise<void>;
  removeAlertMethod: (methodId: string) => Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;
}

/**
 * Return type for useAlertPreferencesVM hook
 * Provides device-specific alert preference filtering logic
 */
export interface UseAlertPreferencesVMReturn {
  deviceAlertPreferences: AlertMethod[];
  refreshDevicePreferences: () => Promise<void>;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Grouped project with associated sites
 * Used for displaying Plant-for-the-Planet projects in Settings
 */
export interface GroupedProject {
  projectId: string;
  projectName: string;
  sites: Site[];
}

/**
 * Alert methods categorized by type
 * Used for organizing notification methods in Settings UI
 */
export interface CategorizedAlertMethods {
  email: AlertMethod[];
  sms: AlertMethod[];
  device: AlertMethod[];
  whatsapp: AlertMethod[];
  webhook: AlertMethod[];
}

/**
 * Alert method type enum
 * Represents the different notification channels available
 */
export type AlertMethodType =
  | 'email'
  | 'sms'
  | 'device'
  | 'whatsapp'
  | 'webhook';
