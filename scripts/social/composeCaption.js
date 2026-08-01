/**
 * Compose bilingual (KO/EN) Instagram captions with hashtags.
 * Uses NVIDIA NIM via scraper/llmClient.js when NVIDIA_API_KEY is set;
 * otherwise a solid local template fallback.
 */
const {
  resolveEnglishName,
  resolveNameKo,
  resolveDescription,
  placePageUrl,
  reviewSnippet,
  loadReviews,
} = require("./placeUtils");

const THEME_HASHTAGS = {
  "k-food": ["#KoreanFood", "#KFood", "#맛집", "#한식"],
  hallyu: ["#Hallyu", "#KDrama", "#한류", "#KoreaTravel"],
  "k-culture": ["#KoreanCulture", "#Heritage", "#한국문화", "#TempleStay"],
  "urban-nature": ["#KoreaNature", "#ScenicKorea", "#자연", "#힐링여행"],
  "k-beauty": ["#KBeauty", "#BeautyTravel", "#뷰티", "#KStyle"],
};

const BASE_TAGS = [
  "#Korea",
  "#VisitKorea",
  "#한국여행",
  "#Daedongyeojido",
  "#대동여지도",
];

function buildHashtags(place, format) {
  const themeTags = THEME_HASHTAGS[place.theme] || [];
  const trendTag = place.trend?.label
    ? `#${String(place.trend.label).replace(/\s+/g, "").replace(/[^a-zA-Z0-9가-힣_]/g, "")}`
    : null;
  const tags = [
    ...BASE_TAGS,
    ...themeTags,
    trendTag,
    format === "trend" ? "#TravelTrend" : null,
    place.region?.province ? `#${String(place.region.province).replace(/[^a-zA-Z]/g, "")}` : null,
  ].filter(Boolean);

  // Unique, 8–12 tags
  const unique = [];
  const seen = new Set();
  for (const t of tags) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(t);
    if (unique.length >= 12) break;
  }
  while (unique.length < 8) {
    unique.push(`#KoreaTravel${unique.length}`);
  }
  return unique.slice(0, 12);
}

function localFallbackCaption(place, { format, reviewText } = {}) {
  const nameEn = resolveEnglishName(place);
  const nameKo = resolveNameKo(place);
  const descEn = resolveDescription(place, "en");
  const url = placePageUrl(place.slug);
  const tags = buildHashtags(place, format || "place_card").join(" ");
  const trendLine = place.trend?.label
    ? `\n🔥 Trend: ${place.trend.label}\n`
    : "\n";
  const reviewLine = reviewText ? `\nTraveler note: ${reviewText}\n` : "\n";

  const ko = [
    `${nameKo}`,
    place.trend?.label ? `지금 뜨는 「${place.trend.label}」 성지 코스에 올려보세요.` : null,
    descEn ? `${resolveDescription(place, "en").slice(0, 80)}` : null,
    `자세한 정보 → ${url}`,
  ]
    .filter(Boolean)
    .join("\n");

  // Prefer a short KO block; description may only exist in EN in data
  const koBlock = place.trend?.label
    ? `${nameKo} — 「${place.trend.label}」\n한국 여행 큐레이션, 대동여지도.\n더 보기: ${url}`
    : `${nameKo}\n한국 여행지 추천 · 대동여지도\n더 보기: ${url}`;

  const enBlock = [
    `${nameEn}`,
    descEn || "A curated Korea travel stop from Daedongyeojido.",
    reviewText ? `“${reviewText}”` : null,
    `Guide: ${url}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `${koBlock}\n\n${enBlock}${trendLine}${reviewLine}${tags}`.trim();
}

async function llmCaption(place, { format, reviewText } = {}) {
  const { nvidiaChatCompletion } = require("../../scraper/llmClient");
  const nameEn = resolveEnglishName(place);
  const nameKo = resolveNameKo(place);
  const descEn = resolveDescription(place, "en");
  const url = placePageUrl(place.slug);
  const tagsHint = buildHashtags(place, format || "place_card").join(" ");

  const system = `You write Instagram captions for a Korea travel brand "대동여지도 / Daedongyeojido".
Rules:
- Bilingual: Korean block first, then English block.
- Warm, specific, not spammy. No emoji spam (0–2 emoji max).
- Include 8–12 hashtags at the end (mix KO/EN). Prefer: ${tagsHint}
- End CTA with the place URL exactly: ${url}
- Total caption under 2000 characters.
- Return ONLY the caption text, no markdown fences.`;

  const user = JSON.stringify(
    {
      nameKo,
      nameEn,
      theme: place.theme,
      region: place.region,
      rating: place.rating,
      localGem: !!place.localGem,
      trend: place.trend || null,
      format: format || "place_card",
      descriptionEn: descEn,
      reviewSnippet: reviewText || null,
    },
    null,
    2
  );

  const content = await nvidiaChatCompletion({
    system,
    user: `Write a feed caption for this place:\n${user}`,
    maxTokens: 800,
  });
  return content.trim();
}

/**
 * @param {object} place indexed place with slug
 * @param {{ format?: string }} opts
 */
async function composeCaption(place, opts = {}) {
  const reviews = loadReviews();
  const reviewText = reviewSnippet(reviews, place.slug);
  const format = opts.format || (place.trend?.label ? "trend" : "place_card");

  if (process.env.NVIDIA_API_KEY) {
    try {
      const caption = await llmCaption(place, { format, reviewText });
      if (caption && caption.length > 40) return { caption, source: "nvidia" };
    } catch (err) {
      console.warn(`NVIDIA caption failed, using fallback: ${err.message}`);
    }
  }

  return {
    caption: localFallbackCaption(place, { format, reviewText }),
    source: "local",
  };
}

module.exports = {
  THEME_HASHTAGS,
  BASE_TAGS,
  buildHashtags,
  localFallbackCaption,
  composeCaption,
};
