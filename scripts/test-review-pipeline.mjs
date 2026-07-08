import { chromium } from "playwright";
import { scraper } from "google-maps-review-scraper";
import fs from "fs";
import path from "path";

const PLACES_PATH = path.join("src", "data", "crawled_places.json");

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

function buildQueries(place) {
  const en = resolveEnglishName(place);
  const address =
    typeof place.address === "string"
      ? place.address
      : place.address.en ?? "";
  const shortAddress = address.split(",").slice(-2).join(",").trim();

  return [
    `${en} ${shortAddress}`.trim(),
    `${en} Seoul Korea`,
    `${en} Korea`,
    en,
  ].filter(Boolean);
}

async function resolveGoogleUrl(page, queries) {
  for (const query of queries) {
    await page.goto(
      `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
      { waitUntil: "domcontentloaded", timeout: 30000 }
    );
    await page.waitForTimeout(3500);

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
      await page.waitForTimeout(2500);
      if (/!1s/.test(page.url())) {
        return { url: page.url(), query };
      }
    }
  }

  return null;
}

const places = JSON.parse(fs.readFileSync(PLACES_PATH, "utf8")).slice(0, 8);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  locale: "ko-KR",
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
  viewport: { width: 1280, height: 900 },
});

for (const place of places) {
  const slug = slugify(`${resolveEnglishName(place)}-${place.region?.district ?? place.region?.province ?? "korea"}`);
  const queries = buildQueries(place);
  const resolved = await resolveGoogleUrl(page, queries);
  console.log(slug, resolved?.query ?? "FAILED");
  if (resolved) {
    const reviews = await scraper({
      url: resolved.url,
      sort_type: "newest",
      pages: 1,
      clean: true,
    });
    console.log("  ->", reviews.filter((r) => r.review?.text).length, "text reviews");
  }
}

await browser.close();
