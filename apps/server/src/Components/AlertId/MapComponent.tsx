import React from 'react'
import { FC } from 'react';
import Map, { NavigationControl, ScaleControl, FullscreenControl, MapRef, Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import mapStyle from '../../data/mapStyleOutput.json'
import Image from 'next/image';
import vector from '../../../public/alertPage/Vector.png'
import { highlightWave } from '../../../../nativeapp/app/assets/animation/lottie'
import Lottie from 'react-lottie';
import classes from './MapComponent.module.css'
import { type AlertData } from './AlertId';

interface Props {
    alertData: AlertData;
}

const MapComponent: FC<Props> = ({ alertData }) => {
    const latitude = parseFloat(alertData.latitude);
    const longitude = parseFloat(alertData.longitude);
    let polygon = alertData.polygon;

    // Convert polygon data to GeoJSON format
    const polygonGeoJSON = {
        type: "Feature",
        geometry: polygon
    };

    const mapRef = React.useRef<MapRef | null>(null);
    const [viewState, setViewState] = React.useState({
        latitude: latitude,
        longitude: longitude,
        zoom: 13
    });

    const onMapLoad = React.useCallback(async () => {
        const map = mapRef?.current?.getMap();
        map?.setStyle(mapStyle);
    }, [mapStyle]);

    const defaultLottieOptions = {
        loop: true,
        autoplay: true,
        animationData: highlightWave,
    };

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
            <Marker longitude={longitude} latitude={latitude} anchor="bottom">
                <div className={classes.vectorAnimationContainer}>
                    <Image src={vector} alt="Map Focus" className={classes.vector} />
                    <div className={classes.lottieAnimation}>
                        <Lottie
                            options={defaultLottieOptions}
                        />
                    </div>
                </div>
            </Marker>
            {polygon.type !== 'Point' && (
                <Source id="polygon" type="geojson" data={polygonGeoJSON}>
                <Layer
                    id={`${polygon.type}-fill`}
                    type="fill"
                    paint={{
                        'fill-color': '#e86f56',  // White color
                        'fill-opacity': 0.1,
                    }}
                />
                <Layer
                    id={`${polygon.type}-line`}
                    type="line"
                    paint={{
                        'line-width': 2,
                        'line-color': '#e86f56',  // White color
                        'line-opacity': 1,
                    }}
                />
            </Source>
            )}
            <NavigationControl />
            <ScaleControl />
            <FullscreenControl />
        </Map>
    );
};

export default MapComponent;
