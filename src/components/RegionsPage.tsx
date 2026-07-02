"use client";

import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { useLanguage } from "@/context/LanguageContext";
import { getAllPlaces } from "@/lib/places";
import { collectRegionOptions, getRegionLabel } from "@/lib/regions";

export function RegionsPage() {
  const { locale, t } = useLanguage();
  const places = getAllPlaces();
  const { provinces } = collectRegionOptions(places);

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="font-serif text-3xl font-semibold text-[var(--color-ink)] sm:text-4xl">
          {t.regionsPageTitle}
        </h1>
        <p className="mt-2 max-w-2xl text-base text-[var(--color-muted)]">
          {t.regionsPageSub}
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {provinces.map((province) => {
            const count = places.filter(
              (place) => place.region?.province === province
            ).length;
            return (
              <Link
                key={province}
                href={`/regions/${province}`}
                className="group rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-trip-green)] hover:shadow-md"
              >
                <h2 className="font-serif text-xl font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-trip-green-dark)]">
                  {getRegionLabel("provinces", province, locale)}
                </h2>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  {t.regionPlaceCount.replace("{count}", String(count))}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
