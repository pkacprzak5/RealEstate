import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { router } from '@inertiajs/react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { MapPin, Maximize2, DoorOpen, X, List } from 'lucide-react';
import Badge from '@/Components/UI/Badge';
import { MapPin as MapPinType } from '@/types';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

interface Props {
    pins: MapPinType[];
}

function formatPrice(price: number | null, currency: string): string {
    if (price === null) return 'Zapytaj o cenę';
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(price));
}

/* SVG location pin — navy fill, white stroke; inverted when active */
function createLocationIcon(isActive: boolean): L.DivIcon {
    const fill = isActive ? '#fff' : '#1E3A5F';
    const stroke = isActive ? '#1E3A5F' : '#fff';
    const scale = isActive ? 1.08 : 1;
    const shadow = isActive
        ? '0 0 0 6px rgba(30,58,95,0.25), 0 4px 12px rgba(0,0,0,0.2)'
        : '0 2px 6px rgba(0,0,0,0.3)';

    return L.divIcon({
        className: '',
        html: `<div style="transform: scale(${scale}); transition: transform 0.15s ease; filter: drop-shadow(${shadow.replace(/,\s*0/g, ') drop-shadow(0')});">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 24 30" fill="none">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 18 12 18s12-9 12-18C24 5.373 18.627 0 12 0z" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
                <circle cx="12" cy="11" r="3" fill="${stroke}"/>
            </svg>
        </div>`,
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        popupAnchor: [0, -36],
    });
}

function FitBounds({ pins }: { pins: MapPinType[] }) {
    const map = useMap();
    const hasFitted = useRef(false);
    useEffect(() => {
        if (!hasFitted.current && pins.length > 0) {
            const bounds = L.latLngBounds(
                pins.map((p) => [Number(p.latitude!), Number(p.longitude!)] as [number, number])
            );
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
            hasFitted.current = true;
        }
    }, [pins, map]);
    return null;
}

/* MarkerCluster layer — renders all pins with clustering */
function ClusteredMarkers({
    pins,
    activeId,
    onPinClick,
}: {
    pins: MapPinType[];
    activeId: number | null;
    onPinClick: (pin: MapPinType) => void;
}) {
    const map = useMap();
    const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
    const markerMapRef = useRef<Map<number, L.Marker>>(new Map());
    const prevActiveRef = useRef<number | null>(null);
    // Keep callback in a ref so the cluster effect doesn't depend on it
    const onPinClickRef = useRef(onPinClick);
    onPinClickRef.current = onPinClick;

    // Build cluster layer only when pins change (not on callback changes)
    useEffect(() => {
        if (clusterRef.current) {
            map.removeLayer(clusterRef.current);
        }

        const cluster = (L as any).markerClusterGroup({
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            animate: true,
            iconCreateFunction: (c: any) => {
                const count = c.getChildCount();
                return L.divIcon({
                    className: '',
                    html: `<div style="
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 40px;
                        height: 40px;
                        background: #1E3A5F;
                        color: #fff;
                        border: 3px solid #fff;
                        border-radius: 50%;
                        font-size: 14px;
                        font-weight: 700;
                        font-family: Inter, sans-serif;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    ">${count}</div>`,
                    iconSize: [40, 40],
                    iconAnchor: [20, 20],
                });
            },
        });

        const newMarkerMap = new Map<number, L.Marker>();

        pins.forEach((pin) => {
            const marker = L.marker(
                [Number(pin.latitude!), Number(pin.longitude!)],
                { icon: createLocationIcon(false) }
            );
            marker.on('click', () => onPinClickRef.current(pin));
            cluster.addLayer(marker);
            newMarkerMap.set(pin.id, marker);
        });

        markerMapRef.current = newMarkerMap;
        clusterRef.current = cluster;
        map.addLayer(cluster);

        return () => {
            map.removeLayer(cluster);
        };
    }, [pins, map]);

    // Update only the active/previous marker icons without rebuilding
    useEffect(() => {
        const prev = prevActiveRef.current;
        if (prev !== null) {
            const prevMarker = markerMapRef.current.get(prev);
            if (prevMarker) prevMarker.setIcon(createLocationIcon(false));
        }
        if (activeId !== null) {
            const activeMarker = markerMapRef.current.get(activeId);
            if (activeMarker) activeMarker.setIcon(createLocationIcon(true));
        }
        prevActiveRef.current = activeId;
    }, [activeId]);

    return null;
}

