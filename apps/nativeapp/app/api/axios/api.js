import axios from 'axios';
import Config from 'react-native-config';

import ApiUrl from '../axios/url';

axios.defaults.timeout = 30000;

export default function fireApi({method, URL, data, header, token}) {
  if (URL === ApiUrl.userDetails) {
    // URL = Config.NEXT_API_URL + URL;
    URL = Config.API_URL + URL;
  } else {
    URL = URL;
  }
  if (method === 'POST') {
    let headers = {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    };
    if (token) {
      headers = {
        headers: {
          ...headers.headers,
          Authorization: `Bearer ${token}`,
        },
      };
    }
    if (header) {
      headers = header;
    }
    return axios.post(URL, data, headers).then(
      res => {
        return res;
      },
      error => {
        return axios.post(URL, data, headers);
      },
    );
  } else if (method === 'GET') {
    let headers = {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    };
    if (token) {
      headers = {
        headers: {
          ...headers.headers,
          Authorization: `Bearer ${token}`,
        },
      };
    }
    if (header) {
      headers = header;
    }
    return axios.get(URL, headers).then(
      res => {
        return res;
      },
      error => {
        return axios.get(URL, headers);
      },
    );
  } else if (method === 'DELETE') {
    let headers = {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    };
    if (token) {
      headers = {
        headers: {
          ...headers.headers,
          Authorization: `Bearer ${token}`,
        },
      };
    }
    if (header) {
      headers = header;
    }
    return axios.delete(URL, headers).then(
      res => {
        return res;
      },
      error => {
        return axios.delete(URL, headers);
      },
    );
  } else if (method === 'PUT') {
    let headers = {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    };
    if (token) {
      headers = {
        headers: {
          ...headers.headers,
          Authorization: `Bearer ${token}`,
        },
      };
    }
    if (header) {
      headers = header;
    }
    return axios.put(URL, data, headers).then(
      res => {
        return res;
      },
      error => {
        return axios.put(URL, data, headers);
      },
    );
  }
}
