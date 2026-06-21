"use client";

import {
  buildGoogleMapsUrl,
  buildMapQuery,
  buildNaverMapUrlForPlace,
} from "@/lib/mapLinks";
import { resolveLocalizedField, resolveKoreanField } from "@/lib/i18n";
import { formatPlaceRegion } from "@/lib/regions";
import { useLanguage } from "@/context/LanguageContext";
import type { Place } from "@/types";

interface PlaceCardProps {
  place: Place;
}

export function PlaceCard({ place }: PlaceCardProps) {
  const { locale, t } = useLanguage();

  const nameKo = resolveKoreanField(place.name);
  const localizedName = resolveLocalizedField(place.name, locale);
  const address = resolveLocalizedField(place.address, locale);
  const description =
    place.description[locale] ?? place.description.en ?? "";
  const regionLabel = place.region
    ? formatPlaceRegion(place.region, locale)
    : "";

  const mapQuery = buildMapQuery(nameKo, address);
  const googleMapsUrl = buildGoogleMapsUrl(mapQuery);
  const naverMapUrl = buildNaverMapUrlForPlace(place);

  return (
    <article
      className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
        place.localGem
          ? "border-[#03C75A]/40 ring-1 ring-[#03C75A]/10"
          : "border-[var(--color-border)]"
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[var(--color-accent-soft)] via-[#f5efe6] to-[#e8f0ea]">
        {place.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.imageUrl}
            alt={nameKo}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--color-muted)]">
            <span aria-hidden className="text-4xl opacity-60">
              {place.localGem ? "📍" : "🏯"}
            </span>
            <span className="text-xs tracking-widest uppercase">{t.photoPlaceholder}</span>
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[var(--color-accent)] shadow-sm">
          ★ {place.rating.toFixed(1)}
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

      <div className="space-y-3 p-5">
        <div>
          <h3 className="font-serif text-lg font-semibold text-[var(--color-ink)]">
            {nameKo}
          </h3>
          {localizedName !== nameKo && (
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">{localizedName}</p>
          )}
          <p className="mt-1 text-sm text-[var(--color-muted)]">{address}</p>
          {place.localGem && (
            <p className="mt-1.5 text-xs text-[#03C75A]">{t.naverLocalHint}</p>
          )}
        </div>

        <p className="text-sm leading-relaxed text-[var(--color-ink)]/80">
          {description}
        </p>

        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          {!place.localGem && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              {t.viewOnGoogleMaps}
            </a>
          )}
          <a
            href={naverMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex flex-1 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-white transition ${
              place.localGem
                ? "bg-[#03C75A] hover:bg-[#02a84a]"
                : "bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)]"
            }`}
          >
            {t.directionsOnNaver}
          </a>
          {place.localGem && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              {t.viewOnGoogleMaps}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
