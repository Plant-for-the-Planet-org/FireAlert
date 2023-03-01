import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';

import {RootState} from './../../store';
import {ApiService} from '../../../api/apiCalls/apiCalls';

interface SiteState {
  sites: Array<object>;
}

const initialState: SiteState = {
  sites: [],
};

export const siteSlice = createSlice({
  name: 'site',
  initialState,
  reducers: {
    updateSites: (state, action: PayloadAction<Array<object>>) => {
      state.sites = action.payload;
    },
  },
});

export const {updateSites} = siteSlice.actions;
export default siteSlice.reducer;

export const getSites = request => {
  return async (dispatch, getState) => {
    const {onSuccess, onFail} = request;
    try {
      const res = await ApiService.sites(getState().loginSlice?.accessToken);
      if (res?.status === 200) {
        dispatch(updateSites(res?.data));
      } else {
        onFail(res?.data?.message || 'Something went wrong');
      }
    } catch (e) {
      console.log(e);
    }
  };
};

export const deleteSite = request => {
  return async (dispatch, getState) => {
    const {onSuccess, onFail, payload} = request;
    try {
      const res = await ApiService.deleteSite(
        getState().loginSlice?.accessToken,
        payload,
      );
      if (res?.status === 200) {
      } else {
        onFail(res?.data?.message || 'Something went wrong');
      }
    } catch (e) {
      console.log(e);
    }
  };
};
