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
  deleteSite: async token => {
    return fireApi({
      method: 'DELETE',
      URL: ApiUrl.sites,
      token,
    });
  },
  editSite: async (token, data) => {
    return fireApi({
      method: 'PUT',
      URL: ApiUrl.sites,
      token,
      data,
    });
  },
  getAlerts: async (token, data) => {
    return fireApi({
      method: 'GET',
      URL: ApiUrl.alerts,
      token,
    });
  },
};
