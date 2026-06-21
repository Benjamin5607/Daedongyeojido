"use client";

import { useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import {
  getCityOptions,
  getDistrictOptions,
  getRegionLabel,
  type RegionFilterState,
} from "@/lib/regions";
import type { Place } from "@/types";

interface RegionFilterProps {
  places: Place[];
  filter: RegionFilterState;
  onFilterChange: (next: RegionFilterState) => void;
}

export function RegionFilter({
  places,
  filter,
  onFilterChange,
}: RegionFilterProps) {
  const { locale, t } = useLanguage();

  const provinceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const place of places) {
      if (place.region?.province) set.add(place.region.province);
    }
    return [...set].sort();
  }, [places]);

  const cityOptions = useMemo(
    () => getCityOptions(places, filter.province),
    [places, filter.province]
  );

  const districtOptions = useMemo(
    () => getDistrictOptions(places, filter.province, filter.city),
    [places, filter.province, filter.city]
  );

  const hasActiveFilters = Boolean(
    filter.province || filter.city || filter.district || filter.query
  );

  return (
    <section className="mt-8 rounded-2xl border border-[var(--color-border)] bg-white/80 p-5 shadow-sm backdrop-blur">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg font-semibold text-[var(--color-ink)]">
            {t.regionHeading}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {t.regionSubheading}
          </p>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() =>
              onFilterChange({
                province: undefined,
                city: undefined,
                district: undefined,
                query: "",
              })
            }
            className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            {t.clearFilters}
          </button>
        )}
      </div>

      <label className="mb-4 block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
          {t.searchPlaces}
        </span>
        <input
          type="search"
          value={filter.query}
          onChange={(event) =>
            onFilterChange({ ...filter, query: event.target.value })
          }
          placeholder={t.searchPlaceholder}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-[var(--color-muted)]">
            {t.filterProvince}
          </span>
          <select
            value={filter.province ?? ""}
            onChange={(event) => {
              const province = event.target.value || undefined;
              onFilterChange({
                ...filter,
                province,
                city: undefined,
                district: undefined,
              });
            }}
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
          >
            <option value="">{t.allProvinces}</option>
            {provinceOptions.map((code) => (
              <option key={code} value={code}>
                {getRegionLabel("provinces", code, locale)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-[var(--color-muted)]">
            {t.filterCity}
          </span>
          <select
            value={filter.city ?? ""}
            disabled={!filter.province || cityOptions.length === 0}
            onChange={(event) => {
              const city = event.target.value || undefined;
              onFilterChange({ ...filter, city, district: undefined });
            }}
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:bg-[var(--color-surface)] disabled:text-[var(--color-muted)] focus:border-[var(--color-accent)]"
          >
            <option value="">{t.allCities}</option>
            {cityOptions.map((code) => (
              <option key={code} value={code}>
                {getRegionLabel("cities", code, locale)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-[var(--color-muted)]">
            {t.filterDistrict}
          </span>
          <select
            value={filter.district ?? ""}
            disabled={!filter.province || districtOptions.length === 0}
            onChange={(event) => {
              const district = event.target.value || undefined;
              onFilterChange({ ...filter, district });
            }}
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:bg-[var(--color-surface)] disabled:text-[var(--color-muted)] focus:border-[var(--color-accent)]"
          >
            <option value="">{t.allDistricts}</option>
            {districtOptions.map((code) => (
              <option key={code} value={code}>
                {getRegionLabel("districts", code, locale)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          {filter.province && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--color-accent)]">
              {getRegionLabel("provinces", filter.province, locale)}
            </span>
          )}
          {filter.city && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--color-accent)]">
              {getRegionLabel("cities", filter.city, locale)}
            </span>
          )}
          {filter.district && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--color-accent)]">
              {getRegionLabel("districts", filter.district, locale)}
            </span>
          )}
          {filter.query && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-ink)]">
              &ldquo;{filter.query}&rdquo;
            </span>
          )}
        </div>
      )}
    </section>
  );
}
