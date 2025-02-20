import React, {useMemo} from 'react';
import MapboxGL from '@rnmapbox/maps';
import {useMapLayers} from '../../global/reducers/mapLayers';

const LAYER_IDENTIFIERS = ['FireRisk'];

export default function FireRiskLayer() {
  const {state: layerState} = useMapLayers();

  const layerConfig = {
    id: '534805df-4c11-4188-b67d-c09bf7349ba6',
    sourceId: 'fireRiskSource',
  };

  const showFireRiskLayer = useMemo(() => {
    if (LAYER_IDENTIFIERS.includes(layerState)) {
      return true;
    }
  }, [layerState]);

  if (!showFireRiskLayer) {
    return null;
  }

  return (
    <>
      <MapboxGL.RasterSource
        id={layerConfig.sourceId}
        tileUrlTemplates={[
          'https://layers-t.plant-for-the-planet.org/534805df-4c11-4188-b67d-c09bf7349ba6/2025/2/{z}/{x}/{y}.png',
        ]}
        maxZoomLevel={5}
      />
      <MapboxGL.RasterLayer
        id={layerConfig.id}
        sourceID={layerConfig.sourceId}
        style={{
          rasterOpacity: 1,
        }}
      />
    </>
  );
}
