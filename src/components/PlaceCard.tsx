"use client";

import Link from "next/link";
import { useState } from "react";
import {
  getPlaceMapLinks,
} from "@/lib/mapLinks";
import { getPlaceImageUrl, type IndexedPlace } from "@/lib/places";
import { resolveLocalizedField, resolveKoreanField } from "@/lib/i18n";
import { formatPlaceRegion } from "@/lib/regions";
import { StarRating } from "@/components/StarRating";
import { useLanguage } from "@/context/LanguageContext";

interface PlaceCardProps {
  place: IndexedPlace;
  compact?: boolean;
}

export function PlaceCard({ place, compact = false }: PlaceCardProps) {
  const { locale, t } = useLanguage();
  const [imageFailed, setImageFailed] = useState(false);

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
    <article
      className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
        place.localGem
          ? "border-[#03C75A]/40 ring-1 ring-[#03C75A]/10"
          : "border-[var(--color-border)]"
      }`}
    >
      <Link href={`/places/${place.slug}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[var(--color-accent-soft)] via-[#f5efe6] to-[#e8f0ea]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={nameKo}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => {
              if (place.imageUrl && !imageFailed) setImageFailed(true);
            }}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute left-3 top-3">
            <StarRating rating={place.rating} size="sm" showValue={false} />
          </div>
          <div className="absolute right-3 top-3 flex max-w-[70%] flex-col items-end gap-1">
            {place.localGem && (
              <span className="rounded-full bg-[#03C75A] px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                {t.naverLocalBadge}
              </span>
            )}
            {regionLabel && (
              <span className="rounded-full bg-[var(--color-ink)]/75 px-2.5 py-1 text-[10px] font-medium text-white shadow-sm backdrop-blur-sm">
                {regionLabel}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className={`space-y-3 ${compact ? "p-4" : "p-5"}`}>
        <div>
          <Link href={`/places/${place.slug}`} className="group/title">
            <h3 className="font-serif text-lg font-semibold text-[var(--color-ink)] transition group-hover/title:text-[var(--color-trip-green-dark)]">
              {nameKo}
            </h3>
          </Link>
          {localizedName !== nameKo && (
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">{localizedName}</p>
          )}
          <div className="mt-2">
            {place.reviewCount > 0 && (
              <StarRating
                rating={place.rating}
                size="sm"
                reviewCount={place.reviewCount}
                reviewLabel={t.reviewsLabel}
              />
            )}
          </div>
          {!compact && (
            <p className="mt-2 text-sm text-[var(--color-muted)]">{address}</p>
          )}
        </div>

        {!compact && (
          <p className="line-clamp-2 text-sm leading-relaxed text-[var(--color-ink)]/80">
            {description}
          </p>
        )}

        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <Link
            href={`/places/${place.slug}`}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-[var(--color-trip-green)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-trip-green-dark)]"
          >
            {t.viewDetails}
          </Link>
          <a
            href={naverMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-trip-green)]"
          >
            {t.directionsOnNaver}
          </a>
          {!place.localGem && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-muted)] transition hover:border-[var(--color-accent)]"
            >
              {t.viewOnGoogleMaps}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
