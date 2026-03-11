import { Link } from '@inertiajs/react';
import { Listing } from '@/types';

interface ListingCardProps {
  listing: Listing;
}

function formatPrice(price: number | string | null, currency: string): string {
  if (price === null) return 'Cena na zapytanie';
  return new Intl.NumberFormat('pl-PL').format(Number(price)) + ' ' + currency;
}

function formatArea(area: number | string | null): string {
  if (area === null) return 'Brak danych';
  return Number(area).toFixed(1).replace('.', ',') + ' m²';
}

const TYPE_LABELS = { flat: 'Mieszkanie', house: 'Dom' };
const MARKET_LABELS = { sale: 'Sprzedaż', rent: 'Wynajem' };

export default function ListingCard({ listing }: ListingCardProps) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[4/3] bg-gray-200 relative">
        {listing.thumbnail_url ? (
          <img
            src={listing.thumbnail_url}
            alt={listing.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            Brak zdjęcia
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
            {TYPE_LABELS[listing.property_type]}
          </span>
          <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded">
            {MARKET_LABELS[listing.market_type]}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
          {listing.title}
        </h3>

        <p className="text-lg font-bold text-blue-600 mb-1">
          {formatPrice(listing.price, listing.currency)}
        </p>

        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{formatArea(listing.area_m2)}</span>
          {listing.rooms && <span>{listing.rooms} pok.</span>}
          {listing.district && <span>{listing.district}</span>}
        </div>

        {listing.price_per_m2 && (
          <p className="text-xs text-gray-400 mt-1">
            {new Intl.NumberFormat('pl-PL').format(Number(listing.price_per_m2))} PLN/m²
          </p>
        )}
      </div>
    </Link>
  );
}
