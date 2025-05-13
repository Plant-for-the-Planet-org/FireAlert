import {createSlice} from '@reduxjs/toolkit';

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
