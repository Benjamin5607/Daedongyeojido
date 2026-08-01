const { chromium } = require("playwright");
const {
  TREND_SEED_KEYWORDS,
  TREND_NEWS_PROBES,
  TREND_NEWS_LIMIT,
} = require("./config");

/**
 * @typedef {{ title: string; snippet: string; url: string; keyword: string }} TrendArticle
 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Scrape Naver news results for a keyword (no API key).
 * @param {import('playwright').Page} page
 * @param {string} keyword
 * @param {number} limit
 * @returns {Promise<TrendArticle[]>}
 */
async function scrapeNaverNews(page, keyword, limit = 5) {
  const url = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(keyword)}&sort=1`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await sleep(1500);

  return page.evaluate(
    ({ kw, lim }) => {
      /** @type {{ title: string; snippet: string; url: string; keyword: string }[]} */
      const items = [];
      const nodes = document.querySelectorAll(
        "a.news_tit, a[data-heatmap-target='.tit']"
      );
      for (const a of Array.from(nodes).slice(0, lim)) {
        const title = (a.textContent || "").trim();
        if (!title) continue;
        const card =
          a.closest(".news_wrap") ||
          a.closest(".bx") ||
          a.parentElement?.parentElement;
        const snippet =
          card?.querySelector(".dsc_txt_wrap, .news_dsc, .dsc")?.textContent?.trim() ||
          "";
        items.push({
          title,
          snippet,
          url: a.href || "",
          keyword: kw,
        });
      }
      return items;
    },
    { kw: keyword, lim: limit }
  );
}

/**
 * Discover recent travel/media trend articles from Naver news.
 * @returns {Promise<TrendArticle[]>}
 */
async function discoverTrendArticles() {
  const keywords = [...new Set([...TREND_SEED_KEYWORDS, ...TREND_NEWS_PROBES])];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    locale: "ko-KR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });

  /** @type {TrendArticle[]} */
  const articles = [];
  const seen = new Set();

  try {
    for (const keyword of keywords) {
      console.log(`[trend] news probe: ${keyword}`);
      const batch = await scrapeNaverNews(page, keyword, 4).catch((error) => {
        console.warn(`[trend] news failed for "${keyword}":`, error.message);
        return [];
      });
      for (const item of batch) {
        const key = item.title.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        articles.push(item);
      }
      await sleep(600);
      if (articles.length >= TREND_NEWS_LIMIT) break;
    }
  } finally {
    await browser.close();
  }

  console.log(`[trend] discovered ${articles.length} news articles`);
  return articles.slice(0, TREND_NEWS_LIMIT);
}

module.exports = {
  discoverTrendArticles,
  scrapeNaverNews,
};
