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
        onSuccess();
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
    const {params, onSuccess, onFail} = request;
    try {
      const res = await ApiService.deleteSite(
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

export const editSite = request => {
  return async (dispatch, getState) => {
    const {payload, onSuccess, onFail} = request;
    try {
      const res = await ApiService.editSite(
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

export const addSite = request => {
  return async (dispatch, getState) => {
    const {payload, onSuccess, onFail} = request;
    try {
      const res = await ApiService.addSite(
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
