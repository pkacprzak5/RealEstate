import { Link } from '@inertiajs/react';
import { Maximize2, DoorOpen, MapPin, Star } from 'lucide-react';
import { formatPrice } from '@/utils/format';
import { AiRecommendation } from '@/types';

interface Props {
    recommendation: AiRecommendation;
}

function scoreLabel(score: number): string {
    if (score >= 0.8) return 'Świetne dopasowanie';
    if (score >= 0.6) return 'Dobre dopasowanie';
    return 'Częściowe dopasowanie';
}

function scoreColor(score: number): string {
    if (score >= 0.8) return 'bg-emerald-700';
    if (score >= 0.6) return 'bg-blue-800';
    return 'bg-gray-500';
}

export default function AiRecommendationCard({ recommendation }: Props) {
    const { listing, score, explanation } = recommendation;
    const pct = Math.round(score * 100);

    return (
        <Link
            href={`/listings/${listing.id}`}
            className="block bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all"
        >
            <div className="flex">
                {/* Thumbnail — larger */}
                <div className="w-[200px] h-[150px] shrink-0 bg-gray-100">
                    {listing.thumbnail_url ? (
                        <img
                            src={listing.thumbnail_url}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Maximize2 className="w-10 h-10" />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 p-4 min-w-0 flex flex-col justify-between">
                    <div>
                        {/* Score badge + title */}
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-white ${scoreColor(score)}`}>
                                <Star className="w-3.5 h-3.5" />
                                {pct}%
                            </span>
                            <span className="text-xs text-gray-400">{scoreLabel(score)}</span>
                        </div>
                        <h4 className="text-base font-semibold text-gray-900 line-clamp-2 mb-2">
                            {listing.title}
                        </h4>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="font-bold text-blue-800 text-base">
                            {formatPrice(listing.price, listing.currency)}
                        </span>
                        {listing.area_m2 && (
                            <span className="flex items-center gap-1">
                                <Maximize2 className="w-3.5 h-3.5" />
                                {Number(listing.area_m2)} m²
                            </span>
                        )}
                        {listing.rooms && (
                            <span className="flex items-center gap-1">
                                <DoorOpen className="w-3.5 h-3.5" />
                                {Number(listing.rooms)} pok.
                            </span>
                        )}
                        {listing.district && (
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {listing.district}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Explanation */}
            <div className="px-4 pb-3 pt-1 border-t border-gray-100">
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                    {explanation}
                </p>
            </div>
        </Link>
    );
}
