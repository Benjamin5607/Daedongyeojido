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

    const name = resolveLocalizedField(place.name, locale);
    const nameKo = resolveKoreanField(place.name);
    const regionLabel = place.region
      ? formatPlaceRegion(place.region, locale)
      : "";

    results.push({
      slug: place.slug,
      name,
      nameKo,
      distanceKm: Math.round(distanceKm * 10) / 10,
      description,
      theme: place.theme,
      regionLabel,
    });
  }

  return results
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

export function formatNearbyContext(places: NearbyPlaceContext[]): string {
  if (places.length === 0) {
    return "No historical places with map coordinates found within 25 km.";
  }

  return places
    .map(
      (p, i) =>
        `${i + 1}. ${p.name} (${p.distanceKm} km, ${p.regionLabel}) — ${p.description}`
    )
    .join("\n");
}
