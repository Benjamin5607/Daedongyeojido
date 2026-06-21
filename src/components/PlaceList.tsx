"use client";

import { PlaceCard } from "@/components/PlaceCard";
import { useLanguage } from "@/context/LanguageContext";
import type { Place, ThemeId } from "@/types";

interface PlaceListProps {
  places: Place[];
  activeTheme: ThemeId;
}

export function PlaceList({ places, activeTheme }: PlaceListProps) {
  const { t } = useLanguage();

  const filtered = places.filter((place) => place.theme === activeTheme);

  return (
    <section className="mt-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h3 className="font-serif text-xl font-semibold text-[var(--color-ink)]">
            {t.placesHeading}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {t.placesSubheading}
          </p>
        </div>
        <span className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--color-accent)]">
          {filtered.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 px-6 py-16 text-center text-[var(--color-muted)]">
          {t.noPlaces}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((place) => (
            <PlaceCard
              key={`${place.theme}-${resolvePlaceKey(place)}`}
              place={place}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function resolvePlaceKey(place: Place): string {
  if (typeof place.name === "string") return place.name;
  return place.name.en;
}
