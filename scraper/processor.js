const fs = require("fs");
const path = require("path");
const { crawlGoogleMaps, mergeAndCleanExisting } = require("./crawler");
const { nvidiaChatCompletion, DEFAULT_MODEL } = require("./llmClient");
const { enrichPlaceLocally } = require("./localEnrich");
const { attachMissingImages } = require("./placeImages");
const {
  buildTrendCrawlPlan,
  applyTrendTagsToIncoming,
} = require("./trends");

const OUTPUT_PATH = path.join(__dirname, "..", "src", "data", "crawled_places.json");
const BATCH_SIZE =
  Number(process.env.LLM_BATCH_SIZE || process.env.GEMINI_BATCH_SIZE) || 3;
const BATCH_DELAY_MS =
  Number(process.env.LLM_BATCH_DELAY_MS || process.env.GEMINI_BATCH_DELAY_MS) || 5_000;
const IMAGE_DELAY_MS = Number(process.env.IMAGE_FETCH_DELAY_MS) || 1200;
const MAX_RETRIES =
  Number(process.env.LLM_MAX_RETRIES || process.env.GEMINI_MAX_RETRIES) || 5;
const INITIAL_BACKOFF_MS =
  Number(process.env.LLM_INITIAL_BACKOFF_MS || process.env.GEMINI_INITIAL_BACKOFF_MS) ||
  30_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {unknown} error
 */
function isRateLimitError(error) {
  const message = String(
    error && typeof error === "object" && "message" in error ? error.message : error
  );
  return (
    (error && typeof error === "object" && "status" in error && error.status === 429) ||
    message.includes("429") ||
    message.includes("Too Many Requests") ||
    /quota/i.test(message) ||
    /rate limit/i.test(message)
  );
}

/**
 * @param {unknown} error
 */
function isRetryableError(error) {
  if (isRateLimitError(error)) return true;
  const status = error && typeof error === "object" && "status" in error ? error.status : 0;
  return typeof status === "number" && status >= 500 && status < 600;
}

/**
 * @param {unknown} error
 */
function parseRetryDelayMs(error) {
  const message = String(
    error && typeof error === "object" && "message" in error ? error.message : error
  );
  const match = message.match(/retry in ([\d.]+)s/i);
  if (!match) return null;
  return Math.ceil(Number(match[1]) * 1000) + 1000;
}

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
    throw new Error("LLM response was not text.");
  }

  const trimmed = value.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    const parsed = JSON.parse(withoutFence);
    if (!Array.isArray(parsed)) throw new Error("not array");
    return parsed;
  } catch {
    const match = withoutFence.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed;
    }
    throw new Error("LLM response was not a JSON array.");
  }
}

/**
 * @param {object[]} batch
 * @param {number} batchIndex
 */
async function processBatchWithLlm(batch, batchIndex) {
  const userPrompt = `Input data:\n${JSON.stringify(batch, null, 2)}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const text = await nvidiaChatCompletion({
        system: SYSTEM_PROMPT,
        user: userPrompt,
      });
      try {
        return parseJsonArray(text);
      } catch (parseError) {
        if (attempt === MAX_RETRIES) break;
        console.warn(
          `Batch ${batchIndex}: invalid JSON (attempt ${attempt + 1}/${MAX_RETRIES}), retrying...`
        );
        await sleep(2000);
        continue;
      }
    } catch (error) {
      if (!isRetryableError(error) || attempt === MAX_RETRIES) {
        break;
      }

      const suggestedMs = parseRetryDelayMs(error);
      const backoffMs = suggestedMs ?? INITIAL_BACKOFF_MS * 2 ** attempt;

      console.warn(
        `Batch ${batchIndex}: request failed (attempt ${attempt + 1}/${MAX_RETRIES}). ` +
          `Waiting ${Math.round(backoffMs / 1000)}s...`
      );
      await sleep(backoffMs);
    }
  }

  console.warn(
    `Batch ${batchIndex}: LLM unavailable — local fallback for ${batch.length} place(s).`
  );
  return batch.map(enrichPlaceLocally);
}

/**
 * @param {object[]} rawPlaces
 */
async function enrichPlacesWithLlm(rawPlaces) {
  const totalBatches = Math.ceil(rawPlaces.length / BATCH_SIZE);
  console.log(
    `LLM config: provider=nvidia, model=${DEFAULT_MODEL}, batchSize=${BATCH_SIZE}, ` +
      `batchDelay=${BATCH_DELAY_MS / 1000}s, maxRetries=${MAX_RETRIES}`
  );

  /** @type {object[]} */
  const enriched = [];

  for (let i = 0; i < rawPlaces.length; i += BATCH_SIZE) {
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
    const batch = rawPlaces.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${batchIndex}/${totalBatches} (${batch.length} places)...`);
    const processed = await processBatchWithLlm(batch, batchIndex);
    enriched.push(...processed);

    if (batchIndex < totalBatches) {
      console.log(`Waiting ${BATCH_DELAY_MS / 1000}s before next batch...`);
      await sleep(BATCH_DELAY_MS);
    }
  }

  return enriched;
}

