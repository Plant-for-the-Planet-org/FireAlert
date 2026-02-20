import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';

export type RootStackParamList = {
  Home: {
    bboxGeo?: [number, number, number, number];
    siteInfo?: any[];
    siteIncidentId?: string;
  };
  Settings: undefined;
  Verification: {
    verificationType: string;
  };
  Otp: {
    verificationType: string;
    alertMethod: any;
  };
  SelectLocation: undefined;
  CreatePolygon: undefined;
  ProtectedAreas: undefined;
  BottomTab: {
    screen: string;
    params?: any;
  };
};

export type NavigationProp<T extends keyof RootStackParamList> =
  NativeStackNavigationProp<RootStackParamList, T>;

export type RouteProps<T extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  T
>;
