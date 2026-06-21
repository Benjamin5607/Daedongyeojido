"use client";

import {
  buildGoogleMapsUrl,
  buildMapQuery,
  buildNaverMapSearchUrl,
} from "@/lib/mapLinks";
import { resolveLocalizedField } from "@/lib/i18n";
import { useLanguage } from "@/context/LanguageContext";
import type { Place } from "@/types";

interface PlaceCardProps {
  place: Place;
}

export function PlaceCard({ place }: PlaceCardProps) {
  const { locale, t } = useLanguage();

  const name = resolveLocalizedField(place.name, locale);
  const address = resolveLocalizedField(place.address, locale);
  const description =
    place.description[locale] ?? place.description.en ?? "";

  const mapQuery = buildMapQuery(name, address);
  const googleMapsUrl = buildGoogleMapsUrl(mapQuery);
  const naverMapUrl = buildNaverMapSearchUrl(name);

  return (
    <article className="group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[var(--color-accent-soft)] via-[#f5efe6] to-[#e8f0ea]">
        {place.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.imageUrl}
            alt={name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--color-muted)]">
            <span aria-hidden className="text-4xl opacity-60">
              🏯
            </span>
            <span className="text-xs tracking-widest uppercase">Photo</span>
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[var(--color-accent)] shadow-sm">
          ★ {place.rating.toFixed(1)}
        </div>
      </div>

      <div className="space-y-3 p-5">
        <div>
          <h3 className="font-serif text-lg font-semibold text-[var(--color-ink)]">
            {name}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{address}</p>
        </div>

        <p className="text-sm leading-relaxed text-[var(--color-ink)]/80">
          {description}
        </p>

        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            {t.viewOnGoogleMaps}
          </a>
          <a
            href={naverMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-dark)]"
          >
            {t.directionsOnNaver}
          </a>
        </div>
      </div>
    </article>
  );
}
