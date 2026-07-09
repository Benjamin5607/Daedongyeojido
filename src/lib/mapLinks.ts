import placeMapLinksData from "@/data/place_map_links.json";
import placeReviewsData from "@/data/place_reviews.json";
import { buildKoreanAddress } from "@/lib/koreanAddress";
import { resolveKoreanField, resolveLocalizedField } from "@/lib/i18n";
import type { Place, PlaceReviewEntry } from "@/types";

export interface PlaceMapLinks {
  googleUrl: string;
  naverUrl: string;
  googleDirectionsUrl: string;
  googleSource: "place" | "search";
  naverSource: "place" | "search" | "coords";
}

type MapLinkEntry = {
  googleUrl?: string;
  naverUrl?: string;
  googleSource?: "place" | "search";
  naverSource?: "place" | "search" | "coords";
};

const mapLinksBySlug = placeMapLinksData as Record<string, MapLinkEntry>;
const reviewsBySlug = placeReviewsData as Record<string, PlaceReviewEntry>;

/** Strip tracking params but keep the canonical place path. */
export function normalizeGooglePlaceUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.includes("/maps/place")) return url;
    parsed.searchParams.delete("authuser");
    parsed.searchParams.delete("hl");
    parsed.searchParams.delete("rclk");
    return parsed.toString();
  } catch {
    return url;
  }
}

export function buildGoogleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Extract latitude/longitude from a Google Maps place URL. */
export function extractGooglePlaceCoords(url: string): { lat: number; lng: number } | null {
  const match = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (!match) return null;
  return { lat: Number.parseFloat(match[1]), lng: Number.parseFloat(match[2]) };
}

export function buildNaverMapCoordUrl(lat: number, lng: number): string {
  return `https://map.naver.com/v5/search/${lat},${lng}`;
}

export function buildGoogleMapsDirectionsFromCoords(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=transit`;
}

export function buildNaverMapSearchUrl(query: string): string {
  return `https://map.naver.com/v5/search/${encodeURIComponent(query)}`;
}

export function buildNaverPcMapSearchUrl(query: string): string {
  return `https://pcmap.place.naver.com/place/list?query=${encodeURIComponent(query)}`;
}

export function buildGoogleMapsSearchQuery(place: Place): string {
  const koName = resolveKoreanField(place.name);
  const enName =
    typeof place.name === "string" ? place.name : place.name.en ?? koName;
  const koRegion = place.region ? buildKoreanAddress(place.region) : "";
  const enAddress = resolveLocalizedField(place.address, "en");

  return [koName, koRegion, enAddress || enName].filter(Boolean).join(" ").trim();
}

export function buildNaverMapSearchQuery(place: Place): string {
  const koName = resolveKoreanField(place.name);
  const koRegion = place.region ? buildKoreanAddress(place.region) : "";
  return [koName, koRegion].filter(Boolean).join(" ").trim() || koName;
}

export function getPlaceMapLinks(slug: string, place: Place): PlaceMapLinks {
  const cached = mapLinksBySlug[slug];
  const reviewEntry = reviewsBySlug[slug];

  const searchQuery = buildGoogleMapsSearchQuery(place);
  const naverQuery = buildNaverMapSearchQuery(place);

  const googleUrl =
    cached?.googleUrl ??
    (reviewEntry?.googleMapsUrl
      ? normalizeGooglePlaceUrl(reviewEntry.googleMapsUrl)
      : buildGoogleMapsSearchUrl(searchQuery));

  const googleSource: "place" | "search" =
    cached?.googleSource ??
    (googleUrl.includes("/maps/place") && googleUrl.includes("!1s")
      ? "place"
      : "search");

  const coords = extractGooglePlaceCoords(googleUrl);

  let naverUrl = cached?.naverUrl ?? buildNaverMapSearchUrl(naverQuery);
  let naverSource: "place" | "search" | "coords" =
    cached?.naverSource ??
    (naverUrl.includes("pcmap.place.naver.com")
      ? "place"
      : naverUrl.match(/\/v5\/search\/-?\d+\.\d+,-?\d+\.\d+/)
        ? "coords"
        : "search");

  if (coords && (!cached?.naverUrl || naverSource === "search")) {
    naverUrl = buildNaverMapCoordUrl(coords.lat, coords.lng);
    naverSource = "coords";
  }

  const googleDirectionsUrl = coords
    ? buildGoogleMapsDirectionsFromCoords(coords.lat, coords.lng)
    : buildGoogleMapsSearchUrl(searchQuery);

  return { googleUrl, naverUrl, googleDirectionsUrl, googleSource, naverSource };
}

/** @deprecated Use getPlaceMapLinks(slug, place).googleUrl */
export function buildGoogleMapsUrl(query: string): string {
  return buildGoogleMapsSearchUrl(query);
}

/** @deprecated Use buildGoogleMapsSearchQuery */
export function buildMapQuery(name: string, address: string): string {
  return address ? `${name}, ${address}` : name;
}

/** @deprecated Use getPlaceMapLinks(slug, place).naverUrl */
export function buildNaverMapUrlForPlace(place: Place): string {
  return buildNaverMapSearchUrl(buildNaverMapSearchQuery(place));
}

/** @deprecated Use buildNaverMapSearchQuery */
export function buildNaverMapSearchQueryLegacy(place: Place): string {
  return resolveKoreanField(place.name);
}
