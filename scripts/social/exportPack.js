#!/usr/bin/env node
/**
 * Export upload-ready social packs for manual Instagram/Facebook posting.
 *
 * Each pack under social-exports/<date>-<slug>/:
 *   image.jpg (or .png / .webp) — Emily illustration when NVIDIA_API_KEY works
 *                                 (Kontext img2img or vision+FLUX.1-dev); else POI photo
 *   source.jpg — original Naver/POI photo (always when download succeeds)
 *   image-prompt.txt — img2img prompt from source.jpg (always written)
 *   caption.txt
 *   meta.json
 *   UPLOAD_NOTES.txt
 *
 * Usage:
 *   npm run social:export
 *   npm run social:export -- --id=sq_...
 *   npm run social:export -- --limit=4 --force
 */
const fs = require("fs");
const path = require("path");
const {
  ROOT,
  loadPlaces,
  resolveEnglishName,
  resolveNameKo,
  resolveDescription,
} = require("./placeUtils");
const { loadQueue, updateItem, findItem } = require("./queue");
const { buildHashtags } = require("./composeCaption");
const { generateEmilyImage } = require("./generateEmilyImage");

const EXPORTS_ROOT = path.join(ROOT, "social-exports");

const THEME_FALLBACK = {
  "k-food":
    "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=1200&q=80",
  hallyu:
    "https://images.unsplash.com/photo-1538485399082-712990db4820?w=1200&q=80",
  "k-beauty":
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5bd15?w=1200&q=80",
  "k-culture":
    "https://images.unsplash.com/photo-1583417319070-4a3b5fffe6f6?w=1200&q=80",
  "urban-nature":
    "https://images.unsplash.com/photo-1587735247366-c6662a32a3a0?w=1200&q=80",
};

const SLOT_POST_TIME_KST = {
  morning: "11:00",
  evening: "19:00",
};

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq === -1) out[arg.slice(2)] = true;
    else out[arg.slice(2, eq)] = arg.slice(eq + 1);
  }
  return out;
}

