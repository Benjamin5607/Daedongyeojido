"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { PlaceList } from "@/components/PlaceList";
import { RegionFilter } from "@/components/RegionFilter";
import { ThemeTabs } from "@/components/ThemeTabs";
import { useLanguage } from "@/context/LanguageContext";
import placesData from "@/data/crawled_places.json";
import type { RegionFilterState } from "@/lib/regions";
import type { Place, ThemeId } from "@/types";

const initialRegionFilter: RegionFilterState = {
  province: undefined,
  city: undefined,
  district: undefined,
  query: "",
};

export function HomePage() {
  const { t } = useLanguage();
  const [activeTheme, setActiveTheme] = useState<ThemeId>("k-food");
  const [regionFilter, setRegionFilter] =
    useState<RegionFilterState>(initialRegionFilter);
  const places = placesData as Place[];

  const handleThemeChange = (theme: ThemeId) => {
    setActiveTheme(theme);
    setRegionFilter(initialRegionFilter);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[var(--color-accent-soft)]/60 to-transparent"
        />

        <div className="relative mb-10 overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white/70 p-8 shadow-sm backdrop-blur sm:p-10">
          <div
            aria-hidden
            className="absolute -right-6 -top-6 h-28 w-28 rounded-full border border-[var(--color-accent)]/20"
          />
          <div
            aria-hidden
            className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-[var(--color-accent-soft)]/50 blur-2xl"
          />
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
            {t.heroEyebrow}
          </p>
          <h1 className="max-w-3xl font-serif text-3xl font-semibold leading-tight text-[var(--color-ink)] sm:text-4xl">
            {t.siteSubtitle}
          </h1>
        </div>

        <ThemeTabs activeTheme={activeTheme} onThemeChange={handleThemeChange} />
        <RegionFilter
          places={places}
          filter={regionFilter}
          onFilterChange={setRegionFilter}
        />
        <PlaceList
          places={places}
          activeTheme={activeTheme}
          regionFilter={regionFilter}
        />
      </main>

      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-6 text-center text-xs text-[var(--color-muted)]">
        {t.footer}
      </footer>
    </div>
  );
}
