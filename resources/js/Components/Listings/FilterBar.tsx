import { Popover, PopoverButton, PopoverPanel, CloseButton } from '@headlessui/react';
import { ChevronDown, ChevronRight, MapPin, Banknote, Maximize2, DoorOpen } from 'lucide-react';
import { useState } from 'react';
import { ListingFilters } from '@/types';

/* Kraków administrative districts → sub-areas (matching DB values) */
interface DistrictGroup {
    name: string;
    children: string[];
}

const DISTRICT_HIERARCHY: DistrictGroup[] = [
    { name: 'Stare Miasto', children: [] },
    { name: 'Grzegórzki', children: ['Olsza'] },
    { name: 'Prądnik Czerwony', children: ['Rakowice'] },
    { name: 'Prądnik Biały', children: [] },
    { name: 'Krowodrza', children: ['Łobzów'] },
    { name: 'Bronowice', children: ['Bronowice Małe', 'Bronowice Wielkie'] },
    { name: 'Zwierzyniec', children: ['Salwator', 'Wola Justowska', 'Przegorzały'] },
    { name: 'Dębniki', children: ['Ruczaj', 'Zakrzówek', 'Tyniec', 'Piaski Wielkie'] },
    { name: 'Łagiewniki-Borek Fałęcki', children: [] },
    { name: 'Swoszowice', children: [] },
    { name: 'Podgórze Duchackie', children: [] },
    { name: 'Bieżanów-Prokocim', children: [] },
    { name: 'Podgórze', children: ['Rybitwy', 'Rajsko', 'Wróblowice'] },
    { name: 'Czyżyny', children: [] },
    { name: 'Mistrzejowice', children: [] },
    { name: 'Bieńczyce', children: [] },
    { name: 'Wzgórza Krzesławickie', children: ['Przylasek Rusiecki'] },
    { name: 'Nowa Huta', children: ['Tonie'] },
];

interface Props {
    filters: ListingFilters;
    districts: string[];
    onFilterChange: (key: keyof ListingFilters, value: string | number | undefined) => void;
    onFiltersChange: (updates: Partial<ListingFilters>) => void;
}

const PRICE_MIN = 0;
const PRICE_MAX = 3000000;
const PRICE_STEP = 25000;
const AREA_MIN = 0;
const AREA_MAX = 300;
const AREA_STEP = 5;
const ROOMS_MIN = 1;
const ROOMS_MAX = 10;

const pricePills = [
    { label: '200k', value: 200000 },
    { label: '300k', value: 300000 },
    { label: '500k', value: 500000 },
    { label: '750k', value: 750000 },
    { label: '1M', value: 1000000 },
    { label: '2M', value: 2000000 },
];

function clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
}

