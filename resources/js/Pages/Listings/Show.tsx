import { Head, Link } from '@inertiajs/react';
import { lazy, Suspense } from 'react';
import { ChevronRight, MapPin, Maximize2, DoorOpen, Building, Banknote, Calendar, ExternalLink } from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
import Badge from '@/Components/UI/Badge';
import ImageGallery from '@/Components/Listings/ImageGallery';
import { formatPrice } from '@/utils/format';
import { ShowPageProps } from '@/types';

const LocationMap = lazy(() => import('@/Components/Listings/LocationMap'));

export default function Show({ listing }: ShowPageProps) {
    const hasCoords = listing.latitude !== null && listing.longitude !== null;

    const detailRows = [
        { label: 'Typ nieruchomości', value: listing.property_type === 'flat' ? 'Mieszkanie' : 'Dom' },
        { label: 'Rynek', value: listing.market_type === 'sale' ? 'Sprzedaż' : 'Wynajem' },
        listing.area_m2 ? { label: 'Powierzchnia', value: `${Number(listing.area_m2)} m²` } : null,
        listing.rooms ? { label: 'Pokoje', value: String(Number(listing.rooms)) } : null,
        listing.floor !== null && listing.floor !== undefined ? { label: 'Piętro', value: `${Number(listing.floor)}${listing.building_floors ? ` / ${Number(listing.building_floors)}` : ''}` } : null,
        listing.district ? { label: 'Dzielnica', value: listing.district } : null,
        listing.street ? { label: 'Ulica', value: listing.street } : null,
    ].filter(Boolean) as { label: string; value: string }[];

    const keyFacts = [
        listing.area_m2 ? { icon: Maximize2, label: 'Powierzchnia', value: `${Number(listing.area_m2)} m²` } : null,
        listing.rooms ? { icon: DoorOpen, label: 'Pokoje', value: `${Number(listing.rooms)}` } : null,
        listing.price_per_m2 ? { icon: Banknote, label: 'Cena za m²', value: `${new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(Number(listing.price_per_m2))} zł` } : null,
        { icon: Building, label: 'Typ', value: listing.property_type === 'flat' ? 'Mieszkanie' : 'Dom' },
    ].filter(Boolean) as { icon: typeof Maximize2; label: string; value: string }[];

    return (
        <AppLayout>
            <Head title={listing.title} />

            <div className="container-main py-6">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                    <Link href="/" className="hover:text-navy transition-colors">Oferty</Link>
                    <ChevronRight className="w-3.5 h-3.5" />
                    {listing.district && (
                        <>
                            <Link
                                href={`/?district=${listing.district}`}
                                className="hover:text-navy transition-colors"
                            >
                                {listing.district}
                            </Link>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </>
                    )}
                    <span className="text-gray-900 font-medium truncate max-w-xs">{listing.title}</span>
                </nav>

                {/* Gallery */}
                <ImageGallery images={listing.image_urls || []} title={listing.title} />

                {/* Content */}
                <div className="relative z-10 mt-6 flex gap-8">
                    {/* Main column */}
                    <div className="flex-1 min-w-0">
                        {/* Badges + Title */}
                        <div className="flex gap-2 mb-2">
                            <Badge variant="property">
                                {listing.property_type === 'flat' ? 'Mieszkanie' : 'Dom'}
                            </Badge>
                            <Badge variant="market">
                                {listing.market_type === 'sale' ? 'Sprzedaż' : 'Wynajem'}
                            </Badge>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            {listing.title}
                        </h1>
                        {(listing.district || listing.street) && (
                            <p className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                                <MapPin className="w-4 h-4" />
                                {[listing.street, listing.district, 'Kraków'].filter(Boolean).join(', ')}
                            </p>
                        )}

                        {/* Price */}
                        <p className="text-[28px] font-bold text-navy mb-1">
                            {formatPrice(listing.price, listing.currency)}
                        </p>
                        {listing.price_per_m2 && (
                            <p className="text-sm text-gray-500 mb-6">
                                {new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(Number(listing.price_per_m2))} zł/m²
                            </p>
                        )}

                        {/* Key Facts */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                            {keyFacts.map((fact, i) => (
                                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <fact.icon className="w-5 h-5 text-navy mb-1.5" />
                                    <p className="text-xs text-gray-500">{fact.label}</p>
                                    <p className="text-sm font-semibold text-gray-900">{fact.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Description */}
                        {listing.description && (
                            <div className="mb-8">
                                <h2 className="text-lg font-semibold text-gray-900 mb-3">Opis</h2>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                    {listing.description}
                                </p>
                            </div>
                        )}

                        {/* Location Map */}
                        {hasCoords && (
                            <div className="mb-8">
                                <h2 className="text-lg font-semibold text-gray-900 mb-3">Lokalizacja</h2>
                                <Suspense fallback={
                                    <div className="h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
                                        <div className="w-8 h-8 border-3 border-navy/20 border-t-navy rounded-full animate-spin" />
                                    </div>
                                }>
                                    <LocationMap
                                        lat={Number(listing.latitude!)}
                                        lng={Number(listing.longitude!)}
                                    />
                                </Suspense>
                            </div>
                        )}

                        {/* Details Table */}
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-gray-900 mb-3">Szczegóły</h2>
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                {detailRows.map((row, i) => (
                                    <div
                                        key={row.label}
                                        className={`flex justify-between px-4 py-3 text-sm ${
                                            i % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                                        }`}
                                    >
                                        <span className="text-gray-500">{row.label}</span>
                                        <span className="text-gray-900 font-medium">{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Provenance */}
                        <div className="border-t border-gray-200 pt-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-3">Źródło</h2>
                            <div className="space-y-2 text-sm text-gray-500">
                                {listing.source_url && (
                                    <p>
                                        Źródło:{' '}
                                        <a
                                            href={listing.source_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-navy hover:underline inline-flex items-center gap-1"
                                        >
                                            Otodom <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </p>
                                )}
                                {listing.published_at && (
                                    <p>Opublikowano: {new Date(listing.published_at).toLocaleDateString('pl-PL')}</p>
                                )}
                                <p>Zaimportowano: {new Date(listing.imported_at).toLocaleDateString('pl-PL')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="hidden lg:block w-[340px] flex-shrink-0">
                        <div className="sticky top-24 space-y-4">
                            <div className="bg-white border border-gray-200 rounded-lg p-5">
                                <p className="text-2xl font-bold text-navy mb-1">
                                    {formatPrice(listing.price, listing.currency)}
                                </p>
                                {listing.price_per_m2 && (
                                    <p className="text-sm text-gray-500 mb-5">
                                        {new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(Number(listing.price_per_m2))} zł/m²
                                    </p>
                                )}

                                {listing.source_url && (
                                    <a
                                        href={listing.source_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full h-11 bg-teal text-white text-sm font-semibold rounded-md hover:bg-teal-700 transition-colors mb-3"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Zobacz na Otodom
                                    </a>
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
