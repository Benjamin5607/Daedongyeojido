#!/usr/bin/env node
/**
 * Photo-based Emily travel illustration for social packs (img2img).
 *
 * Product direction:
 *   1. Naver/POI photo is the place base (source.jpg)
 *   2. Generate image.jpg by conditioning on that photo + Emily + Pixar travel style
 *   3. If no img2img provider works → image.jpg = POI photo; image-prompt.txt for manual tools
 *
 * Providers (img2img only — no pure T2I inventing fake beaches):
 *   1. NVIDIA FLUX.1-Kontext-dev when NVIDIA_API_KEY is set
 *      POST https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-kontext-dev
 *   2. Optional Pollinations Kontext when SOCIAL_IMAGE_FALLBACK=kontext
 *      (needs a public image URL — media-proxy / source URL)
 *   Default SOCIAL_IMAGE_FALLBACK=none (POI photo only)
 *
 * Character reference: scripts/social/assets/emily-reference.png
 */
const fs = require("fs");
const path = require("path");
const {
  resolveEnglishName,
  resolveNameKo,
  resolveDescription,
  mirroredImageUrl,
} = require("./placeUtils");

const ASSETS_DIR = path.join(__dirname, "assets");
const EMILY_REFERENCE = path.join(ASSETS_DIR, "emily-reference.png");

const NVIDIA_KONTEXT_URL =
  process.env.NVIDIA_KONTEXT_API_URL ||
  "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-kontext-dev";

/** @deprecated kept for callers / env docs — pure T2I is no longer the default path */
const NVIDIA_IMAGE_URL =
  process.env.NVIDIA_IMAGE_API_URL ||
  "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell";

const POLLINATIONS_BASE =
  process.env.POLLINATIONS_IMAGE_URL ||
  "https://image.pollinations.ai/prompt";

const PROMPT_VERSION = 5;

const EMILY_CHARACTER = [
  "Emily, a cute bright cheerful Pixar-style 3D animated young woman traveler,",
  "voluminous curly golden-blonde hair, large bright blue eyes,",
  "thick perfectly round black-rimmed glasses, clear symmetrical human female face,",
  "friendly joyful expression, stylized cute proportions, casual travel outfit",
].join(" ");

const COMPOSITION = [
  "medium-wide cinematic travel frame",
  "recognizable place from the reference photo fills about 55 to 70 percent of the frame",
  "Emily clearly visible at about 20 to 35 percent of frame height",
  "full body or three-quarter figure in foreground or mid-ground",
  "character readable but smaller than the landscape",
  "glasses and curly blonde hair visible",
].join(", ");

const STYLE = [
  "restyle as a polished bright Pixar / modern 3D animation film still",
  "cheerful cinematic travel illustration, vibrant natural colors",
  "soft sunny cinematic lighting, clear readable details",
  "Instagram-ready vertical 4:5 when possible, no text, no watermark, no logo, no UI chrome",
].join(", ");

const AVOID = [
  "Avoid: inventing a different beach or country, tropical karst lagoons,",
  "photorealistic ID photo, passport photo, portrait headshot, selfie,",
  "extreme close-up face, giant face, tiny distant ant-sized figure, silhouette only,",
  "deformed face, melted face, mutated face, blurry face, asymmetric eyes,",
  "extra limbs, gloomy horror mood, dark horror atmosphere, uncanny valley,",
  "ghostly translucent person, low quality",
].join(" ");

const NEGATIVE_PROMPT = [
  "different place, tropical karst, white sand lagoon,",
  "portrait, headshot, selfie, extreme close-up, ID photo,",
  "tiny distant figure, silhouette only, ant-sized person,",
  "deformed face, melted face, mutated, blurry face, asymmetric eyes,",
  "gloomy horror, ghost, dark horror mood, extra limbs, watermark, text, logo",
].join(" ");

function socialImageGenOn() {
  const flag = (process.env.SOCIAL_IMAGE_GEN || "1").toLowerCase();
  return !(flag === "0" || flag === "false" || flag === "off");
}

