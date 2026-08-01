#!/usr/bin/env node
/**
 * Publish approved queue items to Instagram + Facebook Page.
 * Cron / CI should only run this — drafts stay human-gated.
 *
 * Usage: npm run social:publish
 *        npm run social:publish -- --dry-run
 *        npm run social:publish -- --limit=1
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
  const dryRun = Boolean(args["dry-run"] || args.dryRun);
  const limit = Math.max(1, Number(args.limit) || 50);

  const approved = listByStatus("approved").slice(0, limit);
  if (approved.length === 0) {
    console.log("No approved items to publish.");
    return;
  }

  console.log(`Publishing ${approved.length} approved item(s)${dryRun ? " (dry-run)" : ""}…`);

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
