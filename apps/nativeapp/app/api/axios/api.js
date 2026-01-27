import axios from 'axios';

import ApiUrl from '../axios/url';
import {Config} from '../../../config';

axios.defaults.timeout = 30000;

// console.log('Config.API_URL', Config.API_URL);
export default function fireApi({method, URL, data, header, token}) {
  const url = URL === ApiUrl.userDetails ? Config.API_URL + URL : URL;
  const verb = method?.toLowerCase();

  if (!verb || typeof axios[verb] !== 'function') {
    throw new Error(`Unsupported HTTP method: ${method}`);
  }

  const baseHeaders = {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    baseHeaders.headers.Authorization = `Bearer ${token}`;
  }

  const config = header || baseHeaders;
  const needsPayload = ['post', 'put', 'patch'].includes(verb);

  const request = () =>
    needsPayload ? axios[verb](url, data, config) : axios[verb](url, config);

  return request()
    .then(response => {
      console.log('response', response);
      return response;
    })
    .catch(error => {
      if (error.response) {
        // The request was made and the server responded with a status code, that falls out of the range of 2xx
        // console.log(error.response.data);
        // console.log(error.response.status);
        // console.log(error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // console.log(error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        // console.log('Error', error.message);
      }
      console.log('fireApi error', error.config);
      console.log('fireApi error response', error.toJSON());
      request();
    });
}