/** @deprecated use socialImageGenOn — NVIDIA key required for AI illustration */
function imageGenEnabled() {
  return socialImageGenOn() && Boolean(process.env.NVIDIA_API_KEY);
}

/**
 * Fallback img2img provider. Default: none (POI photo only).
 * Set SOCIAL_IMAGE_FALLBACK=kontext to try Pollinations Kontext img2img.
 */
function fallbackProvider() {
  const raw = (process.env.SOCIAL_IMAGE_FALLBACK || "none").toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off" || raw === "none" || raw === "") {
    return null;
  }
  if (raw === "pollinations" || raw === "t2i") {
    // Pure T2I is disabled — do not invent places.
    console.warn(
      "  · SOCIAL_IMAGE_FALLBACK=pollinations/t2i ignored (pure T2I disabled); use kontext or none"
    );
    return null;
  }
  if (raw === "kontext" || raw === "pollinations-kontext") return "kontext";
  return raw;
}

function maxAttempts() {
  const n = Number(process.env.SOCIAL_IMAGE_RETRIES);
  if (Number.isFinite(n) && n >= 1) return Math.min(5, Math.floor(n));
  return 2;
}

function themeSceneHint(theme) {
  switch (theme) {
    case "k-food":
      return "Korean restaurant or street-food setting";
    case "hallyu":
      return "K-drama / Hallyu landmark setting in Korea";
    case "k-beauty":
      return "Korean beauty / fashion street setting";
    case "urban-nature":
      return "Korean coast or outdoor overlook";
    case "k-culture":
      return "Korean heritage / temple / traditional setting";
    default:
      return "Korean travel destination";
  }
}

/**
 * Keyword → concrete visual place cues.
 * @param {object} place
 * @returns {string[]}
 */
