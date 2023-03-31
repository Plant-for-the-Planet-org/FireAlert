import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';

import {AppDispatch, RootState} from '../../store';
import {ApiService} from '../../../api/apiCalls/apiCalls';

type AlertPreferencesStructure = {
  [n: string]: Array<object>;
};
interface alertState {
  alerts: Array<object>;
  alertListPreferences: AlertPreferencesStructure;
}

const initialState: alertState = {
  alerts: [],
  alertListPreferences: {
    sms: [],
    email: [],
    whatsapp: [],
  },
};

export const alertSlice = createSlice({
  name: 'alert',
  initialState,
  reducers: {
    updateAlerts: (state, action: PayloadAction<Array<object>>) => {
      state.alerts = action.payload;
    },
    updateAlertListPreferences: (state, action: PayloadAction<object>) => {
      if (action.payload instanceof Array) {
        action.payload
          .map(item => item.method)
          .forEach(method => {
            if (action.payload instanceof Array) {
              const filteredData = action.payload?.filter(
                item => item?.method === method,
              );
              state.alertListPreferences[method] = filteredData;
            }
          });
      }
    },
  },
});

export const {updateAlerts, updateAlertListPreferences} = alertSlice.actions;
export default alertSlice.reducer;

export const getAlerts = (request: any) => {
  return async (dispatch: AppDispatch, getState: RootState) => {
    const {onSuccess, onFail} = request;
    try {
      const res = await ApiService.getAlerts(
        getState().loginSlice?.accessToken,
      );
      if (res?.status === 200) {
        onSuccess();
        dispatch(updateAlerts(res?.data));
      } else {
        onFail(res?.data?.message || 'Something went wrong');
      }
    } catch (e) {
      console.log(e);
    }
  };
};

export const getAlertsPreferences = (request: any) => {
  return async (dispatch: AppDispatch, getState: RootState) => {
    const {onSuccess, onFail} = request;
    try {
      const res = await ApiService.getAlertListPreferences(
        getState().loginSlice?.accessToken,
      );
      if (res?.status === 200) {
        onSuccess();
        dispatch(updateAlertListPreferences(res?.data));
      } else {
        onFail(res?.data?.message || 'Something went wrong');
      }
    } catch (e) {
      console.log(e);
    }
  };
};

export const createAlertPreferences = (request: any) => {
  return async (dispatch: AppDispatch, getState: RootState) => {
    const {payload, onSuccess, onFail} = request;
    try {
      const res = await ApiService.createAlertPreferences(
        getState().loginSlice?.accessToken,
        payload,
      );
      if (res?.status === 200) {
        onSuccess();
      } else {
        onFail(res?.data?.message || 'Something went wrong');
      }
    } catch (e) {
      console.log(e);
    }
  };
};

export const updateAlertPreferences = (request: any) => {
  return async (dispatch: AppDispatch, getState: RootState) => {
    const {payload, onSuccess, onFail} = request;
    try {
      const res = await ApiService.updateAlertPreferences(
        getState().loginSlice?.accessToken,
        payload,
      );
      if (res?.status === 200) {
        onSuccess();
      } else {
        onFail(res?.data?.message || 'Something went wrong');
      }
    } catch (e) {
      console.log(e);
    }
  };
};

export const deleteAlertPreferences = (request: any) => {
  return async (dispatch: AppDispatch, getState: RootState) => {
    const {param, onSuccess, onFail} = request;
    try {
      const res = await ApiService.deleteAlertPreferences(
        getState().loginSlice?.accessToken,
        param,
      );
      if (res?.status === 200) {
        onSuccess();
      } else {
        onFail(res?.data?.message || 'Something went wrong');
      }
    } catch (e) {
      console.log(e);
    }
  };
};
