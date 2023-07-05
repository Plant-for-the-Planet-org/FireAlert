import React from 'react'
import { FC, useEffect } from 'react';
import Map, { NavigationControl, ScaleControl, FullscreenControl, MapRef, Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import mapStyle from '../../data/mapStyleOutput.json'
import vector from '../../../public/alertPage/mapFocus/Vector.png'

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

    const onMapLoad = React.useCallback(async () => {
        const map = mapRef?.current?.getMap();
        map?.setStyle(mapStyle);

        const vectorImg = new Image();
        vectorImg.src = vector.src;

        await new Promise((resolve, reject) => {
            vectorImg.onload = resolve;
            vectorImg.onerror = reject;
        });

        // Ensure map and map style is loaded
        if (map) {
            map.on('styledata', () => {
                // Check if the image has completed loading and if the image is not already added
                if (vectorImg.complete && !map.hasImage('vector-img')) {
                    map.addImage('vector-img', vectorImg, { pixelRatio: 6 });
                }

                // Check if the source and layer already exists, only add if they don't.
                if (!map.getSource('dot-point')) {
                    map.addSource('dot-point', {
                        'type': 'geojson',
                        'data': {
                            'type': 'FeatureCollection',
                            'features': [
                                {
                                    'type': 'Feature',
                                    'geometry': {
                                        'type': 'Point',
                                        'coordinates': [longitude, latitude] // icon position [lng, lat]
                                    }
                                }
                            ]
                        }
                    });

                    map.addLayer({
                        'id': 'layer-with-pulsing-dot',
                        'type': 'symbol',
                        'source': 'dot-point',
                        'layout': {
                            'icon-image': 'vector-img'
                        }
                    });
                }
            });
        }
    }, [mapStyle]);



    return (
        <Map
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
