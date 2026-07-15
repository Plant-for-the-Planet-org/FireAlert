import Auth0 from 'react-native-auth0';

import {Config} from '../../config';
import {store} from '../redux/store';
import {
  updateAccessToken,
  updateIsLoggedIn,
  setSessionExpired,
} from '../redux/slices/login/loginSlice';
import {storeData, clearAll} from './localStorage';

const auth0 = new Auth0({
  domain: Config.AUTH0_DOMAIN,
  clientId: Config.AUTH0_CLIENT_ID,
});

let inFlightRefresh: Promise<string | null> | null = null;

export async function forceLogout() {
  try {
    await auth0.credentialsManager.clearCredentials();
    await auth0.webAuth.clearSession({}, {useLegacyCallbackUrl: true});
  } finally {
    store.dispatch(updateIsLoggedIn(false));
    store.dispatch(setSessionExpired(true));
    await clearAll();
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  inFlightRefresh = (async () => {
    try {
      const creds = await auth0.credentialsManager.getCredentials(
        undefined,
        0,
        {},
        true,
      );
      if (!creds?.accessToken) {
        throw new Error('no access token from refresh');
      }
      await storeData('cred', creds);
      store.dispatch(updateAccessToken(creds.accessToken));
      return creds.accessToken;
    } catch (error) {
      console.log('refreshAccessToken failed', error);
      await forceLogout();
      return null;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}
