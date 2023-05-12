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
};
