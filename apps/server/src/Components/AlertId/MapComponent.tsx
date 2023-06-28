import React from 'react'
import { FC, useEffect } from 'react';
import Map, { NavigationControl, ScaleControl, FullscreenControl, MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre';
// import maplibregl from 'maplibre-gl';
// Import the CSS for maplibre-gl styles
import 'maplibre-gl/dist/maplibre-gl.css';
import mapStyle from '../../data/mapStyleOutput.json'


interface AlertData {
    latitude: string;
    longitude: string;
}

interface Props {
    alertData: AlertData;
}

const MapComponent: FC<Props> = ({ alertData }) => {
    const latitude = parseFloat(alertData.latitude);
    const longitude = parseFloat(alertData.longitude);

    const mapRef = React.useRef<MapRef | null>(null);
    const [viewState, setViewState] = React.useState({
        latitude: latitude,
        longitude: longitude,
        zoom: 13
    });

    const onMapLoad = React.useCallback(() => {
        const map = mapRef?.current?.getMap();
        map?.setStyle(mapStyle);
    }, [mapStyle]);

    return (
        <Map
            // mapLib={import('maplibre-gl')}
            initialViewState={viewState}
            onLoad={onMapLoad}
            onMove={evt => setViewState(evt.viewState)}
            ref={mapRef}
            style={{ width: '100%', height: '100%' }}
            mapStyle={mapStyle}
            scrollZoom={false}
        >
            <NavigationControl />
            <ScaleControl />
            <FullscreenControl />
        </Map>
    );
};

export default MapComponent;
