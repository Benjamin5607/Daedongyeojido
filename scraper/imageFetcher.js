const GOOGLE_PHOTO_SELECTORS = [
  'button[jsaction*="heroHeaderImage"] img',
  'button[aria-label*="사진"] img',
  'button[aria-label*="Photo"] img',
  'div[role="main"] img[src*="googleusercontent.com"]',
  'img[src*="googleusercontent.com/p/"]',
  'img[src*="googleusercontent.com/gps-cs-s"]',
];

const NAVER_PLACE_PHOTO_SELECTORS = [
  'img[src*="ldb-phinf.pstatic.net"]',
  'img[src*="map.pstatic.net"]',
];

const PLACE_FETCH_TIMEOUT_MS = Number(process.env.PLACE_PHOTO_TIMEOUT_MS) || 45_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} label
 * @returns {Promise<T>}
 */
async function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function dismissGoogleConsent(page) {
  const consent = page.locator(
    'button:has-text("Accept all"), button:has-text("모두 동의"), button:has-text("동의")'
  );
  if ((await consent.count()) > 0) {
    await consent.first().click({ timeout: 3000 }).catch(() => undefined);
    await sleep(400);
  }
}

/**
 * @param {string|null|undefined} src
 */
function isUsablePhotoUrl(src) {
  if (!src || !/^https?:/i.test(src)) return false;
  if (src.startsWith("data:")) return false;
  if (src.includes("google.com/images/branding")) return false;
  return true;
}

/** Reject blog/image-search proxies — not tied to a map POI. */
function isLowQualityImageUrl(src) {
  if (!src) return true;
  if (src.includes("ldb-phinf.pstatic.net") || src.includes("map.pstatic.net")) return false;
  if (src.includes("search.pstatic.net/common") && /ldb-phinf|map\.pstatic/.test(src)) {
    return false;
  }
  return (
    src.includes("search.pstatic.net/common") ||
    src.includes("blogfiles.naver.net") ||
    src.includes("cafefiles.naver.net") ||
    src.includes("imgnews.naver.net") ||
    (/googleusercontent\.com/.test(src) &&
      /=w(\d+)-h(\d+)/.test(src) &&
      Number(src.match(/=w(\d+)-h(\d+)/)?.[1] ?? 999) < 120)
  );
}

/**
 * @param {string} src
 */
function unwrapNaverPhotoUrl(src) {
  if (!src.includes("search.pstatic.net/common")) return src;
  const match = src.match(/[?&]src=([^&]+)/);
  if (!match) return src;
  try {
    const decoded = decodeURIComponent(match[1]);
    if (decoded.includes("ldb-phinf.pstatic.net") || decoded.includes("map.pstatic.net")) {
      return decoded;
    }
  } catch {
    return src;
  }
  return src;
}

/**
 * @param {string|null|undefined} src
 */
function isPlaceListingPhotoUrl(src) {
  const resolved = unwrapNaverPhotoUrl(src);
  if (!isUsablePhotoUrl(resolved)) return false;
  if (isLowQualityImageUrl(resolved)) return false;
  if (resolved.includes("googleusercontent.com")) return true;
  if (resolved.includes("ldb-phinf.pstatic.net")) return true;
  if (resolved.includes("map.pstatic.net")) return true;
  return false;
}

/**
 * @param {string} src
 */
function upgradePhotoUrl(src) {
  const resolved = unwrapNaverPhotoUrl(src);
  if (resolved.includes("googleusercontent.com")) {
    return resolved
      .replace(/=w\d+-h\d+[^&]*/i, "=w800-h600-k-no")
      .replace(/=s\d+[^&]*/i, "=s800-no");
  }
  if (resolved.includes("pstatic.net")) {
    return resolved.replace(/type=f\d+_\d+/i, "type=f500_500").replace(/type=w\d+[^&]*/i, "type=w800");
  }
  return resolved;
}

/**
 * @param {string} a
 * @param {string} b
 */
