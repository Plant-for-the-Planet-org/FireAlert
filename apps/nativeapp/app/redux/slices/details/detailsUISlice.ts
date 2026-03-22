import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export type DetailsUIMode = 'incident-details' | 'alert-details' | 'none';

export interface CameraPosition {
  centerCoordinate: [number, number];
  zoomLevel: number;
}

export interface NavigationHistory {
  previousCamera?: CameraPosition;
  previousMode?: DetailsUIMode;
}

interface DetailsUIState {
  selectedIncidentId: string | null;
  selectedAlertId: string | null;
  uiMode: DetailsUIMode;
  isIncidentDetailsVisible: boolean;
  isAlertDetailsVisible: boolean;
  navigationHistory: NavigationHistory;
  currentCameraPosition?: CameraPosition;
}

const initialState: DetailsUIState = {
  selectedIncidentId: null,
  selectedAlertId: null,
  uiMode: 'none',
  isIncidentDetailsVisible: false,
  isAlertDetailsVisible: false,
  navigationHistory: {},
  currentCameraPosition: undefined,
};

const detailsUISlice = createSlice({
  name: 'detailsUI',
  initialState,
  reducers: {
    openIncidentDetails: (
      state,
      action: PayloadAction<{
        incidentId: string;
        cameraPosition?: CameraPosition;
      }>,
    ) => {
      state.selectedIncidentId = action.payload.incidentId;
      state.selectedAlertId = null;
      state.uiMode = 'incident-details';
      state.isIncidentDetailsVisible = true;
      state.isAlertDetailsVisible = false;

      // Store current camera position in history if provided
      if (action.payload.cameraPosition) {
        state.navigationHistory.previousCamera = action.payload.cameraPosition;
        state.navigationHistory.previousMode = state.uiMode;
      }
    },

    openAlertDetails: (
      state,
      action: PayloadAction<{alertId: string; cameraPosition?: CameraPosition}>,
    ) => {
      state.selectedAlertId = action.payload.alertId;
      state.uiMode = 'alert-details';
      state.isAlertDetailsVisible = true;
      state.isIncidentDetailsVisible = false;

      // Store current camera position in history if provided
      if (action.payload.cameraPosition) {
        state.navigationHistory.previousCamera = action.payload.cameraPosition;
        state.navigationHistory.previousMode = 'incident-details';
      }
    },

    closeAllDetails: state => {
      state.selectedIncidentId = null;
      state.selectedAlertId = null;
      state.uiMode = 'none';
      state.isIncidentDetailsVisible = false;
      state.isAlertDetailsVisible = false;
      state.navigationHistory = {};
      state.currentCameraPosition = undefined;
    },

    backToIncidentDetails: state => {
      if (state.selectedIncidentId) {
        state.selectedAlertId = null;
        state.uiMode = 'incident-details';
        state.isIncidentDetailsVisible = true;
        state.isAlertDetailsVisible = false;
      }
    },

    updateCameraPosition: (state, action: PayloadAction<CameraPosition>) => {
      state.currentCameraPosition = action.payload;
    },

    clearNavigationHistory: state => {
      state.navigationHistory = {};
    },
  },
});

export const {
  openIncidentDetails,
  openAlertDetails,
  closeAllDetails,
  backToIncidentDetails,
  updateCameraPosition,
  clearNavigationHistory,
} = detailsUISlice.actions;

export default detailsUISlice.reducer;
