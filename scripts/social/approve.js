#!/usr/bin/env node
/**
 * Approve draft queue items.
 * Usage:
 *   npm run social:approve -- --id=sq_...
 *   npm run social:approve -- --all
 */
const { approveItem, approveAllDrafts, loadQueue, findItem } = require("./queue");

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

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.all) {
    const n = approveAllDrafts();
    console.log(`Approved ${n} draft(s).`);
    return;
  }

  const id = args.id;
  if (!id) {
    const queue = loadQueue();
    const pending = queue.items.filter(
      (i) => i.status === "draft" || i.status === "exported"
    );
    console.log("Usage: npm run social:approve -- --id=<id>   or  --all");
    console.log(`Pending draft/exported: ${pending.length}`);
    for (const d of pending.slice(0, 20)) {
      const pack = d.meta?.packDir ? `  pack=${d.meta.packDir}` : "";
      console.log(`  ${d.id}  ${d.slug}  ${d.status}  ${d.slot}  ${d.format}${pack}`);
    }
    process.exitCode = pending.length ? 1 : 0;
    return;
  }

  const before = findItem(id);
  if (!before) {
    console.error(`Not found: ${id}`);
    process.exit(1);
  }
  const item = approveItem(id);
  console.log(`Approved ${item.id} (${item.slug}).`);
}

main();
