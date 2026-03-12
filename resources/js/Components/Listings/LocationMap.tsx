import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
    lat: number;
    lng: number;
}

const pinIcon = L.divIcon({
    className: 'location-pin',
    html: `<div style="
        width: 24px; height: 24px;
        background: #1E3A5F;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

export default function LocationMap({ lat, lng }: Props) {
    return (
        <div className="h-[300px] rounded-lg overflow-hidden border border-gray-200">
            <MapContainer
                center={[lat, lng]}
                zoom={15}
                className="h-full w-full"
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[lat, lng]} icon={pinIcon} />
            </MapContainer>
        </div>
    );
}
