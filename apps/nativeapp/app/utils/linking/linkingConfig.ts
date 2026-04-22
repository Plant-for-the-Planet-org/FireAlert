import {
  getStateFromPath as defaultGetStateFromPath,
  type LinkingOptions,
} from '@react-navigation/native';

export const DEEP_LINK_SCHEME = 'firealert';
export const DEEP_LINK_HOST = 'firealert.plant-for-the-planet.org';

const PREFIXES = [
  `https://${DEEP_LINK_HOST}`,
  `http://${DEEP_LINK_HOST}`,
  `${DEEP_LINK_SCHEME}://`,
];

const parseQuery = (queryString?: string): Record<string, string> | undefined => {
  if (!queryString) {
    return undefined;
  }
  const params: Record<string, string> = {};
  const usp = new URLSearchParams(queryString);
  usp.forEach((value, key) => {
    params[key] = value;
  });
  return params;
};

const homeState = (params: Record<string, unknown>) => ({
  routes: [
    {
      name: 'BottomTab',
      state: {
        routes: [{name: 'Home', params}],
      },
    },
  ],
});

export const linking: LinkingOptions<ReactNavigation.RootParamList> = {
  prefixes: PREFIXES,
  config: {
    screens: {
      BottomTab: {
        screens: {
          Home: 'home',
          Settings: 'settings',
        },
      },
      Verification: 'verify/:verificationType',
      ProtectedAreas: 'protected-areas',
      CreatePolygon: 'create-polygon',
      SelectLocation: 'select-location',
      UploadPolygon: 'upload-polygon',
    },
  },
  getStateFromPath: (path, options) => {
    const [pathname = '', queryString] = path.split('?');
    const segments = pathname.split('/').filter(Boolean);
    const query = parseQuery(queryString);

    if (segments[0] === 'alert' && segments[1]) {
      return homeState({...(query ?? {}), alertId: segments[1]});
    }

    if (segments[0] === 'incident' && segments[1]) {
      return homeState({...(query ?? {}), incidentId: segments[1]});
    }

    return defaultGetStateFromPath(path, options);
  },
};
