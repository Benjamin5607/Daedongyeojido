import regionLabels from "@/data/region_labels.json";
import { resolveLocalizedField } from "@/lib/i18n";
import type { Locale, Place, PlaceRegion, ThemeFilterId } from "@/types";

type LabelMap = Record<string, Record<Locale | "ko", string>>;

const labels = regionLabels as {
  provinces: LabelMap;
  cities: LabelMap;
  districts: LabelMap;
};

export interface RegionFilterState {
  province?: string;
  city?: string;
  district?: string;
  query: string;
}

export function getRegionLabel(
  kind: "provinces" | "cities" | "districts",
  code: string | undefined,
  locale: Locale | "ko"
): string {
  if (!code) return "";
  const entry = labels[kind][code];
  if (!entry) return code;
  return entry[locale] ?? entry.en ?? entry.ko ?? code;
}

export function formatPlaceRegion(region: PlaceRegion, locale: Locale): string {
  const parts = [
    getRegionLabel("provinces", region.province, locale),
    region.city ? getRegionLabel("cities", region.city, locale) : "",
    region.district ? getRegionLabel("districts", region.district, locale) : "",
  ].filter(Boolean);

  return parts.join(" · ");
}

export function collectRegionOptions(places: Place[]) {
  const provinces = new Set<string>();
  const citiesByProvince = new Map<string, Set<string>>();
  const districtsByScope = new Map<string, Set<string>>();

  for (const place of places) {
    if (!place.region) continue;

    const { province, city, district } = place.region;
    provinces.add(province);

    if (city) {
      const citySet = citiesByProvince.get(province) ?? new Set<string>();
      citySet.add(city);
      citiesByProvince.set(province, citySet);
    }

    if (district) {
      const scopeKey = `${province}:${city ?? ""}`;
      const districtSet = districtsByScope.get(scopeKey) ?? new Set<string>();
      districtSet.add(district);
      districtsByScope.set(scopeKey, districtSet);
    }
  }

  return {
    provinces: [...provinces].sort(),
    citiesByProvince,
    districtsByScope,
  };
}

export function getCityOptions(
  places: Place[],
  province?: string
): string[] {
  if (!province) return [];

  const cities = new Set<string>();
  for (const place of places) {
    if (place.region?.province === province && place.region.city) {
      cities.add(place.region.city);
    }
  }

  return [...cities].sort();
}

export function getDistrictOptions(
  places: Place[],
  province?: string,
  city?: string
): string[] {
  if (!province) return [];

  const districts = new Set<string>();
  for (const place of places) {
    if (!place.region || place.region.province !== province) continue;
    if ((place.region.city ?? "") !== (city ?? "")) continue;
    if (place.region.district) districts.add(place.region.district);
  }

  return [...districts].sort();
}

function placeSearchText(place: Place, locale: Locale): string {
  const name = resolveLocalizedField(place.name, locale);
  const address = resolveLocalizedField(place.address, locale);
  const description = place.description[locale] ?? place.description.en ?? "";
  const regionText = place.region ? formatPlaceRegion(place.region, locale) : "";

  const allLocales: (Locale | "ko")[] = [locale, "en", "ja", "zh", "vi", "id", "ko"];
  const regionTokens = place.region
    ? [
        place.region.province,
        place.region.city,
        place.region.district,
        ...allLocales.flatMap((loc) => [
          getRegionLabel("provinces", place.region.province, loc),
          place.region.city ? getRegionLabel("cities", place.region.city, loc) : "",
          place.region.district
            ? getRegionLabel("districts", place.region.district, loc)
            : "",
        ]),
      ]
    : [];

  return [name, address, description, regionText, ...regionTokens]
    .join(" ")
    .toLowerCase();
}

export function filterPlaces(
  places: Place[],
  activeTheme: ThemeFilterId,
  filter: RegionFilterState,
  locale: Locale
): Place[] {
  const normalizedQuery = filter.query.trim().toLowerCase();

  return places.filter((place) => {
    if (activeTheme !== "all" && place.theme !== activeTheme) return false;

    if (filter.province && place.region?.province !== filter.province) {
      return false;
    }

    if (filter.city && place.region?.city !== filter.city) {
      return false;
    }

    if (filter.district && place.region?.district !== filter.district) {
      return false;
    }

    if (normalizedQuery) {
      return placeSearchText(place, locale).includes(normalizedQuery);
    }

    return true;
  });
}
