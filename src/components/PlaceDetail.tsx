"use client";

import Link from "next/link";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { PlaceCard } from "@/components/PlaceCard";
import { ReviewList } from "@/components/ReviewList";
import { StarRating } from "@/components/StarRating";
import {
  getPlaceMapLinks,
} from "@/lib/mapLinks";
import { getPlaceImageUrl, getRelatedPlaces, type IndexedPlace } from "@/lib/places";
import { resolveLocalizedField, resolveKoreanField } from "@/lib/i18n";
import { formatPlaceRegion } from "@/lib/regions";
import { useLanguage } from "@/context/LanguageContext";

interface PlaceDetailProps {
  place: IndexedPlace;
}

export function PlaceDetail({ place }: PlaceDetailProps) {
  const { locale, t } = useLanguage();
  const [imageFailed, setImageFailed] = useState(false);
  const related = getRelatedPlaces(place);

  const nameKo = resolveKoreanField(place.name);
  const localizedName = resolveLocalizedField(place.name, locale);
  const address = resolveLocalizedField(place.address, locale);
  const description =
    place.description[locale] ?? place.description.en ?? "";
  const regionLabel = place.region
    ? formatPlaceRegion(place.region, locale)
    : "";
  const imageUrl =
    imageFailed && place.imageUrl
      ? getPlaceImageUrl({ ...place, imageUrl: undefined })
      : getPlaceImageUrl(place);

  const { googleUrl: googleMapsUrl, naverUrl: naverMapUrl } = getPlaceMapLinks(
    place.slug,
    place
  );

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <nav className="mb-6 text-sm text-[var(--color-muted)]">
          <Link href="/" className="hover:text-[var(--color-trip-green)]">
            {t.navHome}
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/themes/${place.theme}`}
            className="hover:text-[var(--color-trip-green)]"
          >
            {t.themes[place.theme]}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--color-ink)]">{nameKo}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={nameKo}
              referrerPolicy="no-referrer"
              onError={() => {
                if (place.imageUrl && !imageFailed) setImageFailed(true);
              }}
              className="aspect-[16/10] w-full object-cover"
            />
          </div>

          <div className="space-y-5">
            <div>
              {place.localGem && (
                <span className="mb-2 inline-block rounded-full bg-[#03C75A] px-3 py-1 text-xs font-semibold text-white">
                  {t.naverLocalBadge}
                </span>
              )}
              <h1 className="font-serif text-3xl font-semibold text-[var(--color-ink)] sm:text-4xl">
                {nameKo}
              </h1>
              {localizedName !== nameKo && (
                <p className="mt-1 text-base text-[var(--color-muted)]">
                  {localizedName}
                </p>
              )}
            </div>

            <StarRating
              rating={place.rating}
              size="lg"
              reviewCount={place.reviewCount}
              reviewLabel={t.reviewsLabel}
            />

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[var(--color-trip-green)]/10 px-3 py-1 text-xs font-medium text-[var(--color-trip-green-dark)]">
                {t.themes[place.theme]}
              </span>
              {regionLabel && (
                <span className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--color-accent)]">
                  {regionLabel}
                </span>
              )}
            </div>

            <p className="text-sm text-[var(--color-muted)]">{address}</p>

            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={naverMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#03C75A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#02a84a]"
              >
                {t.directionsOnNaver}
              </a>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-trip-green)]"
              >
                {t.viewOnGoogleMaps}
              </a>
            </div>
          </div>
        </div>

        <section className="mt-12 rounded-3xl border border-[var(--color-border)] bg-white p-6 sm:p-8">
          <h2 className="font-serif text-2xl font-semibold text-[var(--color-ink)]">
            {t.aboutPlace}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--color-ink)]/85">
            {description}
          </p>
          {place.localGem && (
            <p className="mt-3 text-sm text-[#03C75A]">{t.naverLocalHint}</p>
          )}
        </section>

        <div className="mt-12">
          <ReviewList place={place} />
        </div>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-6 font-serif text-2xl font-semibold text-[var(--color-ink)]">
              {t.similarPlaces}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((relatedPlace) => (
                <PlaceCard key={relatedPlace.slug} place={relatedPlace} compact />
              ))}
            </div>
          </section>
        )}
      </div>
    </PageShell>
  );
}
