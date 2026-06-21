import { repairRegionLabels } from "./repair-region-labels.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const places = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/data/crawled_places.json"), "utf8")
);
repairRegionLabels(places);
console.log("Repaired region_labels.json");
