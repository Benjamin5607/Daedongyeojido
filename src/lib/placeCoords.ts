import mapLinks from "@/data/place_map_links.json";

export interface Coordinates {
  lat: number;
  lng: number;
}

export function extractGooglePlaceCoords(url: string): Coordinates | null {
  const match = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (!match) return null;
  return { lat: Number.parseFloat(match[1]), lng: Number.parseFloat(match[2]) };
}

export function extractNaverCoordSearch(url: string): Coordinates | null {
  const match = url.match(/search\/(-?\d+\.?\d*),(-?\d+\.?\d+)/);
  if (!match) return null;
  return { lat: Number.parseFloat(match[1]), lng: Number.parseFloat(match[2]) };
}

export function getPlaceCoordinates(slug: string): Coordinates | null {
  const entry = mapLinks[slug as keyof typeof mapLinks];
  if (!entry) return null;

  const fromGoogle = extractGooglePlaceCoords(entry.googleUrl);
  if (fromGoogle) return fromGoogle;

  return extractNaverCoordSearch(entry.naverUrl);
}

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
