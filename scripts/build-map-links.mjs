import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PLACES_PATH = path.join(ROOT, "src", "data", "crawled_places.json");
const REVIEWS_PATH = path.join(ROOT, "src", "data", "place_reviews.json");
const MAP_LINKS_PATH = path.join(ROOT, "src", "data", "place_map_links.json");
const NAVER_KO_PATH = path.join(ROOT, "src", "data", "naver_search_ko.json");
const REGION_LABELS_PATH = path.join(ROOT, "src", "data", "region_labels.json");

const PLACE_DELAY_MS = Number(process.env.PLACE_DELAY_MS) || 1000;

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

function buildKoreanAddress(region, regionLabels) {
  const SEOUL_GU_KO = {
    yongsan: "용산구",
    jongno: "종로구",
    gangnam: "강남구",
    "jung-seoul": "중구",
    mapo: "마포구",
    yeongdeungpo: "영등포구",
    seodaemun: "서대문구",
  };
  const BUSAN_GU_KO = {
    haeundae: "해운대구",
    "jung-busan": "중구",
    suyeong: "수영구",
    saha: "사하구",
    geumjeong: "금정구",
    gijang: "기장군",
    yeongdo: "영도구",
    "nam-busan": "남구",
  };

  function districtKo(province, code, city) {
    if (province === "seoul") return SEOUL_GU_KO[code] ?? regionLabels.districts[code]?.ko ?? code;
    if (province === "busan") return BUSAN_GU_KO[code] ?? regionLabels.districts[code]?.ko ?? code;
    return regionLabels.districts[code]?.ko ?? code;
  }

  const parts = [];
  const provinceKo = regionLabels.provinces[region.province]?.ko;
  if (provinceKo) parts.push(provinceKo);
  if (region.city) {
    const cityKo = regionLabels.cities[region.city]?.ko;
    if (cityKo) parts.push(cityKo);
  }
  if (region.district) {
    parts.push(districtKo(region.province, region.district, region.city));
  }
  return parts.join(" ");
}

function buildGoogleSearchQueries(place, regionLabels, naverKo) {
  const en = resolveEnglishName(place);
  const ko = resolveKoreanName(place, naverKo);
  const address =
    typeof place.address === "string"
      ? place.address
      : place.address.en ?? "";
  const koRegion = place.region ? buildKoreanAddress(place.region, regionLabels) : "";

  return [
    `${ko} ${koRegion}`.trim(),
    `${ko} ${address.split(",").slice(-2).join(",").trim()}`.trim(),
    `${en} ${address}`.trim(),
    `${en} Korea`,
    ko,
    en,
  ].filter(Boolean);
}

function buildNaverSearchQuery(place, regionLabels, naverKo) {
  const ko = resolveKoreanName(place, naverKo);
  const koRegion = place.region ? buildKoreanAddress(place.region, regionLabels) : "";
  return [ko, koRegion].filter(Boolean).join(" ").trim() || ko;
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

function loadJson(path, fallback = {}) {
  if (!fs.existsSync(path)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function normalizeGooglePlaceUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("authuser");
    parsed.searchParams.delete("hl");
    parsed.searchParams.delete("rclk");
    return parsed.toString();
  } catch {
    return url;
  }
}

function extractGooglePlaceCoords(url) {
  const match = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (!match) return null;
  return { lat: Number.parseFloat(match[1]), lng: Number.parseFloat(match[2]) };
}

function buildNaverCoordUrl(lat, lng) {
  return `https://map.naver.com/v5/search/${lat},${lng}`;
}

async function resolveGoogleMapsUrl(page, queries) {
  for (const query of queries) {
    await page.goto(
      `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
      { waitUntil: "domcontentloaded", timeout: 30000 }
    );
    await sleep(2500);

    if (/!1s/.test(page.url()) && page.url().includes("/maps/place")) {
      return { url: normalizeGooglePlaceUrl(page.url()), query, source: "place" };
    }

    const link = page.locator('a[href*="/maps/place"]').first();
    if (await link.count()) {
      const href = await link.getAttribute("href");
      if (href?.includes("!1s")) {
        const absolute = href.startsWith("http")
          ? href
          : `https://www.google.com${href}`;
        return { url: normalizeGooglePlaceUrl(absolute), query, source: "place" };
      }
      await link.click({ timeout: 8000 }).catch(() => undefined);
      await sleep(2000);
      if (/!1s/.test(page.url())) {
        return { url: normalizeGooglePlaceUrl(page.url()), query, source: "place" };
      }
    }
  }
  return null;
}

