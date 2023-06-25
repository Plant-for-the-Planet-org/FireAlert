import { FC } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

interface AlertData {
  latitude: string;
  longitude: string;
}

interface Props {
  alertData: AlertData;
}

const Map: FC<Props> = ({ alertData }) => {
  const { latitude, longitude } = alertData;

  return (
    <MapContainer center={[parseFloat(latitude), parseFloat(longitude)]} zoom={13} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[parseFloat(latitude), parseFloat(longitude)]}>
        <Popup>
          A pretty CSS3 popup. <br /> Easily customizable.
        </Popup>
      </Marker>
    </MapContainer>
  );
};

export default Map;
