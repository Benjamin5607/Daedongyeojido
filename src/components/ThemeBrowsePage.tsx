"use client";

import Link from "next/link";
import { useState } from "react";
import { HikingGuideSection } from "@/components/HikingGuideSection";
import { PageShell } from "@/components/PageShell";
import { PlaceList } from "@/components/PlaceList";
import { RegionFilter } from "@/components/RegionFilter";
import { useLanguage } from "@/context/LanguageContext";
import { getPlacesByTheme } from "@/lib/places";
import { getThemeEditorial } from "@/lib/themeEditorials";
import { type RegionFilterState } from "@/lib/regions";
import { THEMES, type ThemeId } from "@/types";

const THEME_ICONS: Record<ThemeId, string> = {
  "k-food": "🍖",
  hallyu: "🎤",
  "k-beauty": "✨",
  "k-culture": "🏮",
  "urban-nature": "🌿",
  sanhaeng: "🥾",
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
  const { locale, t } = useLanguage();
  const [regionFilter, setRegionFilter] =
    useState<RegionFilterState>(initialRegionFilter);
  const places = getPlacesByTheme(theme);
  const editorial = getThemeEditorial(theme, locale);

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

        {editorial && (
          <section className="mb-10 overflow-hidden rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-trip-green)]/8 via-white to-[var(--color-accent-soft)]/30 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-trip-green-dark)]">
              {t.themeEditorialHeading} · {editorial.eyebrow}
            </p>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-[var(--color-ink)]">
              {editorial.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--color-ink)]/80 sm:text-base">
              {editorial.body}
            </p>
            {editorial.tips.length > 0 && (
              <ul className="mt-5 space-y-2 text-sm text-[var(--color-muted)]">
                {editorial.tips.map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-trip-green)]" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 rounded-2xl border border-[#03C75A]/20 bg-white/70 p-4">
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                {t.localGemCriteriaTitle}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-muted)] sm:text-sm">
                {t.localGemCriteriaBody}
              </p>
            </div>
          </section>
        )}

        {theme === "sanhaeng" && <HikingGuideSection />}

        <p className="mb-3 text-xs text-[var(--color-muted)]">{t.crossFilterHint}</p>
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
