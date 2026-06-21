import type { Place } from "@/types";
import { resolveKoreanField } from "@/lib/i18n";

export function buildGoogleMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildNaverMapSearchUrl(query: string): string {
  return `https://map.naver.com/v5/search/${encodeURIComponent(query)}`;
}

export function buildMapQuery(name: string, address: string): string {
  return address ? `${name}, ${address}` : name;
}

/** Search Naver Map with Korean (Hangul) place name only — matches how locals search. */
export function buildNaverMapSearchQuery(place: Place): string {
  return resolveKoreanField(place.name);
}

export function buildNaverMapUrlForPlace(place: Place): string {
  return buildNaverMapSearchUrl(buildNaverMapSearchQuery(place));
}
