const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { fetchPlacePhoto } = require("./imageFetcher");

const NAVER_KO_PATH = path.join(__dirname, "../src/data/naver_search_ko.json");
const LABELS_PATH = path.join(__dirname, "../src/data/region_labels.json");

let naverKoCache;
let regionLabelsCache;

function loadNaverKo() {
  if (!naverKoCache) {
    naverKoCache = JSON.parse(fs.readFileSync(NAVER_KO_PATH, "utf8"));
  }
  return naverKoCache;
}

function loadRegionLabels() {
  if (!regionLabelsCache) {
    regionLabelsCache = JSON.parse(fs.readFileSync(LABELS_PATH, "utf8"));
  }
  return regionLabelsCache;
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
  const regionLabels = loadRegionLabels();
  const nameKo = resolveKoName(place.name).trim();
  if (!nameKo) return "";

  const cityCode = place.region?.city;
  const cityKo = cityCode ? regionLabels.cities?.[cityCode]?.ko : "";
  if (cityKo && !nameKo.includes(cityKo.replace(/(시|군)$/, ""))) {
    return `${nameKo} ${cityKo}`;
  }

  const provinceCode = place.region?.province;
  const provinceKo = provinceCode ? regionLabels.provinces?.[provinceCode]?.ko : "";
  if (provinceKo === "서울특별시" || provinceKo === "부산광역시") {
    return `${nameKo} ${provinceKo.replace(/특별시|광역시/, "")}`;
  }

  return nameKo;
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
    .filter(({ place }) => force || !place.imageUrl)
    .slice(0, Number.isFinite(limit) ? limit : places.length);

  if (targets.length === 0) {
    console.log("All places already have photos.");
    return places;
  }

  console.log(`Fetching photos for ${targets.length} place(s)...`);

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
      const searchQuery = buildImageSearchQuery(place);
      if (!searchQuery) {
        failed += 1;
        continue;
      }

      console.log(`[photo ${i + 1}/${targets.length}] ${searchQuery}`);
      const result = await fetchPlacePhoto(page, searchQuery).catch(() => null);

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
  resolveKoName,
};
