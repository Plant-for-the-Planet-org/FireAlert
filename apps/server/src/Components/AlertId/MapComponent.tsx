import React from 'react';
import {FC} from 'react';
import Map, {
  NavigationControl,
  ScaleControl,
  FullscreenControl,
  MapRef,
  Marker,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import mapStyle from '../../data/mapStyleOutput.json';
import Image from 'next/image';
import vector from '../../../public/alertPage/Vector.png';
import {highlightWave} from '../../../../nativeapp/app/assets/animation/lottie';
import Lottie from 'react-lottie';
import classes from './MapComponent.module.css';

interface AlertData {
  latitude: string;
  longitude: string;
}

interface Props {
  alertData: AlertData;
}

const MapComponent: FC<Props> = ({alertData}) => {
  const latitude = parseFloat(alertData.latitude);
  const longitude = parseFloat(alertData.longitude);

  const mapRef = React.useRef<MapRef | null>(null);
  const [viewState, setViewState] = React.useState({
    latitude: latitude,
    longitude: longitude,
    zoom: 13,
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
      style={{width: '100%', height: '100%'}}
      mapStyle={mapStyle}
      scrollZoom={false}>
      <Marker longitude={longitude} latitude={latitude} anchor="bottom">
        <div className={classes.vectorAnimationContainer}>
          <Image src={vector} alt="Map Focus" className={classes.vector} />
          <div className={classes.lottieAnimation}>
            <Lottie options={defaultLottieOptions} />
          </div>
        </div>
      </Marker>
      <NavigationControl />
      <ScaleControl />
      <FullscreenControl />
    </Map>
  );
};

export default MapComponent;
