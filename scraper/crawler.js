const { chromium } = require("playwright");
const { SEARCH_QUERIES } = require("./config");
const { extractGooglePlacePhoto } = require("./imageFetcher");

const RESULTS_PER_QUERY = 5;
const SCROLL_PAUSE_MS = 800;

/**
 * @typedef {Object} RawPlace
 * @property {string} theme
 * @property {string} query
 * @property {string} name
 * @property {string} address
 * @property {number|null} rating
 * @property {string} review
 * @property {boolean} permanentlyClosed
 * @property {string=} imageUrl
 */

/**
 * Scroll the feed panel to load lazy-rendered Google Maps results.
 * @param {import('playwright').Page} page
 */
async function scrollResultsFeed(page) {
  const feedSelector = 'div[role="feed"]';

  try {
    await page.waitForSelector(feedSelector, { timeout: 15000 });
  } catch {
    return;
  }

  for (let i = 0; i < 4; i += 1) {
    await page.evaluate((selector) => {
      const feed = document.querySelector(selector);
      if (feed) feed.scrollTop = feed.scrollHeight;
    }, feedSelector);
    await page.waitForTimeout(SCROLL_PAUSE_MS);
  }
}

/**
 * Parse rating text such as "4.5(123)".
 * @param {string|null|undefined} text
 * @returns {number|null}
 */
function parseRating(text) {
  if (!text) return null;
  const match = text.match(/(\d+(?:\.\d+)?)/);
  return match ? Number.parseFloat(match[1]) : null;
}

/**
 * Detect permanently closed markers in result cards.
 * @param {string} cardText
 * @returns {boolean}
 */
function isPermanentlyClosed(cardText) {
  const normalized = cardText.toLowerCase();
  return (
    normalized.includes("permanently closed") ||
    normalized.includes("영업 종료") ||
    normalized.includes("폐업") ||
    normalized.includes("永久关闭") ||
    normalized.includes("閉店")
  );
}

/**
 * Extract place cards from the current Google Maps search results page.
 * @param {import('playwright').Page} page
 * @param {string} theme
 * @param {string} query
 * @returns {Promise<RawPlace[]>}
 */
async function extractPlacesFromResults(page, theme, query) {
  const cards = page.locator('div[role="feed"] > div > div > a[href*="/maps/place"]');
  const count = await cards.count();
  const places = [];

  for (let index = 0; index < Math.min(count, RESULTS_PER_QUERY); index += 1) {
    const card = cards.nth(index);

    try {
      await card.scrollIntoViewIfNeeded();
      await card.click({ timeout: 10000 });
      await page.waitForTimeout(1200);

      const name =
        (await page.locator("h1").first().textContent({ timeout: 5000 }).catch(() => null)) ||
        (await card.locator('[class*="fontHeadline"]').first().textContent().catch(() => null)) ||
        "";

      const address =
        (await page
          .locator('button[data-item-id="address"]')
          .first()
          .textContent({ timeout: 3000 })
          .catch(() => null)) ||
        (await page.locator('button[data-tooltip="Copy address"]').first().textContent().catch(() => null)) ||
        "";

      const ratingText = await page
        .locator('div[role="img"][aria-label*="stars"], span[aria-label*="stars"]')
        .first()
        .getAttribute("aria-label")
        .catch(() => null);

      const review = await page
        .locator('span[data-expandable-section], div[data-review-id] span')
        .first()
        .textContent({ timeout: 3000 })
        .catch(() => "");

      const cardText = `${name} ${address} ${review}`;
      const permanentlyClosed = isPermanentlyClosed(cardText);

      if (!name.trim()) continue;

      const imageUrl = await extractGooglePlacePhoto(page).catch(() => null);

      places.push({
        theme,
        query,
        name: name.trim(),
        address: (address || "").trim(),
        rating: parseRating(ratingText),
        review: (review || "").trim(),
        permanentlyClosed,
        ...(imageUrl ? { imageUrl } : {}),
      });

      await page.keyboard.press("Escape").catch(() => undefined);
      await page.waitForTimeout(400);
    } catch (error) {
      console.warn(`Skipped result #${index + 1} for "${query}":`, error.message);
    }
  }

  return places;
}

