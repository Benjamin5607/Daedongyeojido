#!/usr/bin/env node
/**
 * Weekly growth insights stub.
 * When META_* secrets are set, attempts Graph insights; otherwise prints
 * queue stats + guidance for adjusting pickPlaces weights.
 *
 * Usage: npm run social:insights
 */
const { loadQueue } = require("./queue");
const { fetchIgAccountInsights } = require("./metaClient");

async function main() {
  const queue = loadQueue();
  const items = queue.items || [];
  const byStatus = {};
  const byFormat = {};
  const byTheme = {};
  for (const item of items) {
    byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    byFormat[item.format || "unknown"] = (byFormat[item.format || "unknown"] || 0) + 1;
    byTheme[item.theme || "unknown"] = (byTheme[item.theme || "unknown"] || 0) + 1;
  }

  console.log("=== Social queue summary ===");
  console.log(`updatedAt: ${queue.updatedAt}`);
  console.log("status:", byStatus);
  console.log("format (content mix):", byFormat);
  console.log("theme:", byTheme);
  console.log("");
  console.log("Target mix ≈ 40% place_card · 30% trend · 20% reels · 10% series");
  console.log("If trend share is low, keep morning slot + trend weight in pickPlaces.js.");
  console.log("");

  if (
    !process.env.META_PAGE_ACCESS_TOKEN ||
    !process.env.META_IG_USER_ID ||
    !process.env.META_PAGE_ID
  ) {
    console.log(
      "Meta insights skipped (set META_PAGE_ACCESS_TOKEN, META_IG_USER_ID, META_PAGE_ID)."
    );
    console.log("See docs/meta-setup.md Phase 3.");
    return;
  }

  console.log("=== Meta IG insights (stub) ===");
  const insights = await fetchIgAccountInsights();
  console.log(JSON.stringify(insights, null, 2));
  console.log("");
  console.log(
    "Use reach / saves / profile_views by theme to nudge scorePlace() weights weekly."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