/**
 * @param {object[]} rawPlaces
 */
async function enrichPlaces(rawPlaces) {
  if (!process.env.NVIDIA_API_KEY) {
    console.warn("NVIDIA_API_KEY not set — using local enrichment (pipeline continues).");
    return rawPlaces.map(enrichPlaceLocally);
  }
  return enrichPlacesWithLlm(rawPlaces);
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
  const existing = readExistingPlaces();

  const { priorityQueries } = await buildTrendCrawlPlan(existing);

  console.log("Starting crawl (trend queries first)...");
  const crawled = await crawlGoogleMaps({
    priorityQueries,
    includeDefaults: true,
  });
  console.log(`Crawled ${crawled.length} raw places.`);

  if (crawled.length === 0) {
    console.warn("No crawl results. Keeping existing JSON unchanged.");
    return { changed: false, count: existing.length };
  }

  const taggedRaw = applyTrendTagsToIncoming(crawled, priorityQueries);
  const cleanedRaw = mergeAndCleanExisting([], taggedRaw);
  console.log("Enriching crawled places...");
  const imageUrlByKey = new Map(
    cleanedRaw
      .filter((place) => place.imageUrl)
      .map((place) => [`${place.theme}|${normalizeKey(place.name)}`, place.imageUrl])
  );
  const enriched = await enrichPlaces(cleanedRaw);
  for (const place of enriched) {
    const key = `${place.theme}|${normalizeKey(place.name)}`;
    if (!place.imageUrl && imageUrlByKey.has(key)) {
      place.imageUrl = imageUrlByKey.get(key);
    }
  }

  // Re-apply trend tags after enrich (LLM may drop unknown fields)
  const enrichedWithTrends = applyTrendTagsToIncoming(
    enriched.map((place, index) => ({
      ...place,
      query: cleanedRaw[index]?.query,
      trend: cleanedRaw[index]?.trend || place.trend,
    })),
    priorityQueries
  );

  const merged = mergeExistingCurated(existing, enrichedWithTrends);

  // Sort so trend places are enriched/photographed first
  merged.sort((a, b) => {
    const aScore = a.trend ? 1 : 0;
    const bScore = b.trend ? 1 : 0;
    return bScore - aScore;
  });

  console.log("Attaching photos for new, missing, or trend-priority entries...");
  const withPhotos = await attachMissingImages(merged, { delayMs: IMAGE_DELAY_MS });

  // Strip internal flags before write
  const cleaned = withPhotos.map((place) => {
    const { forcePhotoRefresh: _f, query: _q, permanentlyClosed: _p, ...rest } = place;
    return rest;
  });

  const previous = JSON.stringify(existing, null, 2);
  const next = JSON.stringify(cleaned, null, 2);

  writePlaces(cleaned);
  console.log(`Wrote ${cleaned.length} places to ${OUTPUT_PATH}`);

  return { changed: previous !== next, count: cleaned.length };
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
    const key = `${place.theme}|${normalizeKey(place.name)}`;
    const previous = map.get(key);
    map.set(key, {
      ...previous,
      ...place,
      imageUrl: place.imageUrl ?? previous?.imageUrl,
      trend: place.trend ?? previous?.trend,
      forcePhotoRefresh: place.forcePhotoRefresh || previous?.forcePhotoRefresh,
    });
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
  if (name && typeof name === "object" && "ko" in name) {
    return String(name.ko).toLowerCase().trim();
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

module.exports = {
  runPipeline,
  enrichPlaces,
  enrichPlacesWithLlm,
  writePlaces,
  readExistingPlaces,
  attachMissingImages,
};
