import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';

import {ApiService} from '../../../api/apiCalls/apiCalls';

interface LoginState {
  isLoggedIn: boolean;
  accessToken: string;
  userDetails: any;
}

const initialState: LoginState = {
  isLoggedIn: false,
  accessToken: '',
  userDetails: null,
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
  },
});

export const {updateIsLoggedIn, updateAccessToken, updateUserDetails} =
  loginSlice.actions;
export default loginSlice.reducer;

export const getUserDetails = request => {
  return async (dispatch, getState) => {
    const {onSuccess, onFail} = request;
    try {
      const res = await ApiService.userDetails(
        getState().loginSlice?.accessToken,
      );
      if (res?.status === 200) {
        dispatch(updateUserDetails(res?.data));
      } else {
        onFail(res?.data?.message || 'Something went wrong');
      }
    } catch (e) {
      console.log(e);
    }
  };
};