function formatPriceLabel(min?: number, max?: number): string {
    if (!min && !max) return 'Cena';
    const fmtK = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`;
    const parts: string[] = [];
    if (min) parts.push(`od ${fmtK(min)}`);
    if (max) parts.push(`do ${fmtK(max)}`);
    return parts.join(' ');
}

function formatAreaLabel(min?: number, max?: number): string {
    if (!min && !max) return 'Powierzchnia';
    const parts: string[] = [];
    if (min) parts.push(`od ${min}m²`);
    if (max) parts.push(`do ${max}m²`);
    return parts.join(' ');
}

function formatRoomsLabel(min?: number, max?: number): string {
    if (!min && !max) return 'Pokoje';
    if (min && max && min === max) return `${min} ${min === 1 ? 'pokój' : min < 5 ? 'pokoje' : 'pokoi'}`;
    const parts: string[] = [];
    if (min) parts.push(`od ${min}`);
    if (max) parts.push(`do ${max}`);
    return parts.join(' ') + ' pokoi';
}

function DualRangeSlider({
    min, max, step, valueMin, valueMax,
    onMinChange, onMaxChange,
    formatValue,
}: {
    min: number; max: number; step: number;
    valueMin: number; valueMax: number;
    onMinChange: (v: number) => void;
    onMaxChange: (v: number) => void;
    formatValue?: (v: number) => string;
}) {
    const pctMin = ((valueMin - min) / (max - min)) * 100;
    const pctMax = ((valueMax - min) / (max - min)) * 100;
    const fmt = formatValue || String;

    return (
        <div className="pt-2 pb-1">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{fmt(valueMin)}</span>
                <span>{fmt(valueMax)}</span>
            </div>
            <div className="relative h-5">
                <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 bg-gray-200 rounded-full" />
                <div
                    className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-navy rounded-full"
                    style={{ left: `${pctMin}%`, right: `${100 - pctMax}%` }}
                />
                <input
                    type="range"
                    min={min} max={max} step={step}
                    value={valueMin}
                    onChange={(e) => onMinChange(Math.min(Number(e.target.value), valueMax - step))}
                    className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-navy [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-navy [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:cursor-pointer"
                />
                <input
                    type="range"
                    min={min} max={max} step={step}
                    value={valueMax}
                    onChange={(e) => onMaxChange(Math.max(Number(e.target.value), valueMin + step))}
                    className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-navy [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-navy [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:cursor-pointer"
                />
            </div>
        </div>
    );
}

const applyBtnClass = "w-full mt-3 h-9 bg-navy text-white text-sm font-semibold rounded-md hover:bg-navy-700 transition-colors";

function DistrictPicker({
    districts,
    selected,
    onSelect,
}: {
    districts: string[];
    selected: string | undefined;
    onSelect: (value: string | undefined) => void;
}) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const dbSet = new Set(districts);

    // Filter hierarchy to only show groups that have at least one DB match
    const visibleGroups = DISTRICT_HIERARCHY.filter(
        (g) => dbSet.has(g.name) || g.children.some((c) => dbSet.has(c))
    );

    const toggle = (name: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(name) ? next.delete(name) : next.add(name);
            return next;
        });
    };

    const isActive = (name: string) => selected === name;

    // Sort groups alphabetically by name
    const sortedGroups = [...visibleGroups].sort((a, b) => a.name.localeCompare(b.name, 'pl'));

    return (
        <div className="max-h-72 overflow-y-auto">
            <button
                type="button"
                onClick={() => onSelect(undefined)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    !selected ? 'bg-navy-50 text-navy font-semibold' : 'text-gray-700 hover:bg-gray-50'
                }`}
            >
                Wszystkie dzielnice
            </button>
            {sortedGroups.map((group) => {
                const dbChildren = group.children.filter((c) => dbSet.has(c)).sort((a, b) => a.localeCompare(b, 'pl'));
                const hasChildren = dbChildren.length > 0;
                const isExpanded = expanded.has(group.name);
                const parentInDb = dbSet.has(group.name);

                return (
                    <div key={group.name}>
                        <button
                            type="button"
                            onClick={() => {
                                if (parentInDb) onSelect(group.name);
                                else if (hasChildren) toggle(group.name);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-1.5 text-sm rounded-md transition-colors ${
                                isActive(group.name)
                                    ? 'bg-navy-50 text-navy font-semibold'
                                    : parentInDb
                                        ? 'text-gray-800 hover:bg-gray-50'
                                        : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            <span>{group.name}</span>
                            {hasChildren && (
                                <ChevronDown
                                    onClick={(e) => { e.stopPropagation(); toggle(group.name); }}
                                    className={`w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                                />
                            )}
                        </button>
                        {hasChildren && isExpanded && (
                            <div className="ml-4 border-l border-gray-200 pl-2">
                                {dbChildren.map((child) => (
                                    <button
                                        key={child}
                                        type="button"
                                        onClick={() => onSelect(child)}
                                        className={`w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors ${
                                            isActive(child)
                                                ? 'bg-navy-50 text-navy font-semibold'
                                                : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        {child}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function FilterBar({ filters, districts, onFilterChange, onFiltersChange }: Props) {
    const [priceRange, setPriceRange] = useState<[number, number]>([
        clamp(Number(filters.min_price) || PRICE_MIN, PRICE_MIN, PRICE_MAX),
        clamp(Number(filters.max_price) || PRICE_MAX, PRICE_MIN, PRICE_MAX),
    ]);
    const [areaRange, setAreaRange] = useState<[number, number]>([
        clamp(Number(filters.min_area) || AREA_MIN, AREA_MIN, AREA_MAX),
        clamp(Number(filters.max_area) || AREA_MAX, AREA_MIN, AREA_MAX),
    ]);
    const [roomsRange, setRoomsRange] = useState<[number, number]>([
        clamp(Number(filters.min_rooms) || ROOMS_MIN, ROOMS_MIN, ROOMS_MAX),
        clamp(Number(filters.max_rooms) || ROOMS_MAX, ROOMS_MIN, ROOMS_MAX),
    ]);

    const applyPrice = () => {
        onFiltersChange({
            min_price: priceRange[0] > PRICE_MIN ? priceRange[0] : undefined,
            max_price: priceRange[1] < PRICE_MAX ? priceRange[1] : undefined,
        });
    };

    const applyArea = () => {
        onFiltersChange({
            min_area: areaRange[0] > AREA_MIN ? areaRange[0] : undefined,
            max_area: areaRange[1] < AREA_MAX ? areaRange[1] : undefined,
        });
    };

    const applyRooms = () => {
        onFiltersChange({
            min_rooms: roomsRange[0] > ROOMS_MIN ? roomsRange[0] : undefined,
            max_rooms: roomsRange[1] < ROOMS_MAX ? roomsRange[1] : undefined,
        });
    };

    const fmtPrice = (v: number) => {
        if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M zł`;
        if (v >= 1000) return `${(v / 1000).toFixed(0)}k zł`;
        return `${v} zł`;
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* District */}
            <Popover className="relative">
                <PopoverButton className="h-9 px-3 flex items-center gap-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-navy-50 focus:border-navy">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {filters.district || 'Dzielnica'}
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </PopoverButton>
                <PopoverPanel className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
                    <DistrictPicker
                        districts={districts}
                        selected={filters.district as string | undefined}
                        onSelect={(v) => onFilterChange('district', v)}
                    />
                </PopoverPanel>
            </Popover>

            {/* Price Range */}
            <Popover className="relative">
                <PopoverButton className="h-9 px-3 flex items-center gap-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-navy-50 focus:border-navy">
                    <Banknote className="w-3.5 h-3.5 text-gray-400" />
                    {formatPriceLabel(Number(filters.min_price) || undefined, Number(filters.max_price) || undefined)}
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </PopoverButton>
                <PopoverPanel className="absolute z-50 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                    <p className="text-xs font-medium text-gray-700 mb-2">Zakres ceny (zł)</p>
                    <div className="flex gap-2 mb-2">
                        <div className="flex-1">
                            <input
                                type="number"
                                min={0}
                                value={priceRange[0] || ''}
                                onChange={(e) => {
                                    const v = clamp(Number(e.target.value) || 0, 0, priceRange[1]);
                                    setPriceRange([v, priceRange[1]]);
                                }}
                                placeholder="Min"
                                className="w-full h-9 px-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-navy-50 focus:border-navy"
                            />
                        </div>
                        <span className="self-center text-gray-400">—</span>
                        <div className="flex-1">
                            <input
                                type="number"
                                min={0}
                                value={priceRange[1] === PRICE_MAX ? '' : priceRange[1]}
                                onChange={(e) => {
                                    const v = clamp(Number(e.target.value) || PRICE_MAX, priceRange[0], PRICE_MAX);
                                    setPriceRange([priceRange[0], v]);
                                }}
                                placeholder="Max"
                                className="w-full h-9 px-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-navy-50 focus:border-navy"
                            />
                        </div>
                    </div>
                    <DualRangeSlider
                        min={PRICE_MIN} max={PRICE_MAX} step={PRICE_STEP}
                        valueMin={priceRange[0]} valueMax={priceRange[1]}
                        onMinChange={(v) => setPriceRange([v, priceRange[1]])}
                        onMaxChange={(v) => setPriceRange([priceRange[0], v])}
                        formatValue={fmtPrice}
                    />
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {pricePills.map((pill) => (
                            <button
                                key={pill.value}
                                type="button"
                                onClick={() => setPriceRange([priceRange[0], pill.value])}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                    priceRange[1] === pill.value
                                        ? 'bg-navy text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                do {pill.label}
                            </button>
                        ))}
                    </div>
                    <CloseButton as="button" onClick={applyPrice} className={applyBtnClass}>
                        Zastosuj
                    </CloseButton>
                </PopoverPanel>
            </Popover>

            {/* Area Range */}
            <Popover className="relative">
                <PopoverButton className="h-9 px-3 flex items-center gap-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-navy-50 focus:border-navy">
                    <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
                    {formatAreaLabel(Number(filters.min_area) || undefined, Number(filters.max_area) || undefined)}
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </PopoverButton>
                <PopoverPanel className="absolute z-50 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                    <p className="text-xs font-medium text-gray-700 mb-2">Zakres powierzchni (m²)</p>
                    <div className="flex gap-2 mb-2">
                        <div className="flex-1">
                            <input
                                type="number"
                                min={0}
                                value={areaRange[0] || ''}
                                onChange={(e) => {
                                    const v = clamp(Number(e.target.value) || 0, 0, areaRange[1]);
                                    setAreaRange([v, areaRange[1]]);
                                }}
                                placeholder="Min"
                                className="w-full h-9 px-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-navy-50 focus:border-navy"
                            />
                        </div>
                        <span className="self-center text-gray-400">—</span>
                        <div className="flex-1">
                            <input
                                type="number"
                                min={0}
                                value={areaRange[1] === AREA_MAX ? '' : areaRange[1]}
                                onChange={(e) => {
                                    const v = clamp(Number(e.target.value) || AREA_MAX, areaRange[0], AREA_MAX);
                                    setAreaRange([areaRange[0], v]);
                                }}
                                placeholder="Max"
                                className="w-full h-9 px-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-navy-50 focus:border-navy"
                            />
                        </div>
                    </div>
                    <DualRangeSlider
                        min={AREA_MIN} max={AREA_MAX} step={AREA_STEP}
                        valueMin={areaRange[0]} valueMax={areaRange[1]}
                        onMinChange={(v) => setAreaRange([v, areaRange[1]])}
                        onMaxChange={(v) => setAreaRange([areaRange[0], v])}
                        formatValue={(v) => `${v} m²`}
                    />
                    <CloseButton as="button" onClick={applyArea} className={applyBtnClass}>
                        Zastosuj
                    </CloseButton>
                </PopoverPanel>
            </Popover>

            {/* Rooms */}
            <Popover className="relative">
                <PopoverButton className="h-9 px-3 flex items-center gap-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-navy-50 focus:border-navy">
                    <DoorOpen className="w-3.5 h-3.5 text-gray-400" />
                    {formatRoomsLabel(Number(filters.min_rooms) || undefined, Number(filters.max_rooms) || undefined)}
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </PopoverButton>
                <PopoverPanel className="absolute z-50 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                    <p className="text-xs font-medium text-gray-700 mb-2">Liczba pokoi</p>
                    <div className="flex gap-2 mb-2">
                        <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-1 block">Od</label>
                            <input
                                type="number"
                                min={1} max={roomsRange[1]}
                                value={roomsRange[0]}
                                onChange={(e) => {
                                    const v = clamp(Number(e.target.value) || 1, 1, roomsRange[1]);
                                    setRoomsRange([v, roomsRange[1]]);
                                }}
                                className="w-full h-9 px-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-navy-50 focus:border-navy"
                            />
                        </div>
                        <span className="self-center text-gray-400 mt-5">—</span>
                        <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-1 block">Do</label>
                            <input
                                type="number"
                                min={roomsRange[0]} max={10}
                                value={roomsRange[1] === ROOMS_MAX ? '' : roomsRange[1]}
                                onChange={(e) => {
                                    const v = clamp(Number(e.target.value) || ROOMS_MAX, roomsRange[0], ROOMS_MAX);
                                    setRoomsRange([roomsRange[0], v]);
                                }}
                                placeholder="Max"
                                className="w-full h-9 px-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-navy-50 focus:border-navy"
                            />
                        </div>
                    </div>
                    <DualRangeSlider
                        min={ROOMS_MIN} max={ROOMS_MAX} step={1}
                        valueMin={roomsRange[0]} valueMax={roomsRange[1]}
                        onMinChange={(v) => setRoomsRange([v, roomsRange[1]])}
                        onMaxChange={(v) => setRoomsRange([roomsRange[0], v])}
                        formatValue={(v) => `${v}`}
                    />
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {[1, 2, 3, 4, 5].map((n) => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => setRoomsRange([n, n])}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                    roomsRange[0] === n && roomsRange[1] === n
                                        ? 'bg-navy text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {n}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setRoomsRange([ROOMS_MIN, ROOMS_MAX])}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                roomsRange[0] === ROOMS_MIN && roomsRange[1] === ROOMS_MAX
                                    ? 'bg-navy text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            Wszystkie
                        </button>
                    </div>
                    <CloseButton as="button" onClick={applyRooms} className={applyBtnClass}>
                        Zastosuj
                    </CloseButton>
                </PopoverPanel>
            </Popover>

            {/* Market Type Toggle */}
            <div className="flex items-center rounded-md border border-gray-300 overflow-hidden">
                {[
                    { label: 'Sprzedaż', value: 'sale' },
                    { label: 'Wynajem', value: 'rent' },
                ].map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onFilterChange('market_type', filters.market_type === opt.value ? undefined : opt.value)}
                        className={`h-9 px-3 text-sm font-medium transition-colors border-r border-gray-300 last:border-r-0 ${
                            filters.market_type === opt.value
                                ? 'bg-navy text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
