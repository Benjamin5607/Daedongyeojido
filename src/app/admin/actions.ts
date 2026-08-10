"use server";

import fs from "fs";
import path from "path";
import { getAllPlaces, type IndexedPlace } from "@/lib/places";
import { loadQueue, saveQueue, addDraft, updateItem, approveItem } from "../../../scripts/social/queue";

// Paths
const DATA_DIR = path.join(process.cwd(), "src/data");
const CRAWLED_PLACES_PATH = path.join(DATA_DIR, "crawled_places.json");
const SOCIAL_QUEUE_PATH = path.join(DATA_DIR, "social_queue.json");
const TRAVEL_TRENDS_PATH = path.join(DATA_DIR, "travel_trends.json");

// Helper to write JSON safely
function writeJsonFile(filePath: string, data: any) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function getAdminStats() {
  const places = getAllPlaces();
  const queue = loadQueue();
  
  let trendsData = { items: [] };
  try {
    trendsData = JSON.parse(fs.readFileSync(TRAVEL_TRENDS_PATH, "utf8"));
  } catch {}

  const localGems = places.filter((p) => p.localGem).length;
  const trending = places.filter((p) => p.trend).length;

  const socialStats = {
    draft: queue.items.filter((i: any) => i.status === "draft").length,
    exported: queue.items.filter((i: any) => i.status === "exported").length,
    approved: queue.items.filter((i: any) => i.status === "approved").length,
    published: queue.items.filter((i: any) => i.status === "published").length,
    total: queue.items.length,
  };

  return {
    totalPlaces: places.length,
    localGems,
    trending,
    socialStats,
    totalTrends: (trendsData.items || []).length,
  };
}

export async function getPlacesList() {
  return getAllPlaces();
}

export async function savePlace(slug: string | null, placeData: any) {
  const placesRaw = JSON.parse(fs.readFileSync(CRAWLED_PLACES_PATH, "utf8")) as any[];
  
  if (slug) {
    // Edit existing place
    const allWithSlugs = getAllPlaces();
    const index = allWithSlugs.findIndex((p) => p.slug === slug);
    if (index !== -1) {
      placesRaw[index] = { ...placesRaw[index], ...placeData };
    } else {
      throw new Error("Place not found for editing");
    }
  } else {
    // Add new place
    placesRaw.unshift(placeData);
  }

  writeJsonFile(CRAWLED_PLACES_PATH, placesRaw);
  return { success: true };
}

export async function deletePlace(slug: string) {
  const allWithSlugs = getAllPlaces();
  const index = allWithSlugs.findIndex((p) => p.slug === slug);
  if (index === -1) {
    throw new Error("Place not found for deletion");
  }

  const placesRaw = JSON.parse(fs.readFileSync(CRAWLED_PLACES_PATH, "utf8")) as any[];
  placesRaw.splice(index, 1);
  writeJsonFile(CRAWLED_PLACES_PATH, placesRaw);
  return { success: true };
}

export async function getSocialQueue() {
  return loadQueue();
}

export async function updateSocialQueueItem(id: string, patch: any) {
  updateItem(id, patch);
  return { success: true };
}

export async function deleteSocialQueueItem(id: string) {
  const queue = loadQueue();
  queue.items = queue.items.filter((i: any) => i.id !== id);
  saveQueue(queue);
  return { success: true };
}

export async function getTrendsList() {
  try {
    return JSON.parse(fs.readFileSync(TRAVEL_TRENDS_PATH, "utf8"));
  } catch {
    return { updatedAt: "", items: [] };
  }
}

export async function generateSocialDraftsAction(count: number, slot: string) {
  // We can run the existing draft script in a child process, or invoke its logic on the server-side
  const { execSync } = require("child_process");
  try {
    execSync(`node scripts/social/draft.js --count=${count} --slot=${slot}`, {
      env: process.env,
    });
    return { success: true };
  } catch (err: any) {
    console.error("Draft generation failed:", err);
    return { success: false, error: err.message };
  }
}

export async function exportSocialPacksAction() {
  const { execSync } = require("child_process");
  try {
    execSync(`node scripts/social/exportPack.js --limit=10 --force`, {
      env: process.env,
    });
    return { success: true };
  } catch (err: any) {
    console.error("Export pack failed:", err);
    return { success: false, error: err.message };
  }
}
