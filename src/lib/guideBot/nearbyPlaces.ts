import { getAllPlaces } from "@/lib/places";
import { getPlaceCoordinates, haversineKm } from "@/lib/placeCoords";
import { formatPlaceRegion } from "@/lib/regions";
import { resolveKoreanField, resolveLocalizedField } from "@/lib/i18n";
import type { Locale } from "@/types";
import type { NearbyPlaceContext } from "./types";

const HISTORY_PATTERN =
  /histor|dynasty|joseon|silla|goryeo|baekje|palace|temple|fortress|museum|heritage|royal|ancient|전통|역사|고궁|사찰|성|박물관|유적|문화재|조선|신라|고려|왕|궁/i;

function isHistoricalPlace(description: string, theme: string): boolean {
  if (theme === "k-culture") return true;
  if (theme === "hallyu" && HISTORY_PATTERN.test(description)) return true;
  return HISTORY_PATTERN.test(description);
}

function toNearbyContext(
  place: ReturnType<typeof getAllPlaces>[number],
  locale: Locale,
  distanceKm: number
): NearbyPlaceContext {
  return {
    slug: place.slug,
    name: resolveLocalizedField(place.name, locale),
    nameKo: resolveKoreanField(place.name),
    distanceKm: Math.round(distanceKm * 10) / 10,
    description: resolveLocalizedField(place.description, locale),
    theme: place.theme,
    regionLabel: place.region ? formatPlaceRegion(place.region, locale) : "",
  };
}

export function findNearbyHistoricalPlaces(
  lat: number,
  lng: number,
  locale: Locale,
  options: { radiusKm?: number; limit?: number } = {}
): NearbyPlaceContext[] {
  const radiusKm = options.radiusKm ?? 25;
  const limit = options.limit ?? 8;
  const user = { lat, lng };
  const results: NearbyPlaceContext[] = [];

  for (const place of getAllPlaces()) {
    const coords = getPlaceCoordinates(place.slug);
    if (!coords) continue;
    const distanceKm = haversineKm(user, coords);
    if (distanceKm > radiusKm) continue;
    const description = resolveLocalizedField(place.description, locale);
    if (!isHistoricalPlace(description, place.theme)) continue;
    results.push(toNearbyContext(place, locale, distanceKm));
  }

  return results.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit);
}

export function findNearbyHikingPlaces(
  lat: number,
  lng: number,
  locale: Locale,
  options: { radiusKm?: number; limit?: number } = {}
): NearbyPlaceContext[] {
  const radiusKm = options.radiusKm ?? 80;
  const limit = options.limit ?? 10;
  const user = { lat, lng };
  const results: NearbyPlaceContext[] = [];

  for (const place of getAllPlaces()) {
    if (place.theme !== "sanhaeng") continue;
    const coords = getPlaceCoordinates(place.slug);
    if (!coords) continue;
    const distanceKm = haversineKm(user, coords);
    if (distanceKm > radiusKm) continue;
    results.push(toNearbyContext(place, locale, distanceKm));
  }

  return results.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit);
}

/** Full sanhaeng catalog for hiking-mode grounding (no GPS required). */
export function listHikingCatalog(
  locale: Locale,
  options: { limit?: number; province?: string } = {}
): NearbyPlaceContext[] {
  const limit = options.limit ?? 24;
  const results: NearbyPlaceContext[] = [];

  for (const place of getAllPlaces()) {
    if (place.theme !== "sanhaeng") continue;
    if (options.province && place.region?.province !== options.province) continue;
    results.push(toNearbyContext(place, locale, 0));
  }

  return results.sort((a, b) => a.name.localeCompare(b.name)).slice(0, limit);
}

export function formatNearbyContext(
  places: NearbyPlaceContext[],
  mode: "history" | "hiking" = "history"
): string {
  if (places.length === 0) {
    return mode === "hiking"
      ? "No hiking trails with map coordinates found nearby."
      : "No historical places with map coordinates found within 25 km.";
  }

  return places
    .map((p, i) => {
      const dist =
        p.distanceKm > 0 ? `${p.distanceKm} km, ${p.regionLabel}` : p.regionLabel;
      return `${i + 1}. ${p.name} / ${p.nameKo} (${dist}) — ${p.description}`;
    })
    .join("\n");
}
