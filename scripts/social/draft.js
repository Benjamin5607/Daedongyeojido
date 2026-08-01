#!/usr/bin/env node
/**
 * Create social draft queue items (default: 2 picks).
 * Usage: npm run social:draft
 *        npm run social:draft -- --count=1 --slot=morning
 */
const { pickPlaces } = require("./pickPlaces");
const { composeCaption } = require("./composeCaption");
const { loadQueue, addDraft } = require("./queue");
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const count = Math.max(1, Math.min(6, Number(args.count) || 2));
  const slot = args.slot || "auto";

  const queue = loadQueue();
  const { slot: resolvedSlot, preferredTheme, picks } = pickPlaces({
    count,
    slot,
    queueItems: queue.items,
  });

  if (picks.length === 0) {
    console.error("No eligible places to draft (check images / recent queue).");
    process.exit(1);
  }

  console.log(
    `Drafting ${picks.length} item(s) · slot=${resolvedSlot}` +
      (preferredTheme ? ` · theme=${preferredTheme}` : "")
  );

  const created = [];
  for (const pick of picks) {
    const { caption, source } = await composeCaption(pick.place, {
      format: pick.format,
    });
    const item = addDraft({
      slot: resolvedSlot,
      format: pick.format,
      slug: pick.slug,
      theme: pick.theme,
      caption,
      captionSource: source,
      imageUrl: pick.place.imageUrl || null,
      mirroredImageUrl: mirroredImageUrl(pick.slug),
      score: pick.score,
    });
    created.push(item);
    console.log(`  + ${item.id}  ${item.slug}  [${item.format}]  caption=${source}`);
  }

  console.log(`Done. Approve with: npm run social:approve -- --id=${created[0].id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
