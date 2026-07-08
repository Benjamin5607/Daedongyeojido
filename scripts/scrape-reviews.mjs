import { chromium } from "playwright";
import { scraper } from "google-maps-review-scraper";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PLACES_PATH = path.join(ROOT, "src", "data", "crawled_places.json");
const REVIEWS_PATH = path.join(ROOT, "src", "data", "place_reviews.json");
const NAVER_KO_PATH = path.join(ROOT, "src", "data", "naver_search_ko.json");
const REGION_LABELS_PATH = path.join(ROOT, "src", "data", "region_labels.json");

const REVIEWS_PER_PLACE = Number(process.env.REVIEWS_PER_PLACE) || 5;
const PLACE_DELAY_MS = Number(process.env.PLACE_DELAY_MS) || 1200;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveEnglishName(place) {
  if (typeof place.name === "string") return place.name;
  return place.name.en;
}

function resolveKoreanName(place, naverKo) {
  if (typeof place.name === "object" && place.name.ko) return place.name.ko;
  const en = resolveEnglishName(place);
  return naverKo[en] ?? en;
}

function buildRegionSuffix(region, regionLabels) {
  if (!region) return "";
  const parts = [];
  const province = regionLabels.provinces[region.province]?.ko;
  if (province) parts.push(province);
  if (region.city) {
    const city = regionLabels.cities[region.city]?.ko;
    if (city) parts.push(city);
  }
  return parts.join(" ");
}

function buildSearchQueries(place, regionLabels, naverKo) {
  const en = resolveEnglishName(place);
  const ko = resolveKoreanName(place, naverKo);
  const address =
    typeof place.address === "string"
      ? place.address
      : place.address.en ?? "";
  const shortAddress = address.split(",").slice(-2).join(",").trim();
  const regionSuffix = buildRegionSuffix(place.region, regionLabels);

  const queries = [
    `${en} ${shortAddress}`.trim(),
    `${en} ${regionSuffix}`.trim(),
    `${ko} ${regionSuffix}`.trim(),
    `${en} Korea`,
    ko,
    en,
  ];

  return [...new Set(queries.filter(Boolean))];
}

