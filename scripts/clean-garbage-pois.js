const fs = require("fs");
const path = require("path");
const { isGarbagePoiName, resolveNameText } = require("../scraper/placeQuality");

const FILE_PATH = path.join(__dirname, "../src/data/crawled_places.json");

function cleanPlaces() {
  try {
    const raw = fs.readFileSync(FILE_PATH, "utf8");
    const places = JSON.parse(raw);
    const beforeCount = places.length;

    const filtered = places.filter((place) => !isGarbagePoiName(place.name));
    const afterCount = filtered.length;

    if (beforeCount !== afterCount) {
      fs.writeFileSync(FILE_PATH, JSON.stringify(filtered, null, 2) + "\n", "utf8");
      console.log(
        `[clean] Removed ${beforeCount - afterCount} garbage/fake/vague POIs from crawled_places.json`
      );
    } else {
      console.log("[clean] No garbage POIs found in crawled_places.json.");
    }
  } catch (err) {
    console.error("[clean] Failed to clean places data:", err.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  cleanPlaces();
}

module.exports = { cleanPlaces, isGarbagePoiName, resolveNameText };
