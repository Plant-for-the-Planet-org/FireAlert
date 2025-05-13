import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';

import {AppDispatch, RootState, store} from '../../store';
import {ApiService} from '../../../api/apiCalls/apiCalls';
import {setAlertMethodsEnabled} from './settingsSlice';

interface LoginState {
  isLoggedIn: boolean;
  accessToken: string;
  userDetails: any;
  configData: any;
}

const initialState: LoginState = {
  isLoggedIn: false,
  accessToken: '',
  userDetails: null,
  configData: null,
};

export const loginSlice = createSlice({
  name: 'login',
  initialState,
  reducers: {
    updateIsLoggedIn: (state, action: PayloadAction<boolean>) => {
      state.isLoggedIn = action.payload;
    },
    updateAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
    },
    updateUserDetails: (state, action: PayloadAction<any>) => {
      state.userDetails = action.payload;
    },
    updateConfigData: (state, action: PayloadAction<any>) => {
      state.configData = action.payload;
    },
  },
});

export const {
  updateIsLoggedIn,
  updateConfigData,
  updateAccessToken,
  updateUserDetails,
} = loginSlice.actions;
export default loginSlice.reducer;

export const getUserDetails = (request: any) => {
  return async (dispatch: AppDispatch, getState: RootState) => {
    const {onSuccess, onFail} = request;
    try {
      const res = await ApiService.userDetails(
        getState().loginSlice?.accessToken,
      );
      if (res?.status === 200) {
        onSuccess();
        dispatch(updateUserDetails(res?.data?.result?.data?.json));

        dispatch(setAlertMethodsEnabled(res?.data?.result?.data?.json));
      } else {
        onFail(res?.data?.message || 'Something went wrong');
      }
    } catch (e) {
      console.log(e);
    }
  };
};

export const getConfigData = (request: any) => {
  return async (dispatch: AppDispatch, getState: RootState) => {
    const {onSuccess, onFail} = request;
    try {
      const res = await ApiService.configData(
        getState().loginSlice?.accessToken,
      );
      if (res?.status === 200) {
        onSuccess();
        dispatch(updateConfigData(res?.data));
      } else {
        onFail(res?.data?.message || 'Something went wrong');
      }
    } catch (e) {
      console.log(e);
    }
  };
};