function placeKeywordHints(place) {
  const nameEn = resolveEnglishName(place);
  const nameKo = resolveNameKo(place);
  const desc =
    resolveDescription(place, "en") ||
    resolveDescription(place, "ko") ||
    "";
  const region = [place.region?.district, place.region?.city, place.region?.province]
    .filter(Boolean)
    .join(" ");
  const blob = [
    place.slug,
    nameEn,
    nameKo,
    desc,
    region,
    place.theme,
    place.trend?.label,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hints = [];
  const has = (...keys) => keys.some((k) => blob.includes(k.toLowerCase()));

  if (
    has(
      "mongdol",
      "몽돌",
      "pebble",
      "cobble",
      "흑진주",
      "black-pebble",
      "black pebble"
    )
  ) {
    hints.push(
      "black pebble beach, dark round mongdol cobble shore (keep pebbles from the photo, NOT sand)",
      "rocky Geoje Korea coastline with gentle green hills",
      "calm emerald-blue Korean sea"
    );
    if (has("geoje", "거제", "gyeongnam", "경남", "hakdong", "학동")) {
      hints.push("Hakdong / Geoje Island Korea — keep this coastline, not tropical Southeast Asia");
    }
  } else if (has("beach", "해변", "해수욕", "coast", "해안", "바다")) {
    hints.push("Korean coastal beach matching the reference photo shoreline");
  }

  if (has("temple", "사찰", "절", "암자")) {
    hints.push("Korean Buddhist temple details from the photo");
  }
  if (has("hanok", "한옥", "palace", "궁")) {
    hints.push("traditional Korean architecture from the photo");
  }
  if (has("market", "시장", "포장마차")) {
    hints.push("Korean market / food-stall street from the photo");
  }
  if (has("harbor", "port", "항구", "포구")) {
    hints.push("Korean harbor / waterfront from the photo");
  }
  if (has("hill", "언덕", "전망", "windy")) {
    hints.push("Korean coastal hill overlook from the photo");
  }
  if (has("oyster", "굴", "grill", "구이", "ssambap", "쌈밥", "restaurant", "맛집")) {
    hints.push("Korean restaurant / food setting from the photo");
  }

  return hints;
}

function formatAddress(address) {
  if (!address) return "";
  if (typeof address === "string") return address.trim();
  if (typeof address === "object") {
    const pick =
      address.en ||
      address.ko ||
      Object.values(address).find((v) => typeof v === "string" && v.trim());
    return pick ? String(pick).trim() : "";
  }
  return "";
}

function seedFromSlug(slug) {
  const s = `${PROMPT_VERSION}:${slug || "place"}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 2147483647 || 1;
}

function abortAfter(ms, label) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => {
    try {
      ctrl.abort();
    } catch {
      /* ignore */
    }
  }, ms);
  if (typeof timer.unref === "function") timer.unref();
  return {
    signal: ctrl.signal,
    clear: () => clearTimeout(timer),
    timedOutMessage: `${label} timed out after ${ms}ms`,
  };
}

function mimeFromBuffer(buf) {
  if (buf?.[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf?.[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (
    buf?.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return "image/jpeg";
}

function toDataUrl(buf) {
  const mime = mimeFromBuffer(buf);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/**
 * Img2img edit instruction: keep the photo's place, restyle + add Emily.
 * @param {object} place
 * @param {{ hasSourcePhoto?: boolean }} [opts]
 */
function buildEmilyPrompt(place, opts = {}) {
  const nameEn = resolveEnglishName(place);
  const nameKo = resolveNameKo(place);
  const desc =
    resolveDescription(place, "en") ||
    resolveDescription(place, "ko") ||
    "";
  const region = [place.region?.district, place.region?.city, place.region?.province]
    .filter(Boolean)
    .join(", ");
  const placeLabel =
    nameKo && nameKo !== nameEn ? `${nameEn} / ${nameKo}` : nameEn;
  const hints = placeKeywordHints(place);
  const addressText = formatAddress(place.address);

  const lines = [
    opts.hasSourcePhoto
      ? "Image-to-image edit of the attached real place photo (Naver/POI)."
      : "Travel illustration of this Korean place.",
    "Keep the SAME place layout, landmarks, shoreline, terrain materials, and viewpoint from the reference photo — do not invent a different location.",
    `Place: ${placeLabel} in ${region || "Korea"}.`,
    themeSceneHint(place.theme),
    ...hints,
    desc
      ? `Place description cues: ${String(desc).replace(/\s+/g, " ").trim().slice(0, 220)}`
      : "",
    addressText ? `Near: ${addressText}` : "",
    STYLE,
    COMPOSITION,
    `Add traveler: ${EMILY_CHARACTER}.`,
    "She stands or walks naturally in the mid-ground of this same place so the location stays recognizable.",
    AVOID,
  ];

  return lines.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

/** Short img2img instruction for URL-based Kontext. */
function buildEmilyPromptShort(place) {
  const nameEn = resolveEnglishName(place);
  const region = [place.region?.district, place.region?.province]
    .filter(Boolean)
    .join(", ");
  const hints = placeKeywordHints(place)
    .slice(0, 2)
    .map((h) => h.replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(", ");

  return [
    `Edit this real photo of ${nameEn}, ${region || "Korea"} into a bright Pixar 3D animated travel still`,
    "keep the same place layout landmarks shoreline and ground materials from the photo",
    hints,
    "add cute blonde curly Emily with thick round black glasses clearly visible mid-ground about 25-30 percent frame height",
    "cheerful polished CGI animation, soft sunny light, medium-wide frame",
    "no different beach, no tropical lagoon, no headshot, no tiny ant figure, no melted face, no gloomy horror, no text",
  ]
    .filter(Boolean)
    .join(", ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);
}

function looksLikeUsableImage(buf) {
  if (!buf || buf.length < 8_000) return false;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng =
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isWebp =
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP";
  return isJpeg || isPng || isWebp;
}

function extractImageBuffer(body) {
  if (!body || typeof body !== "object") return null;

  const artifacts = body.artifacts;
  if (Array.isArray(artifacts)) {
    for (const art of artifacts) {
      const b64 = art?.base64 || art?.b64_json;
      if (typeof b64 === "string" && b64.length > 100) {
        return Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ""), "base64");
      }
    }
  }

  const data = body.data;
  if (Array.isArray(data)) {
    for (const item of data) {
      const b64 = item?.b64_json || item?.base64;
      if (typeof b64 === "string" && b64.length > 100) {
        return Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ""), "base64");
      }
    }
  }

  for (const key of ["image", "b64_json", "base64"]) {
    const val = body[key];
    if (typeof val === "string" && val.length > 100) {
      return Buffer.from(val.replace(/^data:image\/\w+;base64,/, ""), "base64");
    }
  }

  return null;
}

/**
 * Pick nearest supported FLUX Kontext dimension.
 * @param {number} n
 * @param {number[]} allowed
 */
function nearestDim(n, allowed) {
  let best = allowed[0];
  let bestDist = Math.abs(n - best);
  for (const a of allowed) {
    const d = Math.abs(n - a);
    if (d < bestDist) {
      best = a;
      bestDist = d;
    }
  }
  return best;
}

/**
 * NVIDIA FLUX.1-Kontext-dev image edit (img2img).
 * @param {string} prompt
 * @param {Buffer} sourceBuf
 * @param {{ seed?: number }} [opts]
 */
async function generateWithNvidiaKontext(prompt, sourceBuf, opts = {}) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA Kontext requires NVIDIA_API_KEY");
  if (!looksLikeUsableImage(sourceBuf)) {
    throw new Error("NVIDIA Kontext requires a usable source image buffer");
  }

  const widths = [
    672, 688, 720, 752, 800, 832, 880, 944, 1024, 1104, 1184, 1248, 1328, 1392,
    1456, 1504, 1568,
  ];
  const heights = [
    672, 688, 720, 752, 800, 832, 880, 944, 1024, 1104, 1184, 1248, 1328, 1392,
    1456, 1504, 1568,
  ];
  const width = nearestDim(Number(process.env.NVIDIA_IMAGE_WIDTH) || 896, widths);
  const height = nearestDim(Number(process.env.NVIDIA_IMAGE_HEIGHT) || 1152, heights);
  const steps = Math.min(
    50,
    Math.max(20, Number(process.env.NVIDIA_KONTEXT_STEPS) || 30)
  );
  const cfg = Number(process.env.NVIDIA_KONTEXT_CFG) || 3.5;
  const seed = opts.seed ?? 0;
  const timeoutMs = Number(process.env.NVIDIA_IMAGE_TIMEOUT_MS) || 120_000;
  const { signal, clear, timedOutMessage } = abortAfter(timeoutMs, "NVIDIA Kontext");

  const imageDataUrl = toDataUrl(sourceBuf);

  let response;
  try {
    response = await fetch(NVIDIA_KONTEXT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image: imageDataUrl,
        width,
        height,
        seed,
        steps,
        cfg_scale: cfg,
        aspect_ratio: "match_input_image",
        samples: 1,
      }),
      signal,
    });
  } catch (err) {
    const msg =
      err?.name === "AbortError" || signal.aborted
        ? timedOutMessage
        : `NVIDIA Kontext fetch failed: ${String(err.message || err)}`;
    throw new Error(msg);
  } finally {
    clear();
  }

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(
      `NVIDIA Kontext API ${response.status}: ${bodyText.slice(0, 400)}`
    );
  }

  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new Error("NVIDIA Kontext returned non-JSON body");
  }

  const buf = extractImageBuffer(body);
  if (!looksLikeUsableImage(buf)) {
    throw new Error("NVIDIA Kontext returned no usable image payload");
  }

  return {
    buf,
    provider: "nvidia-flux-kontext",
    model: "black-forest-labs/flux.1-kontext-dev",
    width,
    height,
  };
}

/**
 * Pollinations Kontext img2img (optional fallback). Needs a public image URL.
 * @param {string} shortPrompt
 * @param {string} imageUrl
 * @param {{ seed?: number; width?: number; height?: number }} [opts]
 */
async function generateWithPollinationsKontext(shortPrompt, imageUrl, opts = {}) {
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
    throw new Error("Pollinations Kontext requires a public http(s) image URL");
  }

  const width = opts.width || Number(process.env.SOCIAL_IMAGE_WIDTH) || 896;
  const height = opts.height || Number(process.env.SOCIAL_IMAGE_HEIGHT) || 1152;
  const seed = opts.seed ?? 0;
  const timeoutMs = Number(process.env.POLLINATIONS_TIMEOUT_MS) || 180_000;

  const qs = new URLSearchParams({
    model: "kontext",
    image: imageUrl,
    width: String(width),
    height: String(height),
    seed: String(seed),
    nologo: "true",
    r: String(Date.now()),
  });
  const url = `${POLLINATIONS_BASE}/${encodeURIComponent(shortPrompt)}?${qs}`;
  const { signal, clear, timedOutMessage } = abortAfter(
    timeoutMs,
    "Pollinations Kontext"
  );

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "image/*,*/*",
        "User-Agent": "DaedongyeojidoSocialExport/1.0",
      },
      redirect: "follow",
      signal,
    });
  } catch (err) {
    const msg =
      err?.name === "AbortError" || signal.aborted
        ? timedOutMessage
        : `Pollinations Kontext fetch failed: ${String(err.message || err)}`;
    throw new Error(msg);
  } finally {
    clear();
  }

  if (!response.ok) {
    throw new Error(`Pollinations Kontext ${response.status}`);
  }
  const buf = Buffer.from(await response.arrayBuffer());
  if (!looksLikeUsableImage(buf)) {
    throw new Error("Pollinations Kontext returned empty or invalid image");
  }

  return {
    buf,
    provider: "pollinations-kontext",
    model: "kontext",
    width,
    height,
  };
}

/**
 * Resolve a public URL for Kontext-style APIs that cannot take local bytes.
 * @param {object} place
 * @param {{ sourceImageUrl?: string|null; slug?: string }} opts
 */
function resolvePublicSourceUrl(place, opts = {}) {
  if (opts.sourceImageUrl && /^https?:\/\//i.test(opts.sourceImageUrl)) {
    return opts.sourceImageUrl;
  }
  const slug = opts.slug || place.slug;
  if (slug) return mirroredImageUrl(slug);
  return null;
}

/**
 * Write image-prompt.txt for manual img2img tools.
 */
function writeImagePromptFile(packAbs, prompt, opts = {}) {
  const refNote = opts.referenceHint
    ? [
        "",
        "WORKFLOW (recommended):",
        "  Image-to-image / reference edit from source.jpg (real Naver/POI photo).",
        "  Keep the same place layout, shoreline, pebbles/terrain, and landmarks.",
        "  Restyle as bright Pixar/3D travel illustration and add Emily.",
        "",
        "Composition lock:",
        "  - Place ~55–70% of frame (from the photo)",
        "  - Emily ~20–35% frame height, full/3-4 body, mid-ground",
        "  - Not a headshot / selfie; not an ant-sized speck",
        "",
        "Character reference (repo):",
        "  scripts/social/assets/emily-reference.png",
        "  Blonde curly hair, thick round black glasses, cute Pixar face",
        "",
        "Negative / avoid:",
        `  ${NEGATIVE_PROMPT}`,
        "",
      ].join("\n")
    : "\n";

  const text = [
    "Emily travel illustration prompt (img2img from source.jpg)",
    "=========================================================",
    "",
    "Use NVIDIA FLUX Kontext, Midjourney --cref/--sref, or similar img2img.",
    "Base image: source.jpg in this pack (real place photo).",
    refNote,
    prompt,
    "",
  ].join("\n");

  fs.writeFileSync(path.join(packAbs, "image-prompt.txt"), text, "utf8");
}

/**
 * Try img2img providers; caller keeps POI photo when this returns ok:false.
 *
 * @param {object} place
 * @param {{
 *   packAbs?: string;
 *   slug?: string;
 *   sourceImageUrl?: string|null;
 *   sourceBuf?: Buffer|null;
 * }} [opts]
 */
async function generateEmilyImage(place, opts = {}) {
  const sourceBuf = opts.sourceBuf || null;
  const hasSourcePhoto = Boolean(sourceBuf && looksLikeUsableImage(sourceBuf));
  const prompt = buildEmilyPrompt(place, { hasSourcePhoto: true });

  if (opts.packAbs) {
    writeImagePromptFile(opts.packAbs, prompt, { referenceHint: true });
  }

  if (!socialImageGenOn()) {
    return {
      ok: false,
      skipped: true,
      reason: "SOCIAL_IMAGE_GEN disabled",
      prompt,
    };
  }

  if (!hasSourcePhoto) {
    return {
      ok: false,
      skipped: true,
      reason: "no POI source photo for img2img (refusing pure T2I)",
      prompt,
    };
  }

  const baseSeed = seedFromSlug(
    opts.slug || place.slug || resolveEnglishName(place)
  );
  const attempts = maxAttempts();
  const errors = [];
  const hasNvidia = Boolean(process.env.NVIDIA_API_KEY);
  const fallback = fallbackProvider();
  const publicUrl = resolvePublicSourceUrl(place, {
    sourceImageUrl: opts.sourceImageUrl || null,
    slug: opts.slug || place.slug,
  });

  for (let attempt = 0; attempt < attempts; attempt++) {
    const seed = (baseSeed + attempt * 9973) % 2147483647 || 1;
    const editPrompt =
      attempt === 0
        ? prompt
        : `${prompt} Strongly preserve the reference photo place materials. Emily mid-ground ~28% frame height with visible round glasses, bright cheerful Pixar style.`;

    if (hasNvidia) {
      try {
        const result = await generateWithNvidiaKontext(editPrompt, sourceBuf, {
          seed,
        });
        if (attempt > 0) {
          console.log(`  · NVIDIA Kontext ok on retry ${attempt + 1}`);
        }
        return { ok: true, prompt, attempts: attempt + 1, ...result };
      } catch (err) {
        errors.push(
          `nvidia-kontext@${attempt + 1}: ${String(err.message || err).slice(0, 160)}`
        );
        console.warn(
          `  · NVIDIA Kontext failed (try ${attempt + 1}/${attempts}): ${err.message}`
        );
      }
    }

    if (fallback === "kontext") {
      try {
        const short = buildEmilyPromptShort(place);
        const result = await generateWithPollinationsKontext(short, publicUrl, {
          seed,
        });
        if (attempt > 0) {
          console.log(`  · Pollinations Kontext ok on retry ${attempt + 1}`);
        }
        return { ok: true, prompt, attempts: attempt + 1, ...result };
      } catch (err) {
        errors.push(
          `kontext@${attempt + 1}: ${String(err.message || err).slice(0, 160)}`
        );
        console.warn(
          `  · Pollinations Kontext failed (try ${attempt + 1}/${attempts}): ${err.message}`
        );
      }
    }
  }

  if (!hasNvidia && !fallback) {
    return {
      ok: false,
      skipped: true,
      reason: "no NVIDIA_API_KEY; SOCIAL_IMAGE_FALLBACK=none",
      prompt,
    };
  }

  return {
    ok: false,
    reason: errors.join(" | ") || "no img2img provider succeeded",
    prompt,
  };
}

module.exports = {
  ASSETS_DIR,
  EMILY_REFERENCE,
  EMILY_CHARACTER,
  COMPOSITION,
  NEGATIVE_PROMPT,
  PROMPT_VERSION,
  NVIDIA_IMAGE_URL,
  NVIDIA_KONTEXT_URL,
  imageGenEnabled,
  socialImageGenOn,
  placeKeywordHints,
  buildEmilyPrompt,
  buildEmilyPromptShort,
  generateWithNvidiaKontext,
  generateWithPollinationsKontext,
  generateEmilyImage,
  writeImagePromptFile,
  seedFromSlug,
  extractImageBuffer,
  looksLikeUsableImage,
  resolvePublicSourceUrl,
  toDataUrl,
};
