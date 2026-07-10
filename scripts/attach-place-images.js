const fs = require("fs");
const path = require("path");
const { attachMissingImages } = require("../scraper/placeImages");
const { validatePlaceImages } = require("./validate-place-images.js");

const PLACES_PATH = path.join(__dirname, "../src/data/crawled_places.json");

function parseArgs() {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const force = process.argv.includes("--force");
  const delayArg = process.argv.find((arg) => arg.startsWith("--delay="));
  return {
    limit: limitArg ? Number(limitArg.split("=")[1]) : undefined,
    force,
    delayMs: delayArg ? Number(delayArg.split("=")[1]) : 1500,
  };
}

async function main() {
  const { limit, force, delayMs } = parseArgs();
  const places = JSON.parse(fs.readFileSync(PLACES_PATH, "utf8"));
  const updated = await attachMissingImages(places, { delayMs, force, limit });
  validatePlaceImages(updated);
  fs.writeFileSync(PLACES_PATH, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
