import { FC } from 'react';
import Map, { Marker } from 'react-map-gl';
import getConfig from 'next/config';
import "mapbox-gl/dist/mapbox-gl.css";

interface AlertData {
    latitude: string;
    longitude: string;
}

interface Props {
    alertData: AlertData;
}

const MapComponent: FC<Props> = ({ alertData }) => {

    const { publicRuntimeConfig } = getConfig();
    const { MAP_BOX_ACCESS_TOKEN } = publicRuntimeConfig;
    const latitude = parseFloat(alertData.latitude)
    const longitude = parseFloat(alertData.longitude)

    return (
        <Map
            initialViewState={{
                latitude: latitude,
                longitude: longitude,
                zoom: 12
            }}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/streets-v9"
            mapboxAccessToken={MAP_BOX_ACCESS_TOKEN}
        >
            <Marker latitude={latitude} longitude={longitude} color="red" />
        </Map>
    );
};

export default MapComponent;