/**
 * Normalize crawl options into ordered { theme, query } entries.
 * Trend / priority queries always run first.
 * @param {{
 *   priorityQueries?: { theme: string; query: string }[];
 *   includeDefaults?: boolean;
 *   queriesOverride?: string[] | { theme: string; query: string }[];
 * }=} options
 * @returns {{ theme: string; query: string }[]}
 */
function buildQueryPlan(options = {}) {
  /** @type {{ theme: string; query: string }[]} */
  const plan = [];
  const seen = new Set();

  /**
   * @param {string} theme
   * @param {string} query
   */
  const push = (theme, query) => {
    const q = String(query || "").trim();
    if (!q) return;
    const key = `${theme}|${q}`;
    if (seen.has(key)) return;
    seen.add(key);
    plan.push({ theme, query: q });
  };

  for (const item of options.priorityQueries || []) {
    push(item.theme || "k-food", item.query);
  }

  if (options.queriesOverride) {
    for (const item of options.queriesOverride) {
      if (typeof item === "string") push("k-food", item);
      else push(item.theme || "k-food", item.query);
    }
    return plan;
  }

  if (options.includeDefaults !== false) {
    for (const [theme, queries] of Object.entries(SEARCH_QUERIES)) {
      for (const query of queries) push(theme, query);
    }
  }

  return plan;
}

/**
 * Crawl Google Maps for configured search queries.
 * @param {{
 *   priorityQueries?: { theme: string; query: string }[];
 *   includeDefaults?: boolean;
 *   queriesOverride?: string[] | { theme: string; query: string }[];
 * } | string[] =} optionsOrOverride
 * @returns {Promise<RawPlace[]>}
 */
async function crawlGoogleMaps(optionsOrOverride) {
  const options = Array.isArray(optionsOrOverride)
    ? { queriesOverride: optionsOrOverride, includeDefaults: false }
    : optionsOrOverride || {};

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    locale: "ko-KR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });

  /** @type {RawPlace[]} */
  const collected = [];
  const queryPlan = buildQueryPlan(options);

  try {
    for (const { theme, query } of queryPlan) {
      console.log(`Searching: [${theme}] ${query}`);
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(2000);
      await scrollResultsFeed(page);

      const results = await extractPlacesFromResults(page, theme, query);
      collected.push(...results);
    }
  } finally {
    await browser.close();
  }

  return dedupePlaces(collected);
}

/**
 * Remove duplicates and permanently closed listings.
 * @param {RawPlace[]} places
 * @returns {RawPlace[]}
 */
function dedupePlaces(places) {
  const seen = new Set();
  return places.filter((place) => {
    if (place.permanentlyClosed) {
      console.log(`Removing permanently closed place: ${place.name}`);
      return false;
    }

    const key = `${place.name}|${place.address}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Review existing JSON and drop stale permanently closed entries.
 * @param {RawPlace[]} existing
 * @param {RawPlace[]} fresh
 * @returns {RawPlace[]}
 */
function mergeAndCleanExisting(existing = [], fresh = []) {
  const cleanedExisting = existing.filter((place) => {
    if (place.permanentlyClosed) {
      console.log(`Purging archived place: ${place.name}`);
      return false;
    }
    return true;
  });

  const merged = [...cleanedExisting, ...fresh];
  return dedupePlaces(merged);
}

module.exports = {
  crawlGoogleMaps,
  buildQueryPlan,
  dedupePlaces,
  mergeAndCleanExisting,
  isPermanentlyClosed,
};

if (require.main === module) {
  crawlGoogleMaps()
    .then((results) => {
      console.log(JSON.stringify(results, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
