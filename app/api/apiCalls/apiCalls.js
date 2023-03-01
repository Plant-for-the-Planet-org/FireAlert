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
  sites: async token => {
    return fireApi({
      method: 'GET',
      URL: ApiUrl.sites,
      token,
    });
  },
  deleteSite: async (token, guid) => {
    return fireApi({
      method: 'DELETE',
      URL: ApiUrl.sites,
      data: guid,
      token,
    });
  },
};
