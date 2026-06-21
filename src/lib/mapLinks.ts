export function buildGoogleMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildNaverMapSearchUrl(placeName: string): string {
  return `https://map.naver.com/v5/search/${encodeURIComponent(placeName)}`;
}

export function buildMapQuery(name: string, address: string): string {
  return address ? `${name}, ${address}` : name;
}
