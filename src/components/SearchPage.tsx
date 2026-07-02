"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { PlaceCard } from "@/components/PlaceCard";
import { SearchBar } from "@/components/SearchBar";
import { useLanguage } from "@/context/LanguageContext";
import { searchPlaces } from "@/lib/places";

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const { t } = useLanguage();
  const results = searchPlaces(query);

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="font-serif text-3xl font-semibold text-[var(--color-ink)]">
          {t.searchResultsHeading}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          {query
            ? t.searchResultsFor.replace("{query}", query)
            : t.searchResultsEmptyHint}
        </p>

        <div className="mt-6 max-w-2xl">
          <SearchBar defaultQuery={query} autoFocus />
        </div>

        {query && (
          <p className="mt-6 text-sm text-[var(--color-muted)]">
            {t.searchResultsCount.replace("{count}", String(results.length))}
          </p>
        )}

        {query && results.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((place) => (
              <PlaceCard key={place.slug} place={place} />
            ))}
          </div>
        ) : query ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 px-6 py-16 text-center text-[var(--color-muted)]">
            {t.noPlacesFiltered}
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}

export function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}
