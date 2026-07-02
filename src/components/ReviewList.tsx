"use client";

import { StarRating } from "@/components/StarRating";
import { useLanguage } from "@/context/LanguageContext";
import { getReviewsForPlace } from "@/lib/reviews";
import type { IndexedPlace } from "@/lib/places";

interface ReviewListProps {
  place: IndexedPlace;
}

export function ReviewList({ place }: ReviewListProps) {
  const { locale, t } = useLanguage();
  const reviews = getReviewsForPlace(place, locale);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-serif text-2xl font-semibold text-[var(--color-ink)]">
          {t.reviewsHeading}
        </h2>
        <StarRating
          rating={place.rating}
          reviewCount={place.reviewCount}
          reviewLabel={t.reviewsLabel}
        />
      </div>

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
                <p className="text-xs text-[var(--color-muted)]">
                  {review.visitMonth} · {review.tripType}
                </p>
              </div>
              <StarRating rating={review.rating} size="sm" showValue={false} />
            </div>
            <h3 className="mt-3 font-medium text-[var(--color-ink)]">
              {review.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink)]/80">
              {review.body}
            </p>
            <p className="mt-3 text-xs text-[var(--color-muted)]">
              {t.helpfulVotes.replace("{count}", String(review.helpful))}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
