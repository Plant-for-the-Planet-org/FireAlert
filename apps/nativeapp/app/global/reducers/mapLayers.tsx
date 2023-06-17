import React, {createContext, useContext, useReducer} from 'react';

import {SELECT_MAP_LAYER} from '../actions/types';

const initialState = 'Satellite';

const mapLayerReducer = (state = initialState, action) => {
  switch (action.type) {
    case SELECT_MAP_LAYER:
      return action.payload;

    default:
      return state;
  }
};

// Creates the context object for Layers. Used by component to get the state and dispatch function of map
export const MapLayerContext = createContext({
  state: initialState,
  dispatch: () => null,
});

// Create a provider for components to consume and subscribe to changes
export const MapLayerProvider = ({children}) => {
  // stores state and dispatch of layer using the reducer and initialState
  const [state, dispatch] = useReducer(mapLayerReducer, initialState);

  // returns a provider used by component to access the state and dispatch function of mapLayers
  return (
    <MapLayerContext.Provider value={{state, dispatch}}>
      {children}
    </MapLayerContext.Provider>
  );
};

export const useMapLayers = () => {
  const context = useContext(MapLayerContext);
  if (!context) {
    throw new Error('MapLayerContext must be used with MapLayerContext!');
  }
  return context;
};
