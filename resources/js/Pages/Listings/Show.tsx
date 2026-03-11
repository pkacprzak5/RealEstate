import { lazy, Suspense } from 'react';
import { Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { ShowPageProps } from '@/types';
import ImageGallery from '@/Components/Listings/ImageGallery';

const LocationMap = lazy(() => import('@/Components/Listings/LocationMap'));

const TYPE_LABELS = { flat: 'Mieszkanie', house: 'Dom' };
const MARKET_LABELS = { sale: 'Sprzedaż', rent: 'Wynajem' };

function formatPrice(price: number | string | null, currency: string): string {
  if (price === null) return 'Cena na zapytanie';
  return new Intl.NumberFormat('pl-PL').format(Number(price)) + ' ' + currency;
}

export default function Show({ listing }: ShowPageProps) {
  const lat = listing.latitude ? Number(listing.latitude) : null;
  const lng = listing.longitude ? Number(listing.longitude) : null;
  const hasCoords = lat !== null && lng !== null;
  const area = listing.area_m2 ? Number(listing.area_m2) : null;
  const pricePerM2 = listing.price_per_m2 ? Number(listing.price_per_m2) : null;

  return (
    <AppLayout title={listing.title}>
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Wróć do wyników
        </Link>

        <ImageGallery images={listing.image_urls ?? []} title={listing.title} />

        <div className="mt-6">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
              {TYPE_LABELS[listing.property_type]}
            </span>
            <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded">
              {MARKET_LABELS[listing.market_type]}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{listing.title}</h1>
          <p className="text-2xl font-bold text-blue-600">
            {formatPrice(listing.price, listing.currency)}
          </p>
          {pricePerM2 && (
            <p className="text-sm text-gray-500 mt-1">
              {new Intl.NumberFormat('pl-PL').format(pricePerM2)} PLN/m²
            </p>
          )}
        </div>

        <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {area && (
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 text-gray-500 w-40">Powierzchnia</td>
                  <td className="px-4 py-3 text-gray-900">{area.toFixed(1).replace('.', ',')} m²</td>
                </tr>
              )}
              {listing.rooms && (
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 text-gray-500">Pokoje</td>
                  <td className="px-4 py-3 text-gray-900">{listing.rooms}</td>
                </tr>
              )}
              {listing.floor !== null && (
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 text-gray-500">Piętro</td>
                  <td className="px-4 py-3 text-gray-900">
                    {listing.floor}{listing.building_floors ? ` / ${listing.building_floors}` : ''}
                  </td>
                </tr>
              )}
              {listing.district && (
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 text-gray-500">Dzielnica</td>
                  <td className="px-4 py-3 text-gray-900">{listing.district}</td>
                </tr>
              )}
              {listing.street && (
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 text-gray-500">Ulica</td>
                  <td className="px-4 py-3 text-gray-900">{listing.street}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {listing.description && (
          <div className="mt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Opis</h2>
            <div
              className="prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: listing.description }}
            />
          </div>
        )}

        {hasCoords && (
          <div className="mt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Lokalizacja</h2>
            <Suspense fallback={<div className="h-[350px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">Ładowanie mapy...</div>}>
              <LocationMap latitude={lat!} longitude={lng!} title={listing.title} />
            </Suspense>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-500">
          <p>
            Źródło:{' '}
            <a
              href={listing.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              Otodom
            </a>
          </p>
          <p className="mt-1">
            Zaimportowano: {new Date(listing.imported_at).toLocaleDateString('pl-PL')}
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