function buildUniqueSlug(place, index, usedSlugs) {
  const name = resolveEnglishName(place);
  const province = place.region?.province ?? "korea";
  const district = place.region?.district ?? place.region?.city ?? "";
  const base = slugify(`${name}-${district || province}`) || `place-${index}`;

  let slug = base;
  let suffix = 2;
  while (usedSlugs.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  usedSlugs.add(slug);
  return slug;
}

function loadPlacesWithSlugs() {
  const places = JSON.parse(fs.readFileSync(PLACES_PATH, "utf8"));
  const usedSlugs = new Set();
  return places.map((place, index) => ({
    ...place,
    slug: buildUniqueSlug(place, index, usedSlugs),
  }));
}

function loadExistingReviews() {
  if (!fs.existsSync(REVIEWS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(REVIEWS_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeReviews(data) {
  fs.mkdirSync(path.dirname(REVIEWS_PATH), { recursive: true });
  fs.writeFileSync(REVIEWS_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function formatRelativeTime(publishedMs) {
  if (!publishedMs) return "";
  const date = new Date(Number(publishedMs));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
  });
}

function isValidReviewText(text) {
  if (!text || text.length < 8) return false;
  if (/^[a-z]{2}(-[A-Z][a-z]{3})?$/.test(text.trim())) return false;
  return true;
}

function mapGoogleReview(review) {
  const text = review.review?.text?.trim().replace(/<br\s*\/?>/gi, "\n");
  if (!isValidReviewText(text)) return null;

  return {
    id: review.review_id,
    author: review.author?.name ?? "Google user",
    rating: review.review?.rating ?? 0,
    text,
    relativeTime: formatRelativeTime(review.time?.published),
    source: "google",
  };
}

async function resolveGoogleMapsUrl(page, queries) {
  for (const query of queries) {
    await page.goto(
      `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
      { waitUntil: "domcontentloaded", timeout: 30000 }
    );
    await sleep(3000);

    if (/!1s/.test(page.url())) {
      return { url: page.url(), query };
    }

    const link = page.locator('a[href*="/maps/place"]').first();
    if (await link.count()) {
      const href = await link.getAttribute("href");
      if (href?.includes("!1s")) {
        const absolute = href.startsWith("http")
          ? href
          : `https://www.google.com${href}`;
        return { url: absolute, query };
      }

      await link.click({ timeout: 8000 }).catch(() => undefined);
      await sleep(2000);
      if (/!1s/.test(page.url())) {
        return { url: page.url(), query };
      }
    }
  }

  return null;
}

async function fetchGoogleReviews(googleMapsUrl) {
  const pages = Math.max(1, Math.ceil(REVIEWS_PER_PLACE / 10));
  const raw = await scraper({
    url: googleMapsUrl,
    sort_type: "newest",
    pages,
    clean: true,
  });

  const reviews = raw
    .map(mapGoogleReview)
    .filter(Boolean)
    .slice(0, REVIEWS_PER_PLACE);

  return reviews;
}

async function scrapeReviewsForPlace(page, place, regionLabels, naverKo) {
  const queries = buildSearchQueries(place, regionLabels, naverKo);
  const resolved = await resolveGoogleMapsUrl(page, queries);

  if (!resolved) {
    return {
      source: place.localGem ? "naver" : "google",
      totalCount: 0,
      reviews: [],
      fetchedAt: new Date().toISOString(),
      error: "Could not resolve Google Maps place URL",
    };
  }

  try {
    const reviews = await fetchGoogleReviews(resolved.url);
    return {
      source: "google",
      googleMapsUrl: resolved.url,
      searchQuery: resolved.query,
      totalCount: reviews.length,
      reviews,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      source: "google",
      googleMapsUrl: resolved.url,
      searchQuery: resolved.query,
      totalCount: 0,
      reviews: [],
      fetchedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function scrapeAllReviews(options = {}) {
  const { limit = Infinity, offset = 0, force = false, slugs = null } = options;

  const places = loadPlacesWithSlugs();
  const regionLabels = JSON.parse(fs.readFileSync(REGION_LABELS_PATH, "utf8"));
  const naverKo = JSON.parse(fs.readFileSync(NAVER_KO_PATH, "utf8"));
  const existing = loadExistingReviews();

  let targets = places;
  if (slugs?.length) {
    targets = places.filter((place) => slugs.includes(place.slug));
  } else {
    targets = places.slice(offset, offset + limit);
  }

  if (!force) {
    targets = targets.filter((place) => !existing[place.slug]?.reviews?.length);
  }

  console.log(
    `Fetching Google Maps reviews (no API key) for ${targets.length} places...`
  );

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    locale: "ko-KR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
  });

  let scraped = 0;

  try {
    for (const place of targets) {
      console.log(`[${scraped + 1}/${targets.length}] ${place.slug}`);
      existing[place.slug] = await scrapeReviewsForPlace(
        page,
        place,
        regionLabels,
        naverKo
      );
      scraped += 1;
      writeReviews(existing);
      await sleep(PLACE_DELAY_MS);
    }
  } finally {
    await browser.close();
  }

  console.log(`Saved ${scraped} entries to ${REVIEWS_PATH}`);
  return existing;
}

function parseArgs(argv) {
  const limitArg = argv.find((arg) => arg.startsWith("--limit="));
  const offsetArg = argv.find((arg) => arg.startsWith("--offset="));
  const slugsArg = argv.find((arg) => arg.startsWith("--slugs="));
  const force = argv.includes("--force");

  return {
    limit: limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : Infinity,
    offset: offsetArg ? Number.parseInt(offsetArg.split("=")[1], 10) : 0,
    slugs: slugsArg ? slugsArg.split("=")[1].split(",") : null,
    force,
  };
}

const isMain = process.argv[1]?.endsWith("scrape-reviews.mjs");

if (isMain) {
  scrapeAllReviews(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { scrapeAllReviews, scrapeReviewsForPlace };
