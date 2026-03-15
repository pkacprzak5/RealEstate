import { Link } from '@inertiajs/react';
import { MapPin, Maximize2, DoorOpen } from 'lucide-react';
import Badge from '@/Components/UI/Badge';
import { formatPrice, pluralizePl } from '@/utils/format';
import { Listing } from '@/types';

interface Props {
    listing: Listing;
}

export default function ListingCard({ listing }: Props) {
    return (
        <div className="group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all">
            {/* Image */}
            <Link href={`/listings/${listing.id}`} className="block">
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <div className="absolute inset-0 bg-gray-100">
                        {listing.thumbnail_url ? (
                            <img
                                src={listing.thumbnail_url}
                                alt={listing.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <Maximize2 className="w-12 h-12" />
                            </div>
                        )}
                    </div>
                    <div className="absolute top-2.5 left-2.5 flex gap-1.5 z-10">
                        <Badge variant="property">
                            {listing.property_type === 'flat' ? 'Mieszkanie' : 'Dom'}
                        </Badge>
                        <Badge variant="market">
                            {listing.market_type === 'sale' ? 'Sprzedaż' : 'Wynajem'}
                        </Badge>
                    </div>
                </div>
            </Link>

            {/* Body */}
            <Link href={`/listings/${listing.id}`} className="block p-4">
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-navy transition-colors">
                    {listing.title}
                </h3>
                <p className="text-lg font-bold text-navy mb-2">
                    {formatPrice(listing.price, listing.currency)}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                    {listing.area_m2 && (
                        <span className="flex items-center gap-1">
                            <Maximize2 className="w-3.5 h-3.5" />
                            {Number(listing.area_m2)} m²
                        </span>
                    )}
                    {listing.rooms && (
                        <span className="flex items-center gap-1">
                            <DoorOpen className="w-3.5 h-3.5" />
                            {Number(listing.rooms)} {pluralizePl(Number(listing.rooms), 'pokój', 'pokoje', 'pokoi')}
                        </span>
                    )}
                    {listing.district && (
                        <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {listing.district}
                        </span>
                    )}
                </div>
                {listing.price_per_m2 && (
                    <p className="mt-2 text-xs text-gray-400">
                        {new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(Number(listing.price_per_m2))} zł/m²
                    </p>
                )}
            </Link>
        </div>
    );
}
