const fs = require("fs");
const path = require("path");

const FILE_PATH = path.join(__dirname, "../src/data/crawled_places.json");

function cleanPlaces() {
  try {
    const raw = fs.readFileSync(FILE_PATH, "utf8");
    const places = JSON.parse(raw);
    
    // Slugs or identifiers that represent the garbage data
    const fakes = ["거제 음식점", "거제 음식"];
    
    const beforeCount = places.length;
    
    // Filter out items that match fake POIs
    const filtered = places.filter((place) => {
      const name = typeof place.name === "string" ? place.name : (place.name.ko || place.name.en || "");
      return !fakes.includes(name);
    });
    
    const afterCount = filtered.length;
    
    if (beforeCount !== afterCount) {
      fs.writeFileSync(FILE_PATH, JSON.stringify(filtered, null, 2) + "\n", "utf8");
      console.log(`[clean] Successfully removed ${beforeCount - afterCount} fake/garbage POIs ("거제 음식점", "거제 음식") from crawled_places.json!`);
    } else {
      console.log("[clean] No garbage POIs found in crawled_places.json.");
    }
  } catch (err) {
    console.error("[clean] Failed to clean places data:", err.message);
  }
}

cleanPlaces();