function namesLikelyMatch(a, b) {
  const compact = (value) =>
    value
      .toLowerCase()
      .replace(/[\s·.,()[\]'"-]/g, "")
      .trim();
  const left = compact(a);
  const right = compact(b);
  if (!left || !right) return false;
  if (left.includes(right) || right.includes(left)) return true;

  const tokens = (value) =>
    value
      .replace(/[^\uAC00-\uD7A3a-zA-Z0-9]/g, " ")
      .split(/\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 2);

  const leftTokens = tokens(a);
  const rightTokens = tokens(b);
  return leftTokens.some((token) =>
    rightTokens.some((other) => other.includes(token) || token.includes(other))
  );
}

/**
 * @param {import('playwright').Page} page
 * @param {string[]} selectors
 */
async function extractBestPlacePhoto(page, selectors) {
  await sleep(1200);

  /** @type {{ src: string; area: number }[]} */
  const candidates = [];

  for (const selector of selectors) {
    const locator = page.locator(selector);
    const count = await locator.count().catch(() => 0);
    for (let i = 0; i < Math.min(count, 10); i += 1) {
      const el = locator.nth(i);
      const src = await el.getAttribute("src").catch(() => null);
      if (!isPlaceListingPhotoUrl(src)) continue;
      const box = await el.boundingBox().catch(() => null);
      const area = box ? box.width * box.height : 100;
      candidates.push({ src, area });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.area - a.area);
  return upgradePhotoUrl(candidates[0].src);
}

/**
 * @param {import('playwright').Page} page
 */
async function extractGooglePlacePhoto(page) {
  const photosTab = page.locator('button[aria-label*="사진"], button[aria-label*="Photos"]');
  if ((await photosTab.count()) > 0) {
    await photosTab.first().click({ timeout: 4000 }).catch(() => undefined);
    await sleep(1000);
  }
  return extractBestPlacePhoto(page, GOOGLE_PHOTO_SELECTORS);
}

/**
 * @param {import('playwright').Page} page
 * @param {string} searchQuery
 */
async function fetchGoogleMapsPhoto(page, searchQuery) {
  const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await dismissGoogleConsent(page);
  await sleep(2500);

  const results = page.locator('div[role="feed"] a[href*="/maps/place"]');
  const count = await results.count();
  if (count === 0) return null;

  for (let i = 0; i < Math.min(count, 4); i += 1) {
    const card = results.nth(i);
    const cardPhoto = await card
      .locator('img[src*="googleusercontent.com"]')
      .first()
      .getAttribute("src")
      .catch(() => null);
    if (isPlaceListingPhotoUrl(cardPhoto)) {
      return upgradePhotoUrl(cardPhoto);
    }

    await card.click({ timeout: 10000 });
    await sleep(2000);

    const title =
      (await page.locator("h1").first().textContent({ timeout: 4000 }).catch(() => null)) || "";
    if (i > 0 && title && !namesLikelyMatch(title, searchQuery)) {
      await page.keyboard.press("Escape").catch(() => undefined);
      await sleep(400);
      continue;
    }

    const photo = await extractGooglePlacePhoto(page);
    if (photo) return photo;

    await page.keyboard.press("Escape").catch(() => undefined);
    await sleep(400);
  }

  return null;
}

/**
 * @param {import('playwright').Page} page
 * @param {string} searchQuery
 */
async function fetchNaverMapPhoto(page, searchQuery) {
  const pcmapUrl = `https://pcmap.place.naver.com/place/list?query=${encodeURIComponent(searchQuery)}`;
  await page.goto(pcmapUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await sleep(2000);

  const photos = page.locator(
    'img[src*="ldb-phinf.pstatic.net"], img[src*="map.pstatic.net"], img[src*="search.pstatic.net/common"]'
  );
  const count = await photos.count().catch(() => 0);
  for (let i = 0; i < Math.min(count, 6); i += 1) {
    const src = await photos.nth(i).getAttribute("src").catch(() => null);
    if (isPlaceListingPhotoUrl(src)) return upgradePhotoUrl(src);
  }

  const firstPlace = page.locator("a.place_bluelink, a[href*='/restaurant/'], a[href*='/place/']").first();
  if ((await firstPlace.count()) === 0) return null;

  await firstPlace.click({ timeout: 8000 }).catch(() => null);
  await sleep(2500);

  const detailPhotos = page.locator(
    'img[src*="ldb-phinf.pstatic.net"], img[src*="map.pstatic.net"], img[src*="search.pstatic.net/common"]'
  );
  const detailCount = await detailPhotos.count().catch(() => 0);
  for (let i = 0; i < Math.min(detailCount, 8); i += 1) {
    const src = await detailPhotos.nth(i).getAttribute("src").catch(() => null);
    if (isPlaceListingPhotoUrl(src)) return upgradePhotoUrl(src);
  }

  return null;
}

/**
 * Prefer map POI listing photos (Google Maps → Naver Place).
 * @param {import('playwright').Page} page
 * @param {string} searchQuery
 */
async function fetchPlacePhoto(page, searchQuery) {
  const hasHangul = /[가-힣]/.test(searchQuery);

  if (hasHangul) {
    const naverPhoto = await withTimeout(
      fetchNaverMapPhoto(page, searchQuery),
      PLACE_FETCH_TIMEOUT_MS,
      "naver-map"
    ).catch(() => null);
    if (naverPhoto) return { imageUrl: naverPhoto, source: "naver-map" };
  }

  const googlePhoto = await withTimeout(
    fetchGoogleMapsPhoto(page, searchQuery),
    PLACE_FETCH_TIMEOUT_MS,
    "google-maps"
  ).catch(() => null);
  if (googlePhoto) return { imageUrl: googlePhoto, source: "google-maps" };

  if (!hasHangul) {
    const naverPhoto = await withTimeout(
      fetchNaverMapPhoto(page, searchQuery),
      PLACE_FETCH_TIMEOUT_MS,
      "naver-map"
    ).catch(() => null);
    if (naverPhoto) return { imageUrl: naverPhoto, source: "naver-map" };
  }

  return null;
}

module.exports = {
  fetchPlacePhoto,
  fetchGoogleMapsPhoto,
  fetchNaverMapPhoto,
  extractGooglePlacePhoto,
  isUsablePhotoUrl,
  isLowQualityImageUrl,
  isPlaceListingPhotoUrl,
  upgradePhotoUrl,
};
