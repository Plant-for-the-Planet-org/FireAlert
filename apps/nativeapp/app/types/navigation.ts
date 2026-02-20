/**
 * Centralized navigation type definitions
 * Defines all screen route parameters and navigation types for the app
 */

import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';

/**
 * Site feature GeoJSON structure used in navigation params
 * Defined here to avoid circular dependencies
 */
export interface SiteFeature {
  type: 'Feature';
  geometry: GeoJSON.Geometry;
  properties: {
    id: string;
    name: string;
    radius: number;
    geometry: string;
    stopAlerts: boolean;
    isPlanetRO: boolean;
    projectId?: string;
  };
}

/**
 * Root navigation stack parameter list
 * Defines all screens and their route parameters
 */
export type RootStackParamList = {
  Home: {
    bboxGeo?: [number, number, number, number];
    siteInfo?: SiteFeature[];
    siteIncidentId?: string;
  };
  Settings: undefined;
  Verification: {
    method: 'email' | 'sms' | 'whatsapp' | 'webhook';
    destination?: string;
  };
  Otp: {
    alertMethodId: string;
    destination: string;
    method: string;
  };
  SelectLocation: undefined;
  CreatePolygon: undefined;
  ProtectedAreas: undefined;
};

/**
 * Generic navigation prop type for a specific screen
 * @template T - Screen name from RootStackParamList
 */
export type NavigationProp<T extends keyof RootStackParamList> =
  NativeStackNavigationProp<RootStackParamList, T>;

/**
 * Generic route prop type for a specific screen
 * @template T - Screen name from RootStackParamList
 */
export type RouteProps<T extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  T
>;
