import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';

import {ApiService} from '../../../api/apiCalls/apiCalls';

interface alertState {
  alerts: Array<object>;
  alertListPreferences: Array<object>;
}

const initialState: alertState = {
  alerts: [],
  alertListPreferences: [],
};

export const alertSlice = createSlice({
  name: 'alert',
  initialState,
  reducers: {
    updateAlerts: (state, action: PayloadAction<Array<object>>) => {
      state.alerts = action.payload;
    },
    updateAlertListPreferences: (
      state,
      action: PayloadAction<Array<object>>,
    ) => {
      state.alertListPreferences = action.payload;
    },
  },
});

export const {updateAlerts, updateAlertListPreferences} = alertSlice.actions;
export default alertSlice.reducer;

export const getAlerts = request => {
  return async (dispatch, getState) => {
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

export const getAlertsPreferences = request => {
  return async (dispatch, getState) => {
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

export const createAlertPreferences = request => {
  return async (dispatch, getState) => {
    const {onSuccess, onFail} = request;
    try {
      const res = await ApiService.createAlertPreferences(
        getState().loginSlice?.accessToken,
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

export const updateAlertPreferences = request => {
  return async (dispatch, getState) => {
    const {onSuccess, onFail} = request;
    try {
      const res = await ApiService.updateAlertPreferences(
        getState().loginSlice?.accessToken,
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
