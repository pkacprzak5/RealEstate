import ListingCard from './ListingCard';
import { Listing } from '@/types';

interface Props {
    listings: Listing[];
}

export default function ListingGrid({ listings }: Props) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
            ))}
        </div>
    );
}
