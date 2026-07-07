const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { fetchPlacePhoto, isLowQualityImageUrl } = require("./imageFetcher");

const NAVER_KO_PATH = path.join(__dirname, "../src/data/naver_search_ko.json");

let naverKoCache;

function loadNaverKo() {
  if (!naverKoCache) {
    naverKoCache = JSON.parse(fs.readFileSync(NAVER_KO_PATH, "utf8"));
  }
  return naverKoCache;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string|{ ko?: string; en?: string }} name
 */
function resolveKoName(name) {
  const naverKo = loadNaverKo();
  if (typeof name === "string") return naverKo[name] ?? name;
  if (name.ko) return name.ko;
  if (name.en && naverKo[name.en]) return naverKo[name.en];
  return name.en ?? "";
}

/**
 * @param {object} place
 */
function buildImageSearchQuery(place) {
  return resolveKoName(place.name).trim();
}

/**
 * @param {object} place
 * @returns {string[]}
 */
function buildImageSearchQueries(place) {
  const name = resolveKoName(place.name).trim();
  if (!name) return [];

  const regionLabels = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../src/data/region_labels.json"), "utf8")
  );
  const queries = [name];
  const cityKo = place.region?.city ? regionLabels.cities?.[place.region.city]?.ko : "";
  if (cityKo && !name.includes(cityKo.replace(/(시|군)$/, ""))) {
    queries.push(`${name} ${cityKo}`);
  }
  const provinceKo = place.region?.province
    ? regionLabels.provinces?.[place.region.province]?.ko
    : "";
  if (provinceKo === "서울특별시" || provinceKo === "부산광역시") {
    queries.push(`${name} ${provinceKo.replace(/특별시|광역시/, "")}`);
  }
  return [...new Set(queries)];
}

/**
 * @param {object} place
 * @param {boolean} force
 */
function needsPhoto(place, force) {
  if (force) return true;
  if (!place.imageUrl) return true;
  return isLowQualityImageUrl(place.imageUrl);
}

/**
 * Fetch photos for places missing imageUrl.
 * @param {object[]} places
 * @param {{ delayMs?: number; force?: boolean }} [options]
 */
async function attachMissingImages(places, options = {}) {
  const delayMs = options.delayMs ?? 1200;
  const force = options.force ?? false;
  const limit = options.limit ?? Infinity;

  const targets = places
    .map((place, index) => ({ place, index }))
    .filter(({ place }) => needsPhoto(place, force))
    .slice(0, Number.isFinite(limit) ? limit : places.length);

  if (targets.length === 0) {
    console.log("All places already have photos.");
    return places;
  }

  console.log(`Fetching map POI photos for ${targets.length} place(s)...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    locale: "ko-KR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });

  const updated = places.map((place) => ({ ...place }));
  let attached = 0;
  let failed = 0;

  try {
    for (let i = 0; i < targets.length; i += 1) {
      const { place, index } = targets[i];
      const searchQueries = buildImageSearchQueries(place);
      if (searchQueries.length === 0) {
        failed += 1;
        continue;
      }

      console.log(`[photo ${i + 1}/${targets.length}] ${searchQueries.join(" | ")}`);
      let result = null;
      for (const query of searchQueries) {
        result = await fetchPlacePhoto(page, query).catch(() => null);
        if (result?.imageUrl) break;
      }

      if (result?.imageUrl) {
        updated[index] = { ...place, imageUrl: result.imageUrl };
        attached += 1;
        console.log(`  ✓ ${result.source}`);
      } else {
        failed += 1;
        console.warn("  ✗ no photo found");
      }

      if (i < targets.length - 1) await sleep(delayMs);
    }
  } finally {
    await browser.close();
  }

  console.log(`Photos done. attached=${attached}, failed=${failed}`);
  return updated;
}

module.exports = {
  attachMissingImages,
  buildImageSearchQuery,
  buildImageSearchQueries,
  resolveKoName,
};
