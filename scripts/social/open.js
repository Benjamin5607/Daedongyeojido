#!/usr/bin/env node
/**
 * Print / open the latest social export pack folder.
 * Usage: npm run social:open
 *        npm run social:open -- --id=sq_...
 */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { ROOT } = require("./placeUtils");
const { loadQueue, findItem } = require("./queue");

const EXPORTS_ROOT = path.join(ROOT, "social-exports");

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

function listPackDirs() {
  if (!fs.existsSync(EXPORTS_ROOT)) return [];
  return fs
    .readdirSync(EXPORTS_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .reverse();
}

function openPath(target) {
  const platform = process.platform;
  if (platform === "win32") {
    spawn("explorer", [target], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  if (platform === "darwin") {
    spawn("open", [target], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  spawn("xdg-open", [target], { detached: true, stdio: "ignore" }).unref();
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let target = null;

  if (args.id) {
    const item = findItem(args.id);
    if (!item) {
      console.error(`Not found: ${args.id}`);
      process.exit(1);
    }
    if (item.meta?.packDir) {
      target = path.join(ROOT, item.meta.packDir);
    } else {
      console.error(`No packDir on ${args.id}. Run: npm run social:export -- --id=${args.id}`);
      process.exit(1);
    }
  } else {
    const packs = listPackDirs();
    if (packs.length === 0) {
      console.log("No packs yet. Run: npm run social:draft");
      process.exitCode = 1;
      return;
    }
    target = path.join(EXPORTS_ROOT, packs[0]);
  }

  if (!fs.existsSync(target)) {
    console.error(`Pack folder missing: ${target}`);
    process.exit(1);
  }

  const notes = path.join(target, "UPLOAD_NOTES.txt");
  const caption = path.join(target, "caption.txt");
  console.log(`Pack: ${target}`);
  if (fs.existsSync(notes)) {
    console.log("--- UPLOAD_NOTES.txt ---");
    console.log(fs.readFileSync(notes, "utf8").trim());
    console.log("------------------------");
  }
  if (fs.existsSync(caption)) {
    console.log(`Caption file: ${caption}`);
  }

  if (!args["no-open"] && !args.noOpen) {
    try {
      openPath(target);
      console.log("Opened folder in file explorer.");
    } catch (err) {
      console.warn(`Could not open explorer: ${err.message}`);
    }
  }

  const recent = loadQueue().items.filter((i) => i.meta?.packDir).slice(0, 5);
  if (recent.length) {
    console.log("\nRecent packs:");
    for (const i of recent) {
      console.log(`  ${i.id}  ${i.meta.packDir}`);
    }
  }
}

main();
