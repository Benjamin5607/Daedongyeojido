const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const {
  fetchPlacePhoto,
  fetchGooglePlacePhotoFromUrl,
  isLowQualityImageUrl,
} = require("./imageFetcher");

const NAVER_KO_PATH = path.join(__dirname, "../src/data/naver_search_ko.json");
const MAP_LINKS_PATH = path.join(__dirname, "../src/data/place_map_links.json");

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

function loadMapLinks() {
  if (!fs.existsSync(MAP_LINKS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(MAP_LINKS_PATH, "utf8"));
  } catch {
    return {};
  }
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

function buildSlugMap(places) {
  const usedSlugs = new Set();
  const slugByIndex = new Map();
  places.forEach((place, index) => {
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
    slugByIndex.set(index, slug);
  });
  return slugByIndex;
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
  /** @type {Set<string>} */
  const queries = new Set();

  const enName = typeof place.name === "object" ? place.name.en?.trim() : "";
  if (enName) queries.add(enName);
  queries.add(name);

  const strippedBranch = name
    .replace(/\s*(본점|지점|타운|스토어|플래그십)$/u, "")
    .replace(/\s+(점)$/u, "")
    .trim();
  if (strippedBranch.length >= 2) queries.add(strippedBranch);

  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    queries.add(parts[0]);
    if (parts.length >= 2) queries.add(`${parts[0]} ${parts[parts.length - 1]}`);
    if (!name.includes("점")) queries.add(`${name}점`);
    queries.add(`${parts[parts.length - 1]} ${parts[0]}`);
  }

  const cityKo = place.region?.city ? regionLabels.cities?.[place.region.city]?.ko : "";
  const districtKo = place.region?.district
    ? regionLabels.districts?.[place.region.district]?.ko
    : "";
  const provinceKo = place.region?.province
    ? regionLabels.provinces?.[place.region.province]?.ko
    : "";

  for (const base of [name, strippedBranch, enName].filter(Boolean)) {
    if (cityKo && !base.includes(cityKo.replace(/(시|군)$/, ""))) {
      queries.add(`${base} ${cityKo}`);
    }
    if (districtKo && !base.includes(districtKo.replace(/(구|군)$/, ""))) {
      queries.add(`${base} ${districtKo}`);
    }
    if (provinceKo === "서울특별시" || provinceKo === "부산광역시") {
      queries.add(`${base} ${provinceKo.replace(/특별시|광역시/, "")}`);
    }
  }

  return [...queries].filter((query) => query.length >= 2);
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

  const mapLinks = loadMapLinks();
  const slugByIndex = buildSlugMap(places);

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

      const slug = slugByIndex.get(index);
      const googlePlaceUrl = mapLinks[slug]?.googleUrl;
      if (googlePlaceUrl?.includes("/maps/place")) {
        const imageUrl = await fetchGooglePlacePhotoFromUrl(page, googlePlaceUrl).catch(
          () => null
        );
        if (imageUrl) result = { imageUrl, source: "google-place-url" };
      }

      for (const query of searchQueries) {
        if (result?.imageUrl) break;
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
        if (place.imageUrl && isLowQualityImageUrl(place.imageUrl)) {
          const { imageUrl: _removed, ...rest } = updated[index];
          updated[index] = rest;
        }
      }

      if ((i + 1) % 10 === 0) {
        fs.writeFileSync(
          path.join(__dirname, "../src/data/crawled_places.json"),
          `${JSON.stringify(updated, null, 2)}\n`,
          "utf8"
        );
        console.log(`  (checkpoint: ${attached} attached, ${failed} failed)`);
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
