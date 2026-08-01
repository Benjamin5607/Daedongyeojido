/**
 * Shared place helpers for social scripts (CommonJS mirror of src/lib/places slug logic).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");
const PLACES_PATH = path.join(ROOT, "src/data/crawled_places.json");
const REVIEWS_PATH = path.join(ROOT, "src/data/place_reviews.json");
const TRENDS_PATH = path.join(ROOT, "src/data/travel_trends.json");

const THEMES = ["k-food", "hallyu", "k-culture", "urban-nature", "k-beauty"];

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveEnglishName(place) {
  if (typeof place.name === "string") return place.name;
  return place.name?.en || place.name?.ko || "place";
}

function resolveNameKo(place) {
  if (typeof place.name === "string") return place.name;
  return place.name?.ko || place.name?.en || resolveEnglishName(place);
}

function resolveDescription(place, locale = "en") {
  const d = place.description;
  if (!d) return "";
  if (typeof d === "string") return d;
  return d[locale] || d.en || "";
}

function buildIndexedPlaces(places) {
  const used = new Set();
  return places.map((place, index) => {
    const name = resolveEnglishName(place);
    const province = place.region?.province ?? "korea";
    const district = place.region?.district ?? place.region?.city ?? "";
    const base = slugify(`${name}-${district || province}`) || `place-${index}`;
    let slug = base;
    let suffix = 2;
    while (used.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(slug);
    return { ...place, slug };
  });
}

function loadPlaces() {
  const raw = JSON.parse(fs.readFileSync(PLACES_PATH, "utf8"));
  return buildIndexedPlaces(raw);
}

function loadReviews() {
  try {
    return JSON.parse(fs.readFileSync(REVIEWS_PATH, "utf8"));
  } catch {
    return {};
  }
}

function loadTrends() {
  try {
    return JSON.parse(fs.readFileSync(TRENDS_PATH, "utf8"));
  } catch {
    return { signals: [] };
  }
}

function siteUrl() {
  return (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

function placePageUrl(slug) {
  return `${siteUrl()}/places/${slug}`;
}

function mirroredImageUrl(slug) {
  return `${siteUrl()}/api/media-proxy/${encodeURIComponent(slug)}`;
}

function reviewSnippet(reviewsBySlug, slug, maxLen = 160) {
  const entry = reviewsBySlug[slug];
  const text = entry?.reviews?.find((r) => r.text && String(r.text).trim())?.text;
  if (!text) return "";
  const cleaned = String(text).replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen - 1)}…`;
}

module.exports = {
  THEMES,
  ROOT,
  PLACES_PATH,
  REVIEWS_PATH,
  TRENDS_PATH,
  slugify,
  resolveEnglishName,
  resolveNameKo,
  resolveDescription,
  buildIndexedPlaces,
  loadPlaces,
  loadReviews,
  loadTrends,
  siteUrl,
  placePageUrl,
  mirroredImageUrl,
  reviewSnippet,
};
