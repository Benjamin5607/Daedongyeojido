"use client";

import Link from "next/link";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { PlaceList } from "@/components/PlaceList";
import { RegionFilter } from "@/components/RegionFilter";
import { useLanguage } from "@/context/LanguageContext";
import { getPlacesByTheme } from "@/lib/places";
import { type RegionFilterState } from "@/lib/regions";
import { THEMES, type ThemeId } from "@/types";

const THEME_ICONS: Record<ThemeId, string> = {
  "k-food": "🍖",
  hallyu: "🎤",
  "k-beauty": "✨",
  "k-culture": "🏮",
  "urban-nature": "🌿",
};

const initialRegionFilter: RegionFilterState = {
  province: undefined,
  city: undefined,
  district: undefined,
  query: "",
};

interface ThemeBrowsePageProps {
  theme: ThemeId;
}

export function ThemeBrowsePage({ theme }: ThemeBrowsePageProps) {
  const { t } = useLanguage();
  const [regionFilter, setRegionFilter] =
    useState<RegionFilterState>(initialRegionFilter);
  const places = getPlacesByTheme(theme);

  if (!THEMES.includes(theme)) {
    return null;
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <nav className="mb-6 text-sm text-[var(--color-muted)]">
          <Link href="/" className="hover:text-[var(--color-trip-green)]">
            {t.navHome}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--color-ink)]">{t.themes[theme]}</span>
        </nav>

        <div className="mb-8 flex items-start gap-4">
          <span className="text-4xl" aria-hidden>
            {THEME_ICONS[theme]}
          </span>
          <div>
            <h1 className="font-serif text-3xl font-semibold text-[var(--color-ink)] sm:text-4xl">
              {t.themes[theme]}
            </h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-[var(--color-muted)]">
              {t.themeDescriptions[theme]}
            </p>
          </div>
        </div>

        <RegionFilter
          places={places}
          filter={regionFilter}
          onFilterChange={setRegionFilter}
        />

        <PlaceList
          places={places}
          activeTheme={theme}
          regionFilter={regionFilter}
          heading={t.placesHeading}
          subheading={t.placesSubheading}
        />
      </div>
    </PageShell>
  );
}
