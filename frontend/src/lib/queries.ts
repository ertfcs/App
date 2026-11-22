import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export type Property = {
  name: string;
  location: string;
  rooms: number;
  bathrooms: number;
  kitchen: number;
  living_room: number;
  max_guests: number;
  description: string;
  amenities: string[];
};

export type Photo = { id: string; data_url: string; filename?: string; order?: number };

export type Availability = {
  blocked_dates: string[];
  prices: Record<string, number>;
  booking_prices: Record<string, number>;
  base_price: number;
  base_booking_price: number;
  booking_url: string;
};

export type Poi = {
  id: string;
  name: string;
  category: "art" | "beach" | "nature";
  lat: number;
  lng: number;
  description?: string;
  town?: string;
  province?: string;
  price?: string;
  hours?: string;
  duration?: string;
  discount?: string;
  notes?: string;
  ticket_url?: string;
  maps_url?: string;
  image_url?: string;
  how_to?: string;
  maps_query?: string;
  must_see?: boolean;
  to_verify?: string[];
  i18n?: Record<string, Record<string, string>>;
  i18n_src?: Record<string, string>;
};

/** Text of a field in the current language. Falls back to the Italian text when there is no translation,
 * or when the Italian text was changed after it was translated (e.g. edited in the admin). */
export function poiText(poi: Poi, field: keyof Poi & string, lang: string): string | undefined {
  const it = poi[field] as string | undefined;
  const code = (lang || "it").slice(0, 2);
  if (code === "it" || !it) return it;
  const tr = poi.i18n?.[code]?.[field];
  return tr && poi.i18n_src?.[field] === it ? tr : it;
}

export type Faq = { id: string; category: string; question: string; answer: string };

export type Itinerary = {
  id: string;
  slug?: string;
  title?: string;
  days?: number;
  summary?: string;
  description?: string;
  cover_image?: string;
};

export const useProperty = () =>
  useQuery({
    queryKey: ["property"],
    queryFn: async () => (await api.get<Property>("/property")).data,
  });

export const usePhotos = () =>
  useQuery({
    queryKey: ["photos"],
    queryFn: async () => (await api.get<Photo[]>("/photos")).data,
  });

export const useGalleryPhotos = () =>
  useQuery({
    queryKey: ["gallery-photos"],
    queryFn: async () => (await api.get<Photo[]>("/gallery-photos")).data,
  });

/** All photos for guests: the house first, then the gallery. */
export const useAllPhotos = () => {
  const house = usePhotos();
  const gallery = useGalleryPhotos();
  const data = [...(house.data ?? []), ...(gallery.data ?? [])];
  return { data, houseCount: house.data?.length ?? 0, isLoading: house.isLoading };
};

export const useAvailability = () =>
  useQuery({
    queryKey: ["availability"],
    queryFn: async () => (await api.get<Availability>("/availability")).data,
  });

export const usePois = () =>
  useQuery({
    queryKey: ["pois"],
    queryFn: async () => (await api.get<Poi[]>("/pois")).data,
  });

export const useFaqs = (lang: string) =>
  useQuery({
    queryKey: ["faqs", lang],
    queryFn: async () => (await api.get<{ faqs: Faq[] }>(`/faqs?lang=${lang}`)).data.faqs,
  });

export const useItineraries = (lang: string) =>
  useQuery({
    queryKey: ["itineraries", lang],
    queryFn: async () =>
      (await api.get<{ itineraries: Itinerary[] }>(`/itineraries?lang=${lang}`)).data.itineraries,
  });
