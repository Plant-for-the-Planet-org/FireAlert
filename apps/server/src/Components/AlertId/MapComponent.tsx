import React from 'react'
import { FC, useEffect } from 'react';
import Map, { NavigationControl, ScaleControl, FullscreenControl, MapRef, Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import mapStyle from '../../data/mapStyleOutput.json'
import Image from 'next/image';
import vector from '../../../public/alertPage/mapFocus/Vector.svg'
import ellipse1 from '../../../public/alertPage/mapFocus/Ellipse1.svg'
import ellipse2 from '../../../public/alertPage/mapFocus/Ellipse2.svg'
import classes from './MapComponent.module.css'

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

        const size = 200;

        // This implements `StyleImageInterface`
        // to draw a pulsing dot icon on the map.
        const pulsingDot = {
            width: size,
            height: size,
            data: new Uint8Array(size * size * 4),

            // When the layer is added to the map,
            // get the rendering context for the map canvas.
            onAdd: function () {
                const canvas = document.createElement('canvas');
                canvas.width = this.width;
                canvas.height = this.height;
                this.context = canvas.getContext('2d');
            },

            // Call once before every frame where the icon will be used.
            render: function () {
                const duration = 1000;
                const t = (performance.now() % duration) / duration;

                const radius = (size / 2) * 0.3;
                const outerRadius = (size / 2) * 0.7 * t + radius;
                const context = this.context;

                // Draw the outer circle.
                context.clearRect(0, 0, this.width, this.height);
                context.beginPath();
                context.arc(
                    this.width / 2,
                    this.height / 2,
                    outerRadius,
                    0,
                    Math.PI * 2
                );
                context.fillStyle = `rgba(255, 200, 200, ${1 - t})`;
                context.fill();

                // Draw the inner circle.
                context.beginPath();
                context.arc(
                    this.width / 2,
                    this.height / 2,
                    radius,
                    0,
                    Math.PI * 2
                );
                context.fillStyle = 'rgba(255, 100, 100, 1)';
                context.strokeStyle = 'white';
                context.lineWidth = 2 + 4 * (1 - t);
                context.fill();
                context.stroke();

                // Update this image's data with data from the canvas.
                this.data = context.getImageData(
                    0,
                    0,
                    this.width,
                    this.height
                ).data;

                // Continuously repaint the map, resulting
                // in the smooth animation of the dot.
                map.triggerRepaint();

                // Return `true` to let the map know that the image was updated.
                return true;
            }
        };
        map?.addImage('pulsing-dot', pulsingDot, { pixelRatio: 2 });

        // Ensure map and map style is loaded
        if (map) {
            map.on('styledata', () => {
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
                            'icon-image': 'pulsing-dot'
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