export default function MapView({ pins }: Props) {
    const [activeId, setActiveId] = useState<number | null>(null);
    const [panelOpen, setPanelOpen] = useState(false);
    const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const panelRef = useRef<HTMLDivElement>(null);

    const geoListings = pins.filter(
        (l) => l.latitude !== null && l.longitude !== null
    );

    const handlePinClick = useCallback((pin: MapPinType) => {
        setActiveId(pin.id);
        setPanelOpen(true);
        setTimeout(() => {
            const card = cardRefs.current[pin.id];
            if (card && panelRef.current) {
                panelRef.current.scrollTo({
                    top: card.offsetTop - (panelRef.current.offsetTop ?? 0) - 12,
                    behavior: 'smooth',
                });
            }
        }, 100);
    }, []);

    const handleCardClick = (pin: MapPinType) => {
        router.visit(`/listings/${pin.id}`);
    };

    return (
        <div className="relative h-[calc(100vh-64px-180px)] min-h-[500px] border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex h-full">
                {/* Map — full on mobile, 60% on desktop */}
                <div className="w-full lg:w-[60%] relative">
                    <MapContainer
                        center={[50.0647, 19.9450]}
                        zoom={12}
                        className="h-full w-full"
                        zoomControl={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <FitBounds pins={geoListings} />
                        <ClusteredMarkers
                            pins={geoListings}
                            activeId={activeId}
                            onPinClick={handlePinClick}
                        />
                    </MapContainer>

                    {/* Mobile: toggle panel button */}
                    <div className="lg:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
                        <button
                            type="button"
                            onClick={() => setPanelOpen(!panelOpen)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-navy text-white text-sm font-semibold rounded-lg shadow-lg"
                        >
                            <List className="w-4 h-4" />
                            {geoListings.length} ofert
                        </button>
                    </div>
                </div>

                {/* Desktop: card panel */}
                <div
                    ref={panelRef}
                    className="hidden lg:block w-[40%] overflow-y-auto bg-gray-50 border-l border-gray-200"
                >
                    <div className="p-3 space-y-2">
                        <p className="text-xs text-gray-500 px-1 mb-2 font-medium">
                            {geoListings.length} ofert na mapie
                        </p>
                        {geoListings.map((pin) => (
                            <MapCard
                                key={pin.id}
                                pin={pin}
                                isActive={activeId === pin.id}
                                onClick={() => handleCardClick(pin)}
                                ref={(el) => { cardRefs.current[pin.id] = el; }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Mobile: bottom drawer */}
            {panelOpen && (
                <div className="lg:hidden absolute inset-x-0 bottom-0 z-[1000] max-h-[60%] bg-white border-t border-gray-200 rounded-t-xl shadow-2xl flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                        <p className="text-sm font-semibold text-gray-900">
                            {geoListings.length} ofert na mapie
                        </p>
                        <button
                            type="button"
                            onClick={() => setPanelOpen(false)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="overflow-y-auto p-3 space-y-2">
                        {geoListings.map((pin) => (
                            <MapCard
                                key={pin.id}
                                pin={pin}
                                isActive={activeId === pin.id}
                                onClick={() => {
                                    handleCardClick(pin);
                                    setPanelOpen(false);
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* Card component for desktop panel + mobile drawer */
import { forwardRef } from 'react';

interface MapCardProps {
    pin: MapPinType;
    isActive: boolean;
    onClick: () => void;
}

const MapCard = forwardRef<HTMLDivElement, MapCardProps>(({ pin, isActive, onClick }, ref) => (
    <div
        ref={ref}
        onClick={onClick}
        className={`flex rounded-lg overflow-hidden cursor-pointer transition-all ${
            isActive
                ? 'bg-navy-50 ring-2 ring-navy shadow-lg border border-navy/30'
                : 'bg-white border border-gray-200 hover:shadow-sm'
        }`}
    >
        <div className="w-[120px] sm:w-[140px] min-h-[100px] bg-gray-100 flex-shrink-0 overflow-hidden relative">
            {pin.thumbnail_url ? (
                <img
                    src={pin.thumbnail_url}
                    alt={pin.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Maximize2 className="w-8 h-8" />
                </div>
            )}
        </div>
        <div className="flex-1 p-2.5 sm:p-3 min-w-0">
            <div className="flex gap-1.5 mb-1">
                <Badge variant="property">
                    {pin.property_type === 'flat' ? 'Mieszkanie' : 'Dom'}
                </Badge>
                <Badge variant="market">
                    {pin.market_type === 'sale' ? 'Sprzedaż' : 'Wynajem'}
                </Badge>
            </div>
            <h4 className="text-xs sm:text-sm font-medium text-gray-900 line-clamp-1 mb-1">
                {pin.title}
            </h4>
            <p className="text-sm font-bold text-navy mb-1">
                {formatPrice(pin.price, pin.currency)}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
                {pin.area_m2 && (
                    <span className="flex items-center gap-0.5">
                        <Maximize2 className="w-3 h-3" />
                        {Number(pin.area_m2)} m²
                    </span>
                )}
                {pin.rooms && (
                    <span className="flex items-center gap-0.5">
                        <DoorOpen className="w-3 h-3" />
                        {Number(pin.rooms)}
                    </span>
                )}
                {pin.district && (
                    <span className="hidden sm:flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />
                        {pin.district}
                    </span>
                )}
            </div>
        </div>
    </div>
));

MapCard.displayName = 'MapCard';
