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
  editUserDetails: async (token, data) => {
    return fireApi({
      method: 'PUT',
      URL: ApiUrl.userDetails,
      token,
      data,
    });
  },
  sites: async token => {
    return fireApi({
      method: 'GET',
      URL: ApiUrl.sites,
      token,
    });
  },
  addSite: async (token, data) => {
    return fireApi({
      method: 'POST',
      URL: ApiUrl.sites,
      token,
      data,
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
  getAlertListPreferences: async (token, data) => {
    return fireApi({
      method: 'GET',
      URL: ApiUrl.alertPreferencesList,
      token,
    });
  },
  createAlertPreferences: async (token, data) => {
    return fireApi({
      method: 'POST',
      URL: ApiUrl.alertPreferencesList,
      token,
      data,
    });
  },
  updateAlertPreferences: async (token, data) => {
    return fireApi({
      method: 'PUT',
      URL: ApiUrl.alertPreferencesList,
      token,
      data,
    });
  },
  deleteAlertPreferences: async (token, param) => {
    return fireApi({
      method: 'DELETE',
      URL: ApiUrl.alertPreferencesList,
      token,
    });
  },
};