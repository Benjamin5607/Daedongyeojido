const GOOGLE_PHOTO_SELECTORS = [
  'button[jsaction*="heroHeaderImage"] img',
  'button[aria-label*="사진"] img',
  'button[aria-label*="Photo"] img',
  'div[role="main"] img[src*="googleusercontent.com"]',
  'img[src*="googleusercontent.com/p/"]',
  'img[src*="googleusercontent.com/gps-cs-s"]',
];

const NAVER_PHOTO_SELECTORS = [
  'img[src*="search.pstatic.net"]',
  'img[src*="ldb-phinf.pstatic.net"]',
  'img[src*="pstatic.net"]',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function dismissGoogleConsent(page) {
  const consent = page.locator(
    'button:has-text("Accept all"), button:has-text("모두 동의"), button:has-text("동의")'
  );
  if ((await consent.count()) > 0) {
    await consent.first().click({ timeout: 3000 }).catch(() => undefined);
    await sleep(500);
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

/**
 * @param {import('playwright').Page} page
 */
async function extractPhotoFromOpenPanel(page, selectors) {
  await sleep(1500);

  for (const selector of selectors) {
    const locator = page.locator(selector);
    const count = await locator.count().catch(() => 0);
    for (let i = 0; i < Math.min(count, 8); i += 1) {
      const src = await locator.nth(i).getAttribute("src").catch(() => null);
      if (isUsablePhotoUrl(src)) return src;
    }
  }

  const evaluated = await page
    .evaluate(() => {
      const imgs = [...document.querySelectorAll("img[src*='googleusercontent'], img[src*='pstatic.net']")];
      const ranked = imgs
        .map((img) => ({
          src: img.getAttribute("src"),
          area: (img.naturalWidth || img.width || 0) * (img.naturalHeight || img.height || 0),
        }))
        .filter((item) => item.src && item.area >= 10_000)
        .sort((a, b) => b.area - a.area);
      return ranked[0]?.src ?? null;
    })
    .catch(() => null);

  return isUsablePhotoUrl(evaluated) ? evaluated : null;
}

/**
 * @param {import('playwright').Page} page
 */
async function extractGooglePlacePhoto(page) {
  return extractPhotoFromOpenPanel(page, GOOGLE_PHOTO_SELECTORS);
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

  for (let i = 0; i < Math.min(count, 3); i += 1) {
    await results.nth(i).click({ timeout: 10000 });
    const photo = await extractPhotoFromOpenPanel(page, GOOGLE_PHOTO_SELECTORS);
    if (photo) return photo;
    await page.keyboard.press("Escape").catch(() => undefined);
    await sleep(600);
  }

  return null;
}

/**
 * @param {import('playwright').Page} page
 * @param {string} searchQuery
 */
async function fetchNaverImageSearchPhoto(page, searchQuery) {
  const url = `https://search.naver.com/search.naver?where=image&query=${encodeURIComponent(searchQuery)}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(2000);

  const selectors = [
    'img[src*="search.pstatic.net"]',
    'img[src*="ldb-phinf.pstatic.net"]',
    'div.image_tile img',
    'img._img',
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector);
    const count = await locator.count().catch(() => 0);
    for (let i = 0; i < Math.min(count, 6); i += 1) {
      const src = await locator.nth(i).getAttribute("src").catch(() => null);
      if (isUsablePhotoUrl(src)) return src;
    }
  }

  return null;
}

/**
 * @param {import('playwright').Page} page
 * @param {string} searchQuery
 */
async function fetchNaverMapPhoto(page, searchQuery) {
  const url = `https://map.naver.com/v5/search/${encodeURIComponent(searchQuery)}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(3000);

  const frame = page.frameLocator('iframe[id="searchIframe"]').first();
  const inFrame = (await frame.locator("body").count().catch(() => 0)) > 0;

  const resultLink = inFrame
    ? frame.locator('a[href*="/entry/place"], a[class*="place_bluelink"]').first()
    : page.locator('a[href*="/entry/place"], a[class*="place_bluelink"]').first();

  if ((await resultLink.count()) === 0) return null;

  await resultLink.click({ timeout: 10000 }).catch(() => null);
  await sleep(2500);

  const photo = await extractPhotoFromOpenPanel(page, NAVER_PHOTO_SELECTORS);
  if (photo) return photo;

  if (inFrame) {
    for (const selector of NAVER_PHOTO_SELECTORS) {
      const locator = frame.locator(selector);
      const count = await locator.count().catch(() => 0);
      for (let i = 0; i < Math.min(count, 5); i += 1) {
        const src = await locator.nth(i).getAttribute("src").catch(() => null);
        if (isUsablePhotoUrl(src)) return src;
      }
    }
  }

  return null;
}

/**
 * @param {import('playwright').Page} page
 * @param {string} searchQuery
 */
async function fetchPlacePhoto(page, searchQuery) {
  const hasHangul = /[가-힣]/.test(searchQuery);

  if (hasHangul) {
    const naverImage = await fetchNaverImageSearchPhoto(page, searchQuery).catch(() => null);
    if (naverImage) return { imageUrl: naverImage, source: "naver-image" };

    const naverPhoto = await fetchNaverMapPhoto(page, searchQuery).catch(() => null);
    if (naverPhoto) return { imageUrl: naverPhoto, source: "naver" };
  }

  const googlePhoto = await fetchGoogleMapsPhoto(page, searchQuery).catch(() => null);
  if (googlePhoto) return { imageUrl: googlePhoto, source: "google" };

  if (!hasHangul) {
    const naverImage = await fetchNaverImageSearchPhoto(page, searchQuery).catch(() => null);
    if (naverImage) return { imageUrl: naverImage, source: "naver-image" };
  }

  return null;
}

module.exports = {
  fetchPlacePhoto,
  fetchGoogleMapsPhoto,
  fetchNaverMapPhoto,
  fetchNaverImageSearchPhoto,
  extractGooglePlacePhoto,
  isUsablePhotoUrl,
};
