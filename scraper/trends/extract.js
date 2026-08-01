const { nvidiaChatCompletion } = require("../llmClient");
const { CURATED_TRENDS } = require("./config");

/**
 * @typedef {{
 *   label: string;
 *   source: string;
 *   regionHints: string[];
 *   placeHints: string[];
 *   theme: string;
 *   queries: { theme: string; query: string }[];
 *   score: number;
 * }} TrendSignal
 */

const EXTRACT_SYSTEM = `You extract Korean travel destination trends from news headlines.
Return ONLY a JSON array. Each item:
{
  "label": "short trend name e.g. 거제 야호",
  "source": "media/creator mentioned",
  "regionHints": ["거제","옥포"],
  "placeHints": ["specific restaurant or landmark names"],
  "theme": "k-food|hallyu|k-beauty|k-culture|urban-nature",
  "queries": [{"theme":"k-food","query":"거제 모래성포차"}],
  "score": 1-100
}
Rules:
- Only include destination/place travel trends (not politics/finance).
- Prefer concrete place or district names over vague category words.
- queries must be Korean Google Maps-searchable (real place or area + category).
- Max 5 items. JSON array only.`;

/**
 * @param {string} value
 */
function parseJsonArray(value) {
  const trimmed = value.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start < 0 || end < 0) throw new Error("No JSON array in LLM trend extract.");
  const parsed = JSON.parse(trimmed.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error("Trend extract was not an array.");
  return parsed;
}

/**
 * Heuristic extract when LLM is unavailable.
 * @param {{ title: string; snippet: string; keyword: string }[]} articles
 * @returns {TrendSignal[]}
 */
function extractTrendsLocally(articles) {
  /** @type {Map<string, TrendSignal>} */
  const byLabel = new Map();

  for (const curated of CURATED_TRENDS) {
    byLabel.set(curated.label, { ...curated, queries: [...curated.queries] });
  }

  for (const article of articles) {
    const text = `${article.title} ${article.snippet} ${article.keyword}`;
    for (const curated of CURATED_TRENDS) {
      const hit = [curated.label, ...curated.regionHints, ...curated.placeHints].some(
        (hint) => text.includes(hint)
      );
      if (!hit) continue;
      const existing = byLabel.get(curated.label);
      if (existing) {
        existing.score = Math.min(100, existing.score + 5);
        existing.source = `${existing.source} · ${article.title.slice(0, 40)}`;
      }
    }

    // Generic: city + 핫플/성지/야호 patterns
    const cityMatch = text.match(
      /(거제|제주|부산|전주|경주|여수|강릉|속초|양양|남원|통영|포항)/
    );
    if (cityMatch && /(핫플|성지|야호|성지순례|급상승|관광객)/.test(text)) {
      const city = cityMatch[1];
      const label = `${city} 트렌드`;
      if (!byLabel.has(label)) {
        byLabel.set(label, {
          label,
          source: article.title.slice(0, 60),
          regionHints: [city],
          placeHints: [],
          theme: /맛집|포차|국밥|갈비/.test(text) ? "k-food" : "hallyu",
          queries: [
            {
              theme: /맛집|포차|국밥|갈비/.test(text) ? "k-food" : "urban-nature",
              query: `${city} ${/맛집|포차/.test(text) ? "맛집" : "관광지"}`,
            },
          ],
          score: 40,
        });
      }
    }
  }

  return [...byLabel.values()].sort((a, b) => b.score - a.score);
}

/**
 * @param {unknown} item
 * @returns {TrendSignal | null}
 */
function normalizeLlmTrend(item) {
  if (!item || typeof item !== "object") return null;
  const row = /** @type {Record<string, unknown>} */ (item);
  const label = String(row.label || "").trim();
  if (!label) return null;
  const queries = Array.isArray(row.queries)
    ? row.queries
        .map((q) => {
          if (!q || typeof q !== "object") return null;
          const theme = String(/** @type {any} */ (q).theme || "k-food");
          const query = String(/** @type {any} */ (q).query || "").trim();
          if (!query) return null;
          return { theme, query };
        })
        .filter(Boolean)
    : [];

  return {
    label,
    source: String(row.source || "news").slice(0, 120),
    regionHints: Array.isArray(row.regionHints)
      ? row.regionHints.map(String)
      : [],
    placeHints: Array.isArray(row.placeHints) ? row.placeHints.map(String) : [],
    theme: String(row.theme || "hallyu"),
    queries: /** @type {{ theme: string; query: string }[]} */ (queries),
    score: Number(row.score) || 50,
  };
}

/**
 * Merge curated + news (+ optional LLM) into ranked trend signals.
 * @param {{ title: string; snippet: string; keyword: string }[]} articles
 * @returns {Promise<TrendSignal[]>}
 */
async function extractTrendSignals(articles) {
  const local = extractTrendsLocally(articles);

  if (!process.env.NVIDIA_API_KEY || articles.length === 0) {
    return local;
  }

  try {
    const user = articles
      .slice(0, 10)
      .map((a, i) => `${i + 1}. [${a.keyword}] ${a.title}\n${a.snippet}`)
      .join("\n\n");
    const raw = await nvidiaChatCompletion({
      system: EXTRACT_SYSTEM,
      user,
      maxTokens: 2048,
    });
    const llmItems = parseJsonArray(raw)
      .map(normalizeLlmTrend)
      .filter(Boolean);

    /** @type {Map<string, TrendSignal>} */
    const merged = new Map();
    for (const signal of [...local, ...llmItems]) {
      const key = signal.label.toLowerCase();
      const prev = merged.get(key);
      if (!prev || signal.score > prev.score) {
        merged.set(key, {
          ...signal,
          queries: [
            ...(prev?.queries || []),
            ...signal.queries,
          ].filter(
            (q, idx, arr) =>
              arr.findIndex((x) => x.query === q.query && x.theme === q.theme) === idx
          ),
          placeHints: [...new Set([...(prev?.placeHints || []), ...signal.placeHints])],
          regionHints: [...new Set([...(prev?.regionHints || []), ...signal.regionHints])],
        });
      }
    }
    return [...merged.values()].sort((a, b) => b.score - a.score);
  } catch (error) {
    console.warn("[trend] LLM extract failed, using local signals:", error.message);
    return local;
  }
}

module.exports = {
  extractTrendSignals,
  extractTrendsLocally,
};
