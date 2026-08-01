#!/usr/bin/env node
/**
 * Generate a blog-style Emily travel illustration for social packs.
 *
 * Primary: NVIDIA NIM FLUX.1-schnell (NVIDIA_API_KEY)
 *   POST https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell
 * Fallback: caller keeps Naver/POI photo and we still write image-prompt.txt
 *
 * Character reference (for docs / manual tools):
 *   scripts/social/assets/emily-reference.png
 */
const fs = require("fs");
const path = require("path");
const {
  resolveEnglishName,
  resolveNameKo,
  resolveDescription,
} = require("./placeUtils");

const ASSETS_DIR = path.join(__dirname, "assets");
const EMILY_REFERENCE = path.join(ASSETS_DIR, "emily-reference.png");

const NVIDIA_IMAGE_URL =
  process.env.NVIDIA_IMAGE_API_URL ||
  "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell";

const EMILY_CHARACTER = [
  "Emily: young woman with bright blonde voluminous curly coily hair,",
  "large bright blue eyes, thick round black-rimmed glasses,",
  "youthful expressive friendly face, slightly stylized cute proportions",
].join(" ");

const STYLE =
  "consistent Pixar / modern 3D animation film still, clean stylized render, soft cinematic lighting, vibrant natural colors, blog travel illustration, Instagram-ready vertical composition, no text, no watermark, no logo, no UI chrome";

function imageGenEnabled() {
  const flag = (process.env.SOCIAL_IMAGE_GEN || "1").toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  return Boolean(process.env.NVIDIA_API_KEY);
}

function themeSceneHint(theme) {
  switch (theme) {
    case "k-food":
      return "Korean restaurant or street-food atmosphere, delicious food on the table or stall";
    case "hallyu":
      return "K-drama / Hallyu filming-location vibe, photogenic landmark backdrop";
    case "k-beauty":
      return "stylish K-beauty / fashion district vibe, clean bright storefront energy";
    case "urban-nature":
      return "scenic Korea nature, coast, or urban park overlook, fresh outdoor air";
    case "k-culture":
      return "Korean heritage / temple / traditional cultural setting";
    default:
      return "authentic Korean travel destination atmosphere";
  }
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

/**
 * Deterministic seed from slug so re-exports of the same place stay similar.
 * @param {string} slug
 */
function seedFromSlug(slug) {
  const s = String(slug || "place");
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 2147483647 || 1;
}

/**
 * Build a detailed text prompt for Emily at this place.
 * @param {object} place
 * @param {{ sourceImageUrl?: string|null }} [opts]
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
  const theme = place.theme || "korea-travel";
  const trend = place.trend?.label ? `Trending angle: ${place.trend.label}.` : "";
  const addressText = formatAddress(place.address);
  const address = addressText ? `Near / at: ${addressText}.` : "";
  const poiVibe = opts.sourceImageUrl
    ? "Match the real place's POI photo vibe (architecture, colors, setting) without copying it literally."
    : "";

  const lines = [
    `Blog-style travel illustration of ${EMILY_CHARACTER}.`,
    `She is visiting ${nameKo}${nameKo !== nameEn ? ` (${nameEn})` : ""} in ${region || "Korea"}.`,
    `Theme: ${String(theme).replace(/-/g, " ")}. ${themeSceneHint(theme)}.`,
    desc ? `Place feel: ${desc.slice(0, 280)}` : "",
    address,
    trend,
    poiVibe,
    "Emily is clearly the focus — curious, joyful travel expression — standing or seated naturally in the scene.",
    "Outfit fits the destination (casual travel wear or culturally appropriate attire).",
    STYLE,
  ].filter(Boolean);

  return lines.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Extract base64 image bytes from NVIDIA GenAI response shapes.
 * @param {object} body
 * @returns {Buffer|null}
 */
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
 * Call NVIDIA FLUX.1-schnell text-to-image.
 * @param {string} prompt
 * @param {{ seed?: number }} [opts]
 * @returns {Promise<{ buf: Buffer; provider: string; model: string; width: number; height: number }>}
 */
async function generateWithNvidiaFlux(prompt, opts = {}) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA image gen requires NVIDIA_API_KEY");
  }

  // Portrait-ish for IG feed / blog hero (supported FLUX sizes)
  const width = Number(process.env.NVIDIA_IMAGE_WIDTH) || 896;
  const height = Number(process.env.NVIDIA_IMAGE_HEIGHT) || 1152;
  const steps = Math.min(4, Math.max(1, Number(process.env.NVIDIA_IMAGE_STEPS) || 4));
  const seed = opts.seed ?? 0;

  const response = await fetch(NVIDIA_IMAGE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      width,
      height,
      seed,
      steps,
      cfg_scale: 0,
      mode: "base",
      samples: 1,
    }),
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(
      `NVIDIA image API ${response.status}: ${bodyText.slice(0, 400)}`
    );
  }

  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new Error("NVIDIA image API returned non-JSON body");
  }

  const buf = extractImageBuffer(body);
  if (!buf || buf.length < 500) {
    throw new Error("NVIDIA image API returned no usable image payload");
  }

  return {
    buf,
    provider: "nvidia-flux-schnell",
    model: "black-forest-labs/flux.1-schnell",
    width,
    height,
  };
}

