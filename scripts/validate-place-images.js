const fs = require("fs");
const path = require("path");

const PLACES_PATH = path.join(__dirname, "../src/data/crawled_places.json");
const MAX_DUPLICATE_SHARE = 0.05;
const MAX_SINGLE_URL_COUNT = 10;

function validatePlaceImages(places) {
  const withUrl = places.filter((p) => p.imageUrl);
  const counts = new Map();
  for (const place of withUrl) {
    counts.set(place.imageUrl, (counts.get(place.imageUrl) || 0) + 1);
  }

  const worst = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!worst) return;

  const [url, count] = worst;
  const share = count / places.length;

  if (count > MAX_SINGLE_URL_COUNT || share > MAX_DUPLICATE_SHARE) {
    throw new Error(
      `Photo data looks corrupted: ${count}/${places.length} places share the same imageUrl (${url.slice(0, 80)}…).`
    );
  }
}

function main() {
  const places = JSON.parse(fs.readFileSync(PLACES_PATH, "utf8"));
  validatePlaceImages(places);
  const unique = new Set(places.map((p) => p.imageUrl).filter(Boolean)).size;
  const missing = places.filter((p) => !p.imageUrl).length;
  console.log(`OK: ${unique} unique photos, ${missing} without imageUrl, ${places.length} total.`);
}

if (require.main === module) {
  main();
}

module.exports = { validatePlaceImages };
