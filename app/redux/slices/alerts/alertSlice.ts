import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';

import {ApiService} from '../../../api/apiCalls/apiCalls';

interface alertState {
  alerts: Array<object>;
}

const initialState: alertState = {
  alerts: [],
};

export const alertSlice = createSlice({
  name: 'alert',
  initialState,
  reducers: {
    updateAlerts: (state, action: PayloadAction<Array<object>>) => {
      state.alerts = action.payload;
    },
  },
});

export const {updateAlerts} = alertSlice.actions;
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
