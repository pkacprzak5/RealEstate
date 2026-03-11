export interface Listing {
  id: number;
  external_id: string;
  source_url: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  price_per_m2: number | null;
  area_m2: number | null;
  rooms: number | null;
  floor: number | null;
  building_floors: number | null;
  property_type: 'flat' | 'house';
  market_type: 'sale' | 'rent';
  district: string | null;
  street: string | null;
  latitude: number | null;
  longitude: number | null;
  thumbnail_url: string | null;
  image_urls: string[];
  published_at: string | null;
  imported_at: string;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  links: PaginationLink[];
}

export interface PaginationLink {
  url: string | null;
  label: string;
  active: boolean;
}

export interface ListingFilters {
  property_type?: string;
  market_type?: string;
  district?: string;
  min_price?: number;
  max_price?: number;
  min_area?: number;
  max_area?: number;
  min_rooms?: number;
  max_rooms?: number;
  keywords?: string;
}

export interface AreaSuggestion {
  min: number;
  max: number;
  count: number;
  label: string;
}

export interface ParsedIntent {
  property_type?: string;
  market_type?: string;
  district?: string;
  min_price?: number;
  max_price?: number;
  min_area?: number;
  max_area?: number;
  min_rooms?: number;
  max_rooms?: number;
  keywords?: string;
}

export interface IndexPageProps {
  listings: Paginated<Listing>;
  filters: ListingFilters;
  sort: string;
  districts: string[];
  areaSuggestion: AreaSuggestion | null;
  intentParsed: ParsedIntent | null;
  query: string | null;
}

export interface ShowPageProps {
  listing: Listing;
}
