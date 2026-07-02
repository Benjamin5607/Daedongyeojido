"use client";

import Link from "next/link";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { PlaceList } from "@/components/PlaceList";
import { RegionFilter } from "@/components/RegionFilter";
import { useLanguage } from "@/context/LanguageContext";
import { getPlacesByProvince } from "@/lib/places";
import { getRegionLabel, type RegionFilterState } from "@/lib/regions";

const initialRegionFilter = (
  province: string
): RegionFilterState => ({
  province,
  city: undefined,
  district: undefined,
  query: "",
});

interface ProvincePageProps {
  province: string;
}

export function ProvincePage({ province }: ProvincePageProps) {
  const { locale, t } = useLanguage();
  const [regionFilter, setRegionFilter] = useState<RegionFilterState>(
    initialRegionFilter(province)
  );
  const places = getPlacesByProvince(province);
  const provinceLabel = getRegionLabel("provinces", province, locale);

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <nav className="mb-6 text-sm text-[var(--color-muted)]">
          <Link href="/" className="hover:text-[var(--color-trip-green)]">
            {t.navHome}
          </Link>
          <span className="mx-2">/</span>
          <Link href="/regions" className="hover:text-[var(--color-trip-green)]">
            {t.navRegions}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--color-ink)]">{provinceLabel}</span>
        </nav>

        <h1 className="font-serif text-3xl font-semibold text-[var(--color-ink)] sm:text-4xl">
          {provinceLabel}
        </h1>
        <p className="mt-2 text-base text-[var(--color-muted)]">
          {t.provincePageSub.replace("{count}", String(places.length))}
        </p>

        <RegionFilter
          places={places}
          filter={regionFilter}
          onFilterChange={setRegionFilter}
        />

        <PlaceList
          places={places}
          activeTheme="all"
          regionFilter={regionFilter}
          heading={t.placesHeading}
          subheading={t.placesSubheading}
        />
      </div>
    </PageShell>
  );
}
