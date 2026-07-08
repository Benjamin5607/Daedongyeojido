"use client";

import Link from "next/link";
import { StarRating } from "@/components/StarRating";
import { useLanguage } from "@/context/LanguageContext";
import {
  buildGoogleMapsUrl,
  buildMapQuery,
  buildNaverMapUrlForPlace,
} from "@/lib/mapLinks";
import { resolveKoreanField, resolveLocalizedField } from "@/lib/i18n";
import {
  getReviewSource,
  getReviewsForPlace,
  hasScrapedReviews,
} from "@/lib/reviews";
import type { IndexedPlace } from "@/lib/places";

interface ReviewListProps {
  place: IndexedPlace;
}

const SOURCE_LABEL_KEYS = {
  google: "reviewSourceGoogle",
  naver: "reviewSourceNaver",
} as const;

export function ReviewList({ place }: ReviewListProps) {
  const { locale, t } = useLanguage();
  const reviews = getReviewsForPlace(place, locale);
  const source = getReviewSource(place.slug) ?? (place.localGem ? "naver" : "google");
  const hasReviews = hasScrapedReviews(place.slug);

  const nameKo = resolveKoreanField(place.name);
  const address = resolveLocalizedField(place.address, locale);
  const googleUrl = buildGoogleMapsUrl(buildMapQuery(nameKo, address));
  const naverUrl = buildNaverMapUrlForPlace(place);
  const externalUrl = source === "naver" ? naverUrl : googleUrl;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[var(--color-ink)]">
            {t.reviewsHeading}
          </h2>
          {hasReviews && (
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {t.reviewSourceNote}
            </p>
          )}
        </div>
        {place.reviewCount > 0 && (
          <StarRating
            rating={place.rating}
            reviewCount={place.reviewCount}
            reviewLabel={t.reviewsLabel}
          />
        )}
      </div>

      {hasReviews ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--color-ink)]">
                    {review.author}
                  </p>
                  {review.relativeTime && (
                    <p className="text-xs text-[var(--color-muted)]">
                      {review.relativeTime}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      review.source === "naver"
                        ? "bg-[#03C75A]/10 text-[#03C75A]"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {t[SOURCE_LABEL_KEYS[review.source]]}
                  </span>
                  <StarRating
                    rating={review.rating}
                    size="sm"
                    showValue={false}
                  />
                </div>
              </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink)]/85">
              {review.text}
            </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/70 px-6 py-10 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            {t.noReviewsYet}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-xl bg-[var(--color-trip-green)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-trip-green-dark)]"
        >
          {source === "naver" ? t.viewMoreOnNaver : t.viewMoreOnGoogle}
        </a>
        <Link
          href={`/search?q=${encodeURIComponent(nameKo)}`}
          className="inline-flex items-center rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-trip-green)]"
        >
          {t.searchSimilar}
        </Link>
      </div>
    </section>
  );
}
