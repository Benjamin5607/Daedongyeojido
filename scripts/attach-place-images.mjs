import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const { fetchPlacePhoto } = require("../scraper/imageFetcher.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLACES_PATH = path.join(__dirname, "../src/data/crawled_places.json");
const NAVER_KO_PATH = path.join(__dirname, "../src/data/naver_search_ko.json");
const LABELS_PATH = path.join(__dirname, "../src/data/region_labels.json");

const naverKo = JSON.parse(fs.readFileSync(NAVER_KO_PATH, "utf8"));
const regionLabels = JSON.parse(fs.readFileSync(LABELS_PATH, "utf8"));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs() {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const force = process.argv.includes("--force");
  const delayArg = process.argv.find((arg) => arg.startsWith("--delay="));
  return {
    limit: limitArg ? Number(limitArg.split("=")[1]) : Infinity,
    force,
    delayMs: delayArg ? Number(delayArg.split("=")[1]) : 1500,
  };
}

/**
 * @param {string|{ ko?: string; en?: string }} name
 */
function resolveKoName(name) {
  if (typeof name === "string") return naverKo[name] ?? name;
  if (name.ko) return name.ko;
  if (name.en && naverKo[name.en]) return naverKo[name.en];
  return name.en ?? "";
}

/**
 * @param {object} place
 */
function buildSearchQuery(place) {
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
 * @param {object[]} places
 */
function writePlaces(places) {
  fs.writeFileSync(PLACES_PATH, `${JSON.stringify(places, null, 2)}\n`, "utf8");
}

async function main() {
  const { limit, force, delayMs } = parseArgs();
  const places = JSON.parse(fs.readFileSync(PLACES_PATH, "utf8"));

  const targets = places
    .map((place, index) => ({ place, index }))
    .filter(({ place }) => force || !place.imageUrl)
    .slice(0, Number.isFinite(limit) ? limit : places.length);

  if (targets.length === 0) {
    console.log("All places already have imageUrl. Use --force to refresh.");
    return;
  }

  console.log(`Fetching photos for ${targets.length} places (delay ${delayMs}ms)...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    locale: "ko-KR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });

  let attached = 0;
  let failed = 0;

  try {
    for (let i = 0; i < targets.length; i += 1) {
      const { place, index } = targets[i];
      const searchQuery = buildSearchQuery(place);
      if (!searchQuery) {
        failed += 1;
        continue;
      }

      console.log(`[${i + 1}/${targets.length}] ${searchQuery}`);
      const result = await fetchPlacePhoto(page, searchQuery);

      if (result?.imageUrl) {
        places[index] = { ...place, imageUrl: result.imageUrl };
        attached += 1;
        console.log(`  ✓ ${result.source}: ${result.imageUrl.slice(0, 72)}...`);
      } else {
        failed += 1;
        console.warn("  ✗ no photo found");
      }

      if ((i + 1) % 5 === 0 || i === targets.length - 1) {
        writePlaces(places);
        console.log(`  (checkpoint: ${attached} attached, ${failed} failed)`);
      }

      if (i < targets.length - 1) await sleep(delayMs);
    }
  } finally {
    await browser.close();
  }

  writePlaces(places);
  console.log(`Done. attached=${attached}, failed=${failed}, total=${places.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
