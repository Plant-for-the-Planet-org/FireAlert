import ApiUrl from '../axios/url';
import fireApi from '../axios/api';

export const ApiService = {
  userDetails: async token => {
    return fireApi({
      method: 'GET',
      URL: ApiUrl.userDetails,
      token,
    });
  },
  configData: async token => {
    return fireApi({
      method: 'GET',
      URL: 'https://app.plant-for-the-planet.org/app/config',
      token,
    });
  },
};
