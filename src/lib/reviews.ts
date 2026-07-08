import placeReviewsData from "@/data/place_reviews.json";
import type { IndexedPlace } from "@/lib/places";
import type { Locale, PlaceReviewEntry, ScrapedReview } from "@/types";

export interface DisplayReview {
  id: string;
  author: string;
  rating: number;
  text: string;
  relativeTime: string;
  source: ScrapedReview["source"];
}

const reviewsBySlug = placeReviewsData as Record<string, PlaceReviewEntry>;

export function getReviewEntry(slug: string): PlaceReviewEntry | undefined {
  return reviewsBySlug[slug];
}

export function getReviewsForPlace(
  place: IndexedPlace,
  _locale: Locale
): DisplayReview[] {
  const entry = reviewsBySlug[place.slug];
  if (!entry?.reviews?.length) return [];

  return entry.reviews.map((review) => ({
    id: review.id,
    author: review.author,
    rating: review.rating,
    text: review.text,
    relativeTime: review.relativeTime,
    source: review.source,
  }));
}

export function getReviewCountForPlace(slug: string, fallback = 0): number {
  const entry = reviewsBySlug[slug];
  if (entry?.totalCount) return entry.totalCount;
  if (entry?.reviews?.length) return entry.reviews.length;
  return fallback;
}

export function getReviewSource(slug: string): ScrapedReview["source"] | null {
  return reviewsBySlug[slug]?.source ?? null;
}

export function hasScrapedReviews(slug: string): boolean {
  return Boolean(reviewsBySlug[slug]?.reviews?.length);
}

export function getTotalScrapedReviewCount(): number {
  return Object.values(reviewsBySlug).reduce(
    (sum, entry) => sum + (entry.totalCount || entry.reviews.length),
    0
  );
}
