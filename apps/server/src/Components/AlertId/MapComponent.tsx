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
            <Marker longitude={longitude} latitude={latitude} anchor="bottom">
                <div className={classes.vectorAnimationContainer}>
                    <Image src={ellipse1} alt="Ellipse 1" className={classes.pulseAnimation1} />
                    <Image src={vector} alt="Map Focus" className={classes.vector} />
                    <Image src={ellipse2} alt="Ellipse 2" className={classes.pulseAnimation2} style={{ animationDelay: '0.5s' }} />
                </div>
            </Marker>
            <NavigationControl />
            <ScaleControl />
            <FullscreenControl />
        </Map>
    );
};

export default MapComponent;