async function verifyGoogleUrl(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await sleep(1500);
    const title = await page.locator("h1").first().textContent({ timeout: 5000 }).catch(() => null);
    return Boolean(title?.trim());
  } catch {
    return false;
  }
}

async function buildMapLinks(options = {}) {
  const { limit = Infinity, offset = 0, force = false } = options;

  const places = loadPlacesWithSlugs();
  const regionLabels = loadJson(REGION_LABELS_PATH);
  const naverKo = loadJson(NAVER_KO_PATH);
  const reviews = loadJson(REVIEWS_PATH);
  const existing = loadJson(MAP_LINKS_PATH);

  let targets = places.slice(offset, offset + limit);
  if (!force) {
    targets = targets.filter((place) => {
      const entry = existing[place.slug];
      return !entry?.googleUrl || entry.googleSource !== "place";
    });
  }

  console.log(`Resolving map links for ${targets.length} places...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    locale: "ko-KR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
  });

  let resolvedGoogle = 0;
  let resolvedNaverCoords = 0;
  let failed = 0;

  try {
    for (let i = 0; i < targets.length; i += 1) {
      const place = targets[i];
      const naverQuery = buildNaverSearchQuery(place, regionLabels, naverKo);
      const naverSearchUrl = `https://map.naver.com/v5/search/${encodeURIComponent(naverQuery)}`;

      let googleUrl = reviews[place.slug]?.googleMapsUrl
        ? normalizeGooglePlaceUrl(reviews[place.slug].googleMapsUrl)
        : existing[place.slug]?.googleUrl;

      let googleSource = googleUrl?.includes("/maps/place") ? "place" : "search";
      let googleQuery = existing[place.slug]?.googleQuery;

      if (!googleUrl || (force && googleSource !== "place")) {
        const queries = buildGoogleSearchQueries(place, regionLabels, naverKo);
        const resolvedGoogleResult = await resolveGoogleMapsUrl(page, queries);
        if (resolvedGoogleResult) {
          googleUrl = resolvedGoogleResult.url;
          googleSource = "place";
          googleQuery = resolvedGoogleResult.query;
        } else {
          googleUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queries[0])}`;
          googleSource = "search";
          googleQuery = queries[0];
          failed += 1;
        }
      }

      const coords = extractGooglePlaceCoords(googleUrl);
      const naverUrl = coords
        ? buildNaverCoordUrl(coords.lat, coords.lng)
        : naverSearchUrl;
      const naverSource = coords ? "coords" : "search";

      const googleVerified =
        googleSource === "place"
          ? await verifyGoogleUrl(page, googleUrl)
          : false;

      existing[place.slug] = {
        googleUrl,
        naverUrl,
        googleSource,
        naverSource,
        googleQuery,
        naverQuery,
        googleVerified,
        updatedAt: new Date().toISOString(),
      };

      if (googleSource === "place" && googleVerified) resolvedGoogle += 1;
      if (naverSource === "coords") resolvedNaverCoords += 1;

      if ((i + 1) % 10 === 0) {
        fs.writeFileSync(MAP_LINKS_PATH, `${JSON.stringify(existing, null, 2)}\n`, "utf8");
        console.log(
          `Checkpoint ${i + 1}/${targets.length} (google=${resolvedGoogle}, naverCoords=${resolvedNaverCoords}, failed=${failed})`
        );
      }

      await sleep(PLACE_DELAY_MS);
    }
  } finally {
    await browser.close();
  }

  fs.writeFileSync(MAP_LINKS_PATH, `${JSON.stringify(existing, null, 2)}\n`, "utf8");
  console.log(
    `Done. links=${Object.keys(existing).length}, googlePlace=${resolvedGoogle}, naverCoords=${resolvedNaverCoords}, searchFallback=${failed}`
  );
  return existing;
}

function parseArgs(argv) {
  const limitArg = argv.find((arg) => arg.startsWith("--limit="));
  const offsetArg = argv.find((arg) => arg.startsWith("--offset="));
  const force = argv.includes("--force");
  return {
    limit: limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : Infinity,
    offset: offsetArg ? Number.parseInt(offsetArg.split("=")[1], 10) : 0,
    force,
  };
}

if (process.argv[1]?.endsWith("build-map-links.mjs")) {
  buildMapLinks(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { buildMapLinks };
