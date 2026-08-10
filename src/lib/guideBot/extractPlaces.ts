import { getAllPlaces, type IndexedPlace } from "@/lib/places";
import { resolveKoreanField } from "@/lib/i18n";

export function extractMentionedPlaces(text: string): IndexedPlace[] {
  if (!text) return [];

  const allPlaces = getAllPlaces();
  const matched: IndexedPlace[] = [];
  const textLower = text.toLowerCase();

  for (const place of allPlaces) {
    const nameKo = resolveKoreanField(place.name).toLowerCase();
    const nameEn = (typeof place.name === "string" ? place.name : place.name.en).toLowerCase();

    // Avoid matching very short terms that might occur as common words
    if (nameKo.length >= 2 && textLower.includes(nameKo)) {
      if (!matched.some((p) => p.slug === place.slug)) {
        matched.push(place);
      }
    } else if (nameEn.length >= 4 && textLower.includes(nameEn)) {
      if (!matched.some((p) => p.slug === place.slug)) {
        matched.push(place);
      }
    }
  }

  return matched;
}
