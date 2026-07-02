"use client";

import Link from "next/link";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { PlaceList } from "@/components/PlaceList";
import { RegionFilter } from "@/components/RegionFilter";
import { SearchBar } from "@/components/SearchBar";
import { PlaceCard } from "@/components/PlaceCard";
import { useLanguage } from "@/context/LanguageContext";
import {
  getAllPlaces,
  getPlatformStats,
  getTopRatedPlaces,
} from "@/lib/places";
import { collectRegionOptions, getRegionLabel, type RegionFilterState } from "@/lib/regions";
import { THEMES, type ThemeId } from "@/types";

const initialRegionFilter: RegionFilterState = {
  province: undefined,
  city: undefined,
  district: undefined,
  query: "",
};

const THEME_ICONS: Record<ThemeId, string> = {
  "k-food": "🍖",
  hallyu: "🎤",
  "k-beauty": "✨",
  "k-culture": "🏮",
  "urban-nature": "🌿",
};

const FEATURED_PROVINCES = [
  "seoul",
  "busan",
  "jeju",
  "gyeonggi",
  "gangwon",
  "gyeongbuk",
];

export function HomePage() {
  const { locale, t } = useLanguage();
  const [regionFilter, setRegionFilter] =
    useState<RegionFilterState>(initialRegionFilter);
  const places = getAllPlaces();
  const stats = getPlatformStats();
  const topRated = getTopRatedPlaces(6);
  const { provinces } = collectRegionOptions(places);

  const featuredProvinces = FEATURED_PROVINCES.filter((code) =>
    provinces.includes(code)
  );

  return (
    <PageShell>
      <section className="relative overflow-hidden border-b border-[var(--color-border)] bg-gradient-to-br from-[var(--color-trip-green)]/10 via-white to-[var(--color-accent-soft)]/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-trip-green-dark)]">
            {t.heroEyebrow}
          </p>
          <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-tight text-[var(--color-ink)] sm:text-5xl">
            {t.heroTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-muted)] sm:text-lg">
            {t.heroSubtitle}
          </p>

          <div className="mt-8 max-w-2xl">
            <SearchBar size="hero" />
          </div>

          <dl className="mt-10 grid grid-cols-3 gap-4 sm:max-w-lg">
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-center shadow-sm backdrop-blur">
              <dt className="text-xs text-[var(--color-muted)]">{t.statPlaces}</dt>
              <dd className="font-serif text-2xl font-semibold text-[var(--color-trip-green-dark)]">
                {stats.placeCount}+
              </dd>
            </div>
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-center shadow-sm backdrop-blur">
              <dt className="text-xs text-[var(--color-muted)]">{t.statRegions}</dt>
              <dd className="font-serif text-2xl font-semibold text-[var(--color-trip-green-dark)]">
                {stats.provinceCount}
              </dd>
            </div>
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-center shadow-sm backdrop-blur">
              <dt className="text-xs text-[var(--color-muted)]">{t.statReviews}</dt>
              <dd className="font-serif text-2xl font-semibold text-[var(--color-trip-green-dark)]">
                {(stats.reviewCount / 1000).toFixed(1)}k
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <section className="mb-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
                {t.travelersChoice}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {t.travelersChoiceSub}
              </p>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {topRated.map((place) => (
              <PlaceCard key={place.slug} place={place} compact />
            ))}
          </div>
        </section>

        <section className="mb-14">
          <h2 className="font-serif text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
            {t.browseCategories}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {t.browseCategoriesSub}
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {THEMES.map((theme) => (
              <Link
                key={theme}
                href={`/themes/${theme}`}
                className="group rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-trip-green)] hover:shadow-md"
              >
                <span className="text-3xl" aria-hidden>
                  {THEME_ICONS[theme]}
                </span>
                <h3 className="mt-3 font-serif text-lg font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-trip-green-dark)]">
                  {t.themes[theme]}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                  {t.themeDescriptions[theme]}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
                {t.browseRegions}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {t.browseRegionsSub}
              </p>
            </div>
            <Link
              href="/regions"
              className="text-sm font-medium text-[var(--color-trip-green-dark)] hover:underline"
            >
              {t.viewAllRegions}
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProvinces.map((province) => {
              const count = places.filter(
                (place) => place.region?.province === province
              ).length;
              return (
                <Link
                  key={province}
                  href={`/regions/${province}`}
                  className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white px-5 py-4 transition hover:border-[var(--color-trip-green)] hover:shadow-sm"
                >
                  <span className="font-medium text-[var(--color-ink)]">
                    {getRegionLabel("provinces", province, locale)}
                  </span>
                  <span className="rounded-full bg-[var(--color-trip-green)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--color-trip-green-dark)]">
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
            {t.exploreHeading}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {t.exploreAllSub}
          </p>
          <div className="mt-6">
            <RegionFilter
              places={places}
              filter={regionFilter}
              onFilterChange={setRegionFilter}
            />
          </div>
          <PlaceList
            places={places}
            activeTheme="all"
            regionFilter={regionFilter}
            heading={t.allPlacesHeading}
            subheading={t.allPlacesSubheading}
          />
        </section>
      </div>
    </PageShell>
  );
}
