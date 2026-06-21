const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { crawlGoogleMaps, mergeAndCleanExisting } = require("./crawler");

const OUTPUT_PATH = path.join(__dirname, "..", "src", "data", "crawled_places.json");
const BATCH_SIZE = 8;

const SYSTEM_PROMPT = `You are a Korean travel data curator.
Analyze the crawled Korean place data and return ONLY a valid JSON array.
Each item must follow this exact shape:
{
  "theme": "k-food|hallyu|k-beauty|k-culture|urban-nature",
  "region": {
    "province": "seoul|busan|jeju|gyeonggi|gangwon|gyeongbuk|jeonbuk|...",
    "city": "optional city code e.g. suwon, jeonju, andong",
    "district": "optional district code e.g. yongsan, jongno, haeundae"
  },
  "name": "Korean place name",
  "address": "Korean address",
  "rating": 4.5,
  "description": {
    "en": "...",
    "ja": "...",
    "zh": "...",
    "vi": "...",
    "id": "..."
  }
}
Rules:
- Infer region codes from the Korean address (province/city/district).
- Translate descriptions into English, Japanese, Chinese, Vietnamese, and Indonesian.
- Keep name and address concise in Korean unless a localized form is clearly better.
- Do not use markdown fences or commentary.
- Output JSON array only.`;

/**
 * @param {unknown} value
 * @returns {any[]}
 */
function parseJsonArray(value) {
  if (typeof value !== "string") {
    throw new Error("Gemini response was not text.");
  }

  const trimmed = value.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  const parsed = JSON.parse(withoutFence);
  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response was not a JSON array.");
  }
  return parsed;
}

/**
 * @param {import('@google/generative-ai').GenerativeModel} model
 * @param {object[]} batch
 */
async function processBatchWithGemini(model, batch) {
  const prompt = `${SYSTEM_PROMPT}

Input data:
${JSON.stringify(batch, null, 2)}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return parseJsonArray(text);
}

/**
 * @param {object[]} rawPlaces
 */
async function enrichPlacesWithGemini(rawPlaces) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  /** @type {object[]} */
  const enriched = [];

  for (let i = 0; i < rawPlaces.length; i += BATCH_SIZE) {
    const batch = rawPlaces.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${i / BATCH_SIZE + 1} (${batch.length} places)...`);
    const processed = await processBatchWithGemini(model, batch);
    enriched.push(...processed);
  }

  return enriched;
}

function readExistingPlaces() {
  if (!fs.existsSync(OUTPUT_PATH)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePlaces(places) {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(places, null, 2)}\n`, "utf8");
}

async function runPipeline() {
  console.log("Starting crawl...");
  const crawled = await crawlGoogleMaps();
  console.log(`Crawled ${crawled.length} raw places.`);

  if (crawled.length === 0) {
    console.warn("No crawl results. Keeping existing JSON unchanged.");
    return { changed: false, count: readExistingPlaces().length };
  }

  const cleanedRaw = mergeAndCleanExisting([], crawled);
  console.log("Sending data to Gemini...");
  const enriched = await enrichPlacesWithGemini(cleanedRaw);

  const existing = readExistingPlaces();
  const merged = mergeExistingCurated(existing, enriched);
  const previous = JSON.stringify(existing, null, 2);
  const next = JSON.stringify(merged, null, 2);

  writePlaces(merged);
  console.log(`Wrote ${merged.length} places to ${OUTPUT_PATH}`);

  return { changed: previous !== next, count: merged.length };
}

/**
 * Preserve manually enriched multilingual names while updating by theme+name key.
 * @param {object[]} existing
 * @param {object[]} incoming
 */
function mergeExistingCurated(existing, incoming) {
  const map = new Map(
    existing.map((place) => [`${place.theme}|${normalizeKey(place.name)}`, place])
  );

  for (const place of incoming) {
    map.set(`${place.theme}|${normalizeKey(place.name)}`, place);
  }

  return Array.from(map.values());
}

/**
 * @param {string|object} name
 */
function normalizeKey(name) {
  if (typeof name === "string") return name.toLowerCase().trim();
  if (name && typeof name === "object" && "en" in name) {
    return String(name.en).toLowerCase().trim();
  }
  return JSON.stringify(name).toLowerCase();
}

if (require.main === module) {
  runPipeline()
    .then(({ changed, count }) => {
      console.log(`Pipeline complete. changed=${changed}, total=${count}`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runPipeline, enrichPlacesWithGemini, writePlaces, readExistingPlaces };
