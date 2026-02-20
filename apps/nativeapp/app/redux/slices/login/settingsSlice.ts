import {createSlice, createSelector} from '@reduxjs/toolkit';
import type {RootState} from '../../store';

interface SettingsState {
  alertMethods: {
    enabled: {
      email: boolean;
      device: boolean;
      sms: boolean;
      whatsapp: boolean;
      webhook: boolean;
    };
  };
}

const initialState: SettingsState = {
  alertMethods: {
    enabled: {
      email: true,
      device: true,
      sms: true,
      whatsapp: true,
      webhook: true,
    },
  },
};

export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setAlertMethodsEnabled: (state, action) => {
      const _payload = action.payload;
      if (!_payload) {
        return;
      }
      const _settings = _payload?.data?.settings;
      if (_settings?.alertMethods?.enabled) {
        state.alertMethods.enabled = _settings?.alertMethods?.enabled;
      }
    },
  },
});

export const {setAlertMethodsEnabled} = settingsSlice.actions;
export default settingsSlice.reducer;

// Typed Selectors
export const selectAlertMethodsEnabled = (state: RootState) =>
  state.settingsSlice.alertMethods.enabled;

export const selectIsEmailEnabled = (state: RootState): boolean =>
  state.settingsSlice.alertMethods.enabled.email;

export const selectIsDeviceEnabled = (state: RootState): boolean =>
  state.settingsSlice.alertMethods.enabled.device;

export const selectIsSmsEnabled = (state: RootState): boolean =>
  state.settingsSlice.alertMethods.enabled.sms;

export const selectIsWhatsAppEnabled = (state: RootState): boolean =>
  state.settingsSlice.alertMethods.enabled.whatsapp;

export const selectIsWebhookEnabled = (state: RootState): boolean =>
  state.settingsSlice.alertMethods.enabled.webhook;

// Memoized Selector using createSelector
export const selectAlertMethodEnabled = createSelector(
  [
    selectAlertMethodsEnabled,
    (
      _state: RootState,
      method: keyof SettingsState['alertMethods']['enabled'],
    ) => method,
  ],
  (alertMethodsEnabled, method): boolean => alertMethodsEnabled[method],
);