/**
 * Write image-prompt.txt (+ optional notes for manual Midjourney / etc.).
 * @param {string} packAbs
 * @param {string} prompt
 * @param {{ referenceHint?: boolean }} [opts]
 */
function writeImagePromptFile(packAbs, prompt, opts = {}) {
  const refNote = opts.referenceHint
    ? [
        "",
        "Character reference (repo):",
        "  scripts/social/assets/emily-reference.png",
        "Use the same Emily look: blonde voluminous curls, large blue eyes, thick round black glasses, Pixar/3D style.",
        "",
      ].join("\n")
    : "\n";

  const text = [
    "Emily travel illustration prompt",
    "================================",
    "",
    "Use this prompt in NVIDIA FLUX, Midjourney, or similar if auto-generation was skipped.",
    refNote,
    prompt,
    "",
  ].join("\n");

  fs.writeFileSync(path.join(packAbs, "image-prompt.txt"), text, "utf8");
}

/**
 * Try to generate an Emily illustration for a place.
 * Always writes image-prompt.txt when packAbs is provided.
 *
 * @param {object} place
 * @param {{
 *   packAbs?: string;
 *   slug?: string;
 *   sourceImageUrl?: string|null;
 * }} [opts]
 * @returns {Promise<{
 *   ok: boolean;
 *   skipped?: boolean;
 *   reason?: string;
 *   prompt: string;
 *   buf?: Buffer;
 *   provider?: string;
 *   model?: string;
 *   width?: number;
 *   height?: number;
 * }>}
 */
async function generateEmilyImage(place, opts = {}) {
  const prompt = buildEmilyPrompt(place, {
    sourceImageUrl: opts.sourceImageUrl || null,
  });

  if (opts.packAbs) {
    writeImagePromptFile(opts.packAbs, prompt, { referenceHint: true });
  }

  if (!imageGenEnabled()) {
    return {
      ok: false,
      skipped: true,
      reason: process.env.NVIDIA_API_KEY
        ? "SOCIAL_IMAGE_GEN disabled"
        : "NVIDIA_API_KEY not set",
      prompt,
    };
  }

  try {
    const seed = seedFromSlug(opts.slug || place.slug || resolveEnglishName(place));
    const result = await generateWithNvidiaFlux(prompt, { seed });
    return { ok: true, prompt, ...result };
  } catch (err) {
    return {
      ok: false,
      reason: String(err.message || err).slice(0, 400),
      prompt,
    };
  }
}

module.exports = {
  ASSETS_DIR,
  EMILY_REFERENCE,
  EMILY_CHARACTER,
  NVIDIA_IMAGE_URL,
  imageGenEnabled,
  buildEmilyPrompt,
  generateWithNvidiaFlux,
  generateEmilyImage,
  writeImagePromptFile,
  seedFromSlug,
  extractImageBuffer,
};
