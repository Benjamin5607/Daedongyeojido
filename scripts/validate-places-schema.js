#!/usr/bin/env node
/**
 * Schema gate for crawled_places.json — exit 1 on quality failures.
 */
const fs = require("fs");
const path = require("path");
const { validatePlaceRecord, resolveNameText } = require("../scraper/placeQuality");

const FILE_PATH = path.join(__dirname, "../src/data/crawled_places.json");

function main() {
  const places = JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
  if (!Array.isArray(places)) {
    console.error("crawled_places.json must be an array");
    process.exit(1);
  }

  /** @type {{ index: number, name: string, errors: string[] }[]} */
  const failures = [];
  for (let i = 0; i < places.length; i += 1) {
    const { ok, errors } = validatePlaceRecord(places[i]);
    if (!ok) {
      failures.push({
        index: i,
        name: resolveNameText(places[i]?.name),
        errors,
      });
    }
  }

  if (failures.length) {
    console.error(
      `[validate-places] ${failures.length}/${places.length} place(s) failed schema checks`
    );
    for (const f of failures.slice(0, 30)) {
      console.error(`  [#${f.index}] ${f.name}: ${f.errors.join("; ")}`);
    }
    if (failures.length > 30) {
      console.error(`  …and ${failures.length - 30} more`);
    }
    process.exit(1);
  }

  console.log(`[validate-places] ok — ${places.length} places`);
}

main();
