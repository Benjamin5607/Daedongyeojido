import type { Place } from "@/types";
import { resolveKoreanField } from "@/lib/i18n";
import { buildKoreanAddress } from "@/lib/koreanAddress";

export function buildGoogleMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildNaverMapSearchUrl(query: string): string {
  return `https://map.naver.com/v5/search/${encodeURIComponent(query)}`;
}

export function buildMapQuery(name: string, address: string): string {
  return address ? `${name}, ${address}` : name;
}

/** Always search Naver Map with Korean (Hangul) place name + address. */
export function buildNaverMapSearchQuery(place: Place): string {
  const nameKo = resolveKoreanField(place.name);
  const addressKo = buildKoreanAddress(place.region);
  return [nameKo, addressKo].filter(Boolean).join(" ").trim();
}

export function buildNaverMapUrlForPlace(place: Place): string {
  return buildNaverMapSearchUrl(buildNaverMapSearchQuery(place));
}
