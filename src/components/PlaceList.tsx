"use client";

import { PlaceCard } from "@/components/PlaceCard";
import { useLanguage } from "@/context/LanguageContext";
import { filterPlaces, type RegionFilterState } from "@/lib/regions";
import type { IndexedPlace } from "@/lib/places";
import type { ThemeFilterId } from "@/types";

interface PlaceListProps {
  places: IndexedPlace[];
  activeTheme: ThemeFilterId;
  regionFilter: RegionFilterState;
  heading?: string;
  subheading?: string;
}

export function PlaceList({
  places,
  activeTheme,
  regionFilter,
  heading,
  subheading,
}: PlaceListProps) {
  const { locale, t } = useLanguage();

  const filtered = filterPlaces(places, activeTheme, regionFilter, locale);
  const hasActiveFilters = Boolean(
    regionFilter.province ||
      regionFilter.city ||
      regionFilter.district ||
      regionFilter.query
  );

  return (
    <section className="mt-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h3 className="font-serif text-xl font-semibold text-[var(--color-ink)]">
            {heading ?? t.placesHeading}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {subheading ?? t.placesSubheading}
          </p>
        </div>
        <span className="rounded-full bg-[var(--color-trip-green)]/10 px-3 py-1 text-xs font-medium text-[var(--color-trip-green-dark)]">
          {filtered.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 px-6 py-16 text-center text-[var(--color-muted)]">
          {hasActiveFilters ? t.noPlacesFiltered : t.noPlaces}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((place) => (
            <PlaceCard key={place.slug} place={place} />
          ))}
        </div>
      )}
    </section>
  );
}
