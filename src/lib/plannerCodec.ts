/**
 * URL-safe Base64 encoder/decoder for sharing travel plans DB-free.
 */

export function encodeSchedule(schedule: string[][]): string {
  try {
    const jsonStr = JSON.stringify(schedule);
    const utf8Bytes = new TextEncoder().encode(jsonStr);
    let binStr = "";
    utf8Bytes.forEach((b) => {
      binStr += String.fromCharCode(b);
    });
    const base64 = btoa(binStr);
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch (err) {
    console.error("Failed to encode schedule:", err);
    return "";
  }
}

export function decodeSchedule(encoded: string): string[][] | null {
  if (!encoded) return null;
  try {
    let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const binStr = atob(base64);
    const len = binStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    const jsonStr = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed) && parsed.every(Array.isArray)) {
      return parsed as string[][];
    }
    return null;
  } catch (err) {
    console.error("Failed to decode schedule:", err);
    return null;
  }
}