function dateStamp(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function suggestedPostAt(slot, createdAt) {
  const base = createdAt ? new Date(createdAt) : new Date();
  const time = SLOT_POST_TIME_KST[slot] || SLOT_POST_TIME_KST.morning;
  const [hh, mm] = time.split(":").map(Number);
  // Store as KST wall-clock suggestion (UTC+9)
  const y = base.getUTCFullYear();
  const mo = String(base.getUTCMonth() + 1).padStart(2, "0");
  const da = String(base.getUTCDate()).padStart(2, "0");
  return {
    timezone: "Asia/Seoul",
    localTime: `${y}-${mo}-${da} ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
    slot: slot || "morning",
  };
}

function buildAltText(place) {
  const nameEn = resolveEnglishName(place);
  const nameKo = resolveNameKo(place);
  const theme = place.theme ? String(place.theme).replace(/-/g, " ") : "Korea travel";
  const region = [place.region?.district, place.region?.province]
    .filter(Boolean)
    .join(", ");
  const parts = [
    `${nameKo}${nameKo !== nameEn ? ` (${nameEn})` : ""}`,
    region || null,
    theme,
  ].filter(Boolean);
  return parts.join(" — ").slice(0, 900);
}

function detectImageExt(buf, contentType, urlPath) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return ".jpg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return ".png";
  }
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return ".webp";
  }
  const ct = (contentType || "").toLowerCase();
  if (/image\/jpe?g/.test(ct)) return ".jpg";
  if (/image\/png/.test(ct)) return ".png";
  if (/image\/webp/.test(ct)) return ".webp";
  if (/\.png(\?|$)/i.test(urlPath || "")) return ".png";
  if (/\.webp(\?|$)/i.test(urlPath || "")) return ".webp";
  if (/\.(jpe?g)(\?|$)/i.test(urlPath || "")) return ".jpg";
  return ".jpg";
}

async function downloadImage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "DaedongyeojidoSocialExport/1.0 (+https://github.com; manual upload pack)",
      Accept: "image/*,*/*",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Image fetch ${res.status} for ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100) throw new Error(`Image too small (${buf.length} bytes)`);
  const contentType = res.headers.get("content-type") || "";
  let pathname = "";
  try {
    pathname = new URL(url).pathname;
  } catch {
    /* ignore */
  }
  const ext = detectImageExt(buf, contentType, pathname);
  return { buf, ext, contentType, sourceUrl: url };
}

async function resolveAndDownloadImage(item, place) {
  const candidates = [
    item.imageUrl,
    place?.imageUrl,
    place?.theme ? THEME_FALLBACK[place.theme] : null,
    THEME_FALLBACK["k-culture"],
  ].filter(Boolean);

  let lastErr;
  for (const url of candidates) {
    try {
      return await downloadImage(url);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error(`No image for ${item.slug}`);
}

function packDirName(item) {
  const stamp = dateStamp(item.createdAt ? new Date(item.createdAt) : new Date());
  const slug = String(item.slug || "place")
    .replace(/[^a-z0-9-_]/gi, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return `${stamp}-${slug}`;
}

function writeUploadNotes({
  isAiGenerated,
  imageAiGenerated,
  captionAiGenerated,
  suggested,
  imageFile,
}) {
  const lines = [
    "Manual upload checklist (Instagram / Facebook)",
    "============================================",
    "",
    `1. Open ${imageFile} and upload as a feed photo.`,
    "2. Paste caption.txt into the caption field (KO block first, then EN + hashtags).",
    "3. Set alt text from meta.json → alt_text (accessibility).",
    `4. Suggested post time (KST): ${suggested.localTime} (${suggested.slot} slot).`,
    "",
  ];
  if (isAiGenerated) {
    const bits = [];
    if (imageAiGenerated) {
      bits.push("Emily travel illustration (img2img from source.jpg)");
    }
    if (captionAiGenerated) bits.push("caption (NVIDIA NIM)");
    lines.push(
      "AI disclosure:",
      `  AI-assisted: ${bits.join(" + ") || "yes"} (is_ai_generated: true).`,
      "  If Meta/IG shows an “AI-generated” checkbox, check it when posting.",
      ""
    );
  } else {
    lines.push(
      "AI disclosure:",
      "  Feed image is the real Naver/POI photo (image_ai_generated: false).",
      "  Optional Emily illustration: run img2img from source.jpg using image-prompt.txt",
      "  (NVIDIA FLUX Kontext / Midjourney / etc.). Pure text-to-image is not recommended.",
      ""
    );
  }
  lines.push(
    "5. After posting, optionally mark the queue item published locally,",
    "   or leave it as draft/exported for your own tracking.",
    ""
  );
  return lines.join("\n");
}

/**
 * POI photo → source.jpg; Emily illustration → image.jpg when NVIDIA_API_KEY works.
 * Always writes image-prompt.txt into the pack.
 */
async function resolvePackVisual(item, place, packAbs) {
  let source = null;
  try {
    source = await resolveAndDownloadImage(item, place);
  } catch (err) {
    console.warn(`  · POI image unavailable for ${item.slug}: ${err.message}`);
  }

  if (!source) {
    throw new Error(`No image for ${item.slug}`);
  }

  const sourceExt = source.ext === ".jpg" ? ".jpg" : source.ext;
  const sourceFile = `source${sourceExt}`;
  fs.writeFileSync(path.join(packAbs, sourceFile), source.buf);

  const emily = await generateEmilyImage(place || { slug: item.slug, name: item.slug }, {
    packAbs,
    slug: item.slug,
    sourceImageUrl: source.sourceUrl || item.imageUrl || place?.imageUrl || null,
    sourceBuf: source.buf,
  });

  if (emily.ok && emily.buf) {
    const genExt = detectImageExt(emily.buf, "", "");
    const imageFile = genExt === ".jpg" ? "image.jpg" : `image${genExt}`;
    fs.writeFileSync(path.join(packAbs, imageFile), emily.buf);
    console.log(
      `  · Emily illustration via ${emily.provider} (POI base ${sourceFile} → ${imageFile})`
    );
    return {
      imageFile,
      imageSourceUrl: null,
      imageContentType: genExt === ".png" ? "image/png" : "image/jpeg",
      imageProvider: emily.provider,
      imageModel: emily.model || null,
      imageAiGenerated: true,
      sourceSaved: true,
      prompt: emily.prompt,
    };
  }

  if (emily.reason && !emily.skipped) {
    console.error(
      `  ✗ Emily illustration FAILED — NOT pretending this is AI. Falling back to raw POI photo.`
    );
    console.error(`      reason: ${emily.reason.slice(0, 500)}`);
  } else if (emily.skipped) {
    console.error(
      `  ✗ Emily illustration SKIPPED (${emily.reason}) — image.jpg will be the raw POI photo (image_ai_generated: false).`
    );
  }

  const imageFile = source.ext === ".jpg" ? "image.jpg" : `image${source.ext}`;
  fs.writeFileSync(path.join(packAbs, imageFile), source.buf);
  console.log(
    `  · Pack image = POI photo fallback (${sourceFile} → ${imageFile}, image_ai_generated: false)`
  );
  return {
    imageFile,
    imageSourceUrl: source.sourceUrl,
    imageContentType: source.contentType || null,
    imageProvider: "poi-download",
    imageModel: null,
    imageAiGenerated: false,
    sourceSaved: true,
    prompt: emily.prompt,
  };
}

/**
 * Export one queue item to a pack directory.
 * @returns {{ packDir: string; relativeDir: string; imageFile: string }}
 */
async function exportOne(item, { force = false } = {}) {
  const places = loadPlaces();
  const place = places.find((p) => p.slug === item.slug) || null;

  const dirName = packDirName(item);
  const packAbs = path.join(EXPORTS_ROOT, dirName);
  const relativeDir = path.join("social-exports", dirName).replace(/\\/g, "/");

  if (fs.existsSync(packAbs) && !force && item.meta?.packDir === relativeDir) {
    console.log(`  · skip ${item.id} (already exported → ${relativeDir})`);
    return {
      packDir: packAbs,
      relativeDir,
      imageFile: item.meta?.imageFile || "image.jpg",
      skipped: true,
    };
  }

  fs.mkdirSync(packAbs, { recursive: true });

  const visual = await resolvePackVisual(item, place, packAbs);
  const imageFile = visual.imageFile;

  const caption = item.caption || "";
  fs.writeFileSync(path.join(packAbs, "caption.txt"), `${caption.trim()}\n`, "utf8");

  const captionAiGenerated = item.captionSource === "nvidia";
  const imageAiGenerated = Boolean(visual.imageAiGenerated);
  const isAiGenerated = captionAiGenerated || imageAiGenerated;
  const suggested = suggestedPostAt(item.slot, item.createdAt);
  const altBase = place
    ? buildAltText(place)
    : `${item.slug || "Korea travel place"}`;
  const altText = imageAiGenerated
    ? `Pixar-style travel illustration of ${altBase}, with Emily as a traveler in frame (based on real place photo)`.slice(
        0,
        900
      )
    : altBase;

  const hashtags = place
    ? buildHashtags(place, item.format || "place_card")
    : [];

  const meta = {
    queueId: item.id,
    slug: item.slug,
    theme: item.theme || place?.theme || null,
    format: item.format || "place_card",
    slot: item.slot || "morning",
    trend: place?.trend || null,
    captionSource: item.captionSource || "local",
    is_ai_generated: isAiGenerated,
    caption_ai_generated: captionAiGenerated,
    image_ai_generated: imageAiGenerated,
    imageProvider: visual.imageProvider,
    imageModel: visual.imageModel,
    ai_disclosure:
      "If posting AI-assisted images or captions, enable the platform AI-generated content label when available.",
    suggested_post: suggested,
    alt_text: altText,
    hashtags,
    imageFile,
    imageSourceUrl: visual.imageSourceUrl,
    imageContentType: visual.imageContentType || null,
    sourceImageSaved: visual.sourceSaved,
    emilyReference: "scripts/social/assets/emily-reference.png",
    placeName: place
      ? { ko: resolveNameKo(place), en: resolveEnglishName(place) }
      : null,
    descriptionEn: place ? resolveDescription(place, "en") : "",
    exportedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(packAbs, "meta.json"),
    `${JSON.stringify(meta, null, 2)}\n`,
    "utf8"
  );

  fs.writeFileSync(
    path.join(packAbs, "UPLOAD_NOTES.txt"),
    writeUploadNotes({
      isAiGenerated,
      imageAiGenerated,
      captionAiGenerated,
      suggested,
      imageFile,
    }),
    "utf8"
  );

  updateItem(item.id, {
    status: item.status === "published" ? item.status : "exported",
    mirroredImageUrl: item.mirroredImageUrl || null,
    meta: {
      ...(item.meta || {}),
      packDir: relativeDir,
      imageFile,
      is_ai_generated: isAiGenerated,
      image_ai_generated: imageAiGenerated,
      imageProvider: visual.imageProvider,
      exportedAt: meta.exportedAt,
      alt_text: altText,
    },
    error: null,
  });

  return { packDir: packAbs, relativeDir, imageFile, skipped: false };
}

/**
 * Export queue items (ids) or pending drafts/approved without packs.
 */
async function exportItems(opts = {}) {
  const force = Boolean(opts.force);
  const limit = Math.max(1, Number(opts.limit) || 20);
  let items;

  if (opts.id) {
    const one = findItem(opts.id);
    if (!one) throw new Error(`Queue item not found: ${opts.id}`);
    items = [one];
  } else if (opts.items && Array.isArray(opts.items)) {
    items = opts.items;
  } else {
    const queue = loadQueue();
    items = queue.items.filter((i) => {
      if (["published", "failed"].includes(i.status)) return false;
      if (force) return ["draft", "approved", "exported"].includes(i.status);
      if (i.status === "exported" && i.meta?.packDir) return false;
      return i.status === "draft" || i.status === "approved";
    });
  }

  items = items.slice(0, limit);
  if (items.length === 0) {
    console.log("No items to export.");
    return [];
  }

  fs.mkdirSync(EXPORTS_ROOT, { recursive: true });
  console.log(`Exporting ${items.length} pack(s) → social-exports/`);

  const results = [];
  for (const item of items) {
    try {
      const result = await exportOne(item, { force });
      if (!result.skipped) {
        console.log(`  ✓ ${item.id}  ${item.slug}  → ${result.relativeDir}/${result.imageFile}`);
      }
      results.push({ item, ...result });
    } catch (err) {
      console.error(`  ✗ ${item.id}  ${err.message}`);
      try {
        updateItem(item.id, {
          error: `export: ${String(err.message || err).slice(0, 400)}`,
        });
      } catch {
        /* ignore */
      }
      results.push({ item, error: err });
    }
  }

  const ok = results.filter((r) => !r.error).length;
  const fail = results.filter((r) => r.error).length;
  console.log(`Done. ok=${ok} fail=${fail}`);
  if (fail > 0) process.exitCode = 1;
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await exportItems({
    id: args.id || null,
    limit: args.limit,
    force: Boolean(args.force),
  });
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  EXPORTS_ROOT,
  exportOne,
  exportItems,
  packDirName,
  buildAltText,
};
