#!/usr/bin/env node
/**
 * Publish approved queue items to Instagram + Facebook Page via Meta Graph API.
 *
 * DEPRECATED for the default workflow — prefer manual upload packs:
 *   npm run social:draft   → social-exports/<date>-<slug>/
 *   npm run social:export
 *   npm run social:open
 *
 * To still use the API path (requires META_* secrets):
 *   npm run social:publish -- --force-meta
 *   npm run social:publish -- --force-meta --dry-run
 */
const { listByStatus, updateItem } = require("./queue");
const { publishCrossPost } = require("./metaClient");
const { mirroredImageUrl } = require("./placeUtils");

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

function printManualDefaultMessage() {
  console.log(`
social:publish is gated — manual upload packs are the default.

  1. Generate packs:  npm run social:draft
                      (or npm run social:export)
  2. Open folder:     npm run social:open
  3. Upload image.jpg + paste caption.txt on Instagram / Facebook.

Meta Graph API publishing is optional / advanced. To force it:
  npm run social:publish -- --force-meta
  npm run social:publish -- --force-meta --dry-run

See docs/meta-setup.md
`.trim());
}

async function publishOne(item, { dryRun }) {
  const imageUrl = item.mirroredImageUrl || mirroredImageUrl(item.slug);
  if (!item.caption) throw new Error(`Missing caption for ${item.id}`);
  if (!imageUrl) throw new Error(`Missing image URL for ${item.id}`);

  if (dryRun) {
    console.log(`[dry-run] would publish ${item.id} → ${imageUrl}`);
    return { dryRun: true };
  }

  const result = await publishCrossPost({
    imageUrl,
    caption: item.caption,
  });

  updateItem(item.id, {
    status: "published",
    publishedAt: new Date().toISOString(),
    mirroredImageUrl: imageUrl,
    meta: {
      ...(item.meta || {}),
      igMediaId: result.ig?.mediaId || null,
      igContainerId: result.ig?.containerId || null,
      fbPostId: result.fb?.postId || null,
      fbPhotoId: result.fb?.photoId || null,
    },
    error: null,
  });

  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const forceMeta = Boolean(args["force-meta"] || args.forceMeta);

  if (!forceMeta) {
    printManualDefaultMessage();
    process.exitCode = 0;
    return;
  }

  const dryRun = Boolean(args["dry-run"] || args.dryRun);
  const limit = Math.max(1, Number(args.limit) || 50);

  const approved = listByStatus("approved").slice(0, limit);
  if (approved.length === 0) {
    console.log("No approved items to publish via Meta API.");
    return;
  }

  console.log(
    `Publishing ${approved.length} approved item(s) via Meta${dryRun ? " (dry-run)" : ""}…`
  );

  let ok = 0;
  let fail = 0;
  for (const item of approved) {
    try {
      const result = await publishOne(item, { dryRun });
      console.log(
        `  ✓ ${item.id}  ${item.slug}` +
          (result.ig?.mediaId ? `  ig=${result.ig.mediaId}` : "") +
          (result.fb?.postId ? `  fb=${result.fb.postId}` : "")
      );
      ok += 1;
    } catch (err) {
      fail += 1;
      console.error(`  ✗ ${item.id}  ${err.message}`);
      if (!dryRun) {
        try {
          updateItem(item.id, {
            status: "failed",
            error: String(err.message || err).slice(0, 500),
          });
        } catch {
          /* ignore */
        }
      }
    }
  }

  console.log(`Done. ok=${ok} fail=${fail}`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
