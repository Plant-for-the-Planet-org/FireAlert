import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';

import {RootState, AppDispatch} from '../../store';
import {ApiService} from '../../../api/apiCalls/apiCalls';

type SiteStructure = {
  [n: string]: Array<object>;
};

interface SiteState {
  sites: SiteStructure;
}

const initialState: SiteState = {
  sites: {
    point: [],
    polygon: [],
  },
};

export const siteSlice = createSlice({
  name: 'site',
  initialState,
  reducers: {
    updateSites: (state, action: PayloadAction<object>) => {
      if (action.payload instanceof Array) {
        action.payload
          .map(item => item.type)
          .forEach(type => {
            if (action.payload instanceof Array) {
              const filteredData = action.payload?.filter(
                item => item?.type === type,
              );
              state.sites[String(type).toLowerCase()] = filteredData;
            }
          });
      }
    },
  },
});

export const {updateSites} = siteSlice.actions;
export default siteSlice.reducer;

export const getSites = (request: any) => {
  return async (dispatch: AppDispatch, getState: RootState) => {
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

export const deleteSite = (request: any) => {
  return async (dispatch: AppDispatch, getState: RootState) => {
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

export const editSite = (request: any) => {
  return async (dispatch: AppDispatch, getState: RootState) => {
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

export const addSite = (request: any) => {
  return async (dispatch: AppDispatch, getState: RootState) => {
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
