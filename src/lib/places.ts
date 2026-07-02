import placesData from "@/data/crawled_places.json";
import type { Place, ThemeId } from "@/types";

export interface IndexedPlace extends Place {
  slug: string;
  reviewCount: number;
}

const THEME_IMAGES: Record<ThemeId, string> = {
  "k-food":
    "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&q=80",
  hallyu:
    "https://images.unsplash.com/photo-1538485399082-712990db4820?w=800&q=80",
  "k-beauty":
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5bd15?w=800&q=80",
  "k-culture":
    "https://images.unsplash.com/photo-1583417319070-4a3b5fffe6f6?w=800&q=80",
  "urban-nature":
    "https://images.unsplash.com/photo-1587735247366-c6662a32a3a0?w=800&q=80",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveEnglishName(place: Place): string {
  if (typeof place.name === "string") return place.name;
  return place.name.en;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildReviewCount(place: Place, index: number): number {
  const seed = hashString(`${resolveEnglishName(place)}-${place.theme}-${index}`);
  const base = Math.floor(place.rating * 42) + (seed % 120);
  return Math.max(18, base);
}

function buildUniqueSlug(
  place: Place,
  index: number,
  usedSlugs: Set<string>
): string {
  const name = resolveEnglishName(place);
  const province = place.region?.province ?? "korea";
  const district = place.region?.district ?? place.region?.city ?? "";
  const base = slugify(`${name}-${district || province}`) || `place-${index}`;

  let slug = base;
  let suffix = 2;
  while (usedSlugs.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  usedSlugs.add(slug);
  return slug;
}

let cachedIndex: IndexedPlace[] | null = null;

export function getAllPlaces(): IndexedPlace[] {
  if (cachedIndex) return cachedIndex;

  const usedSlugs = new Set<string>();
  const places = placesData as Place[];

  cachedIndex = places.map((place, index) => ({
    ...place,
    slug: buildUniqueSlug(place, index, usedSlugs),
    reviewCount: buildReviewCount(place, index),
  }));

  return cachedIndex;
}

export function getPlaceBySlug(slug: string): IndexedPlace | undefined {
  return getAllPlaces().find((place) => place.slug === slug);
}

export function getTopRatedPlaces(limit = 6): IndexedPlace[] {
  return [...getAllPlaces()]
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, limit);
}

export function getPlacesByTheme(theme: ThemeId): IndexedPlace[] {
  return getAllPlaces().filter((place) => place.theme === theme);
}

export function getPlacesByProvince(province: string): IndexedPlace[] {
  return getAllPlaces().filter((place) => place.region?.province === province);
}

export function getRelatedPlaces(place: IndexedPlace, limit = 3): IndexedPlace[] {
  return getAllPlaces()
    .filter(
      (candidate) =>
        candidate.slug !== place.slug &&
        (candidate.theme === place.theme ||
          candidate.region?.province === place.region?.province)
    )
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

export function getPlaceImageUrl(place: Place): string {
  if (place.imageUrl) return place.imageUrl;
  return THEME_IMAGES[place.theme];
}

export function getPlatformStats() {
  const places = getAllPlaces();
  const provinces = new Set(
    places.map((place) => place.region?.province).filter(Boolean)
  );

  return {
    placeCount: places.length,
    provinceCount: provinces.size,
    reviewCount: places.reduce((sum, place) => sum + place.reviewCount, 0),
  };
}

export function searchPlaces(query: string, limit = 50): IndexedPlace[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return getAllPlaces()
    .filter((place) => {
      const name =
        typeof place.name === "string"
          ? place.name
          : Object.values(place.name).join(" ");
      const address =
        typeof place.address === "string"
          ? place.address
          : Object.values(place.address).join(" ");
      const description = Object.values(place.description).join(" ");
      const haystack = [name, address, description, place.theme].join(" ").toLowerCase();
      return haystack.includes(normalized);
    })
    .slice(0, limit);
}
