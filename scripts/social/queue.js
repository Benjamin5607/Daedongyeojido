/**
 * social_queue.json read/write helpers.
 * Status flow: draft → exported → (optional approved) → published | failed
 * Default path is manual upload packs (social-exports/), not Meta API publish.
 */
const fs = require("fs");
const path = require("path");
const { ROOT } = require("./placeUtils");

const QUEUE_PATH = path.join(ROOT, "src/data/social_queue.json");

function emptyQueue() {
  return {
    updatedAt: new Date().toISOString(),
    items: [],
  };
}

function loadQueue() {
  try {
    const raw = JSON.parse(fs.readFileSync(QUEUE_PATH, "utf8"));
    if (!raw || !Array.isArray(raw.items)) return emptyQueue();
    return raw;
  } catch {
    return emptyQueue();
  }
}

function saveQueue(queue) {
  const next = {
    ...queue,
    updatedAt: new Date().toISOString(),
    items: queue.items || [],
  };
  fs.writeFileSync(QUEUE_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

function newId() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `sq_${stamp}_${rand}`;
}

/**
 * @param {object} partial
 */
function addDraft(partial) {
  const queue = loadQueue();
  const item = {
    id: newId(),
    status: "draft",
    slot: partial.slot || "morning",
    format: partial.format || "place_card",
    slug: partial.slug,
    theme: partial.theme,
    caption: partial.caption || "",
    captionSource: partial.captionSource || "local",
    imageUrl: partial.imageUrl || null,
    mirroredImageUrl: partial.mirroredImageUrl || null,
    score: partial.score ?? null,
    createdAt: new Date().toISOString(),
    approvedAt: null,
    publishedAt: null,
    meta: {},
    error: null,
  };
  queue.items.unshift(item);
  saveQueue(queue);
  return item;
}

function findItem(id) {
  const queue = loadQueue();
  return queue.items.find((i) => i.id === id) || null;
}

function updateItem(id, patch) {
  const queue = loadQueue();
  const idx = queue.items.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error(`Queue item not found: ${id}`);
  queue.items[idx] = { ...queue.items[idx], ...patch };
  saveQueue(queue);
  return queue.items[idx];
}

function approveItem(id) {
  const item = findItem(id);
  if (!item) throw new Error(`Queue item not found: ${id}`);
  if (item.status === "published") {
    throw new Error(`Already published: ${id}`);
  }
  return updateItem(id, {
    status: "approved",
    approvedAt: new Date().toISOString(),
    error: null,
  });
}

function approveAllDrafts() {
  const queue = loadQueue();
  const now = new Date().toISOString();
  let count = 0;
  for (const item of queue.items) {
    if (item.status !== "draft" && item.status !== "exported") continue;
    item.status = "approved";
    item.approvedAt = now;
    item.error = null;
    count += 1;
  }
  saveQueue(queue);
  return count;
}

function listByStatus(status) {
  return loadQueue().items.filter((i) => i.status === status);
}

module.exports = {
  QUEUE_PATH,
  loadQueue,
  saveQueue,
  addDraft,
  findItem,
  updateItem,
  approveItem,
  approveAllDrafts,
  listByStatus,
  newId,
};
