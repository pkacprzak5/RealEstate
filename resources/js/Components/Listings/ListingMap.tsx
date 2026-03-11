import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Listing } from '@/types';
import { Link } from '@inertiajs/react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = defaultIcon;

interface ListingMapProps {
  listings: Listing[];
}

const KRAKOW_CENTER: [number, number] = [50.0647, 19.9450];

function formatPrice(price: number | string | null, currency: string): string {
  if (price === null) return 'Cena na zapytanie';
  return new Intl.NumberFormat('pl-PL').format(Number(price)) + ' ' + currency;
}

export default function ListingMap({ listings }: ListingMapProps) {
  const markersData = listings.filter(l => l.latitude && l.longitude);

  return (
    <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200">
      <MapContainer
        center={KRAKOW_CENTER}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markersData.map(listing => (
          <Marker
            key={listing.id}
            position={[Number(listing.latitude), Number(listing.longitude)]}
          >
            <Popup>
              <div className="w-48">
                <Link href={`/listings/${listing.id}`} className="block">
                  <p className="font-medium text-sm text-gray-900 line-clamp-2">{listing.title}</p>
                  <p className="text-blue-600 font-bold text-sm mt-1">
                    {formatPrice(listing.price, listing.currency)}
                  </p>
                  {listing.area_m2 && (
                    <p className="text-xs text-gray-500">{listing.area_m2} m² {listing.rooms && `• ${listing.rooms} pok.`}</p>
                  )}
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
