import axios from 'axios';

import ApiUrl from '../axios/url';
import {Config} from '../../../config';
import {refreshAccessToken} from '../../utils/auth';

axios.defaults.timeout = 30000;

// console.log('Config.API_URL', Config.API_URL);
export default async function fireApi({method, URL, data, header, token}) {
  const url = URL === ApiUrl.userDetails ? Config.API_URL + URL : URL;
  const verb = method?.toLowerCase();

  if (!verb || typeof axios[verb] !== 'function') {
    throw new Error(`Unsupported HTTP method: ${method}`);
  }

  const needsPayload = ['post', 'put', 'patch'].includes(verb);

  const buildConfig = authToken => {
    if (header) {
      return header;
    }
    const config = {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    };
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  };

  const doRequest = authToken => {
    const config = buildConfig(authToken);
    return needsPayload
      ? axios[verb](url, data, config)
      : axios[verb](url, config);
  };

  try {
    return await doRequest(token);
  } catch (error) {
    if (error?.response?.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return await doRequest(newToken);
      }
    }
    console.log('fireApi error', error.config);
    throw error;
  }
}
