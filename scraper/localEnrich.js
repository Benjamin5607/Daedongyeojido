const PROVINCE_FROM_TEXT = [
  [/서울|seoul/i, "seoul"],
  [/부산|busan/i, "busan"],
  [/제주|jeju/i, "jeju"],
  [/경기|gyeonggi/i, "gyeonggi"],
  [/강원|gangwon/i, "gangwon"],
  [/경상북|경북|gyeongbuk/i, "gyeongbuk"],
  [/경상남|경남|gyeongnam/i, "gyeongnam"],
  [/전라북|전북|jeonbuk/i, "jeonbuk"],
  [/전라남|전남|jeonnam/i, "jeonnam"],
  [/충청북|충북|chungbuk/i, "chungbuk"],
  [/충청남|충남|chungnam/i, "chungnam"],
];

/**
 * @param {{ query?: string; address?: string }} raw
 */
function inferRegion(raw) {
  const text = `${raw.query ?? ""} ${raw.address ?? ""}`;
  for (const [pattern, province] of PROVINCE_FROM_TEXT) {
    if (pattern.test(text)) return { province };
  }
  return { province: "seoul" };
}

/**
 * @param {string} text
 */
function localizeText(text) {
  const value = text.trim() || "Local discovery spot in Korea.";
  return { en: value, ja: value, zh: value, vi: value, id: value };
}

/**
 * Convert crawled raw place into curated JSON without LLM.
 * @param {object} raw
 */
function enrichPlaceLocally(raw) {
  const descriptionText =
    raw.review?.trim() ||
    `${raw.name} — a spot surfaced from Naver/Google local discovery.`;

  return {
    theme: raw.theme,
    region: inferRegion(raw),
    name: raw.name,
    address: raw.address || raw.name,
    rating: typeof raw.rating === "number" ? raw.rating : 4.0,
    description: localizeText(descriptionText),
    ...(raw.imageUrl ? { imageUrl: raw.imageUrl } : {}),
  };
}

module.exports = { enrichPlaceLocally, inferRegion };
