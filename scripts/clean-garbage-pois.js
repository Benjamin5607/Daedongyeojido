const fs = require("fs");
const path = require("path");

const FILE_PATH = path.join(__dirname, "../src/data/crawled_places.json");

function cleanPlaces() {
  try {
    const raw = fs.readFileSync(FILE_PATH, "utf8");
    const places = JSON.parse(raw);
    
    // Abstract/garbage POI names to wipe
    const fakes = ["거제 음식점", "거제 음식", "검색 결과", "서울 돼지고기 맛집", "서울 전통시장", "야호", "거제시", "거제 관광", "거제 야호 맛집", "거제 야호 성지", "거제 옥포 맛집", "거제시리"];
    const FORBIDDEN_REGEX = /(관광|여행|음식|맛집|트렌드|명소|핫플|핫플레이스|지역)$/;
    
    const beforeCount = places.length;
    
    // Filter out items that match fake POIs
    const filtered = places.filter((place) => {
      const name = typeof place.name === "string" ? place.name : (place.name.ko || place.name.en || "");
      if (fakes.includes(name) || FORBIDDEN_REGEX.test(name)) {
        return false;
      }
      return true;
    });
    
    const afterCount = filtered.length;
    
    if (beforeCount !== afterCount) {
      fs.writeFileSync(FILE_PATH, JSON.stringify(filtered, null, 2) + "\n", "utf8");
      console.log(`[clean] Successfully removed ${beforeCount - afterCount} garbage/fake/vague POIs from crawled_places.json!`);
    } else {
      console.log("[clean] No garbage POIs found in crawled_places.json.");
    }
  } catch (err) {
    console.error("[clean] Failed to clean places data:", err.message);
  }
}

cleanPlaces();
