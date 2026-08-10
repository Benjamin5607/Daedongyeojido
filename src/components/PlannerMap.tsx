"use client";

import { useEffect, useRef } from "react";
import { useLeaflet } from "@/lib/useLeaflet";
import { getPlaceCoordinates } from "@/lib/placeCoords";
import { resolveKoreanField } from "@/lib/i18n";
import type { IndexedPlace } from "@/lib/places";

interface PlannerMapProps {
  places: IndexedPlace[];
}

export function PlannerMap({ places }: PlannerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const leafletLoaded = useLeaflet();

  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return;
    if (typeof window === "undefined" || !window.L) return;

    const L = window.L;

    // Filter places with coordinates
    const coordsWithPlaces = places
      .map((p) => ({ place: p, coords: getPlaceCoordinates(p.slug) }))
      .filter((item): item is { place: IndexedPlace; coords: { lat: number; lng: number } } => item.coords !== null);

    if (!mapInstanceRef.current) {
      // South Korea center fallback
      const centerLat = coordsWithPlaces.length > 0 ? coordsWithPlaces[0].coords.lat : 36.5;
      const centerLng = coordsWithPlaces.length > 0 ? coordsWithPlaces[0].coords.lng : 127.8;
      const zoom = coordsWithPlaces.length > 0 ? 11 : 7;

      mapInstanceRef.current = L.map(mapRef.current).setView([centerLat, centerLng], zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapInstanceRef.current);
    }

    // Clear old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Clear old polylines
    polylinesRef.current.forEach((poly) => poly.remove());
    polylinesRef.current = [];

    if (coordsWithPlaces.length === 0) {
      return;
    }

    // Add markers and compile line coords
    const latLngs: [number, number][] = [];
    coordsWithPlaces.forEach((item, index) => {
      const { place, coords } = item;
      const marker = L.marker([coords.lat, coords.lng])
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div class="p-1 min-w-[150px]">
            <h4 class="font-serif font-bold text-sm text-[var(--color-ink)]">${resolveKoreanField(place.name)}</h4>
            <p class="text-xs text-[var(--color-muted)]">${place.theme}</p>
            <a href="/places/${place.slug}" class="text-xs font-semibold text-[var(--color-trip-green)] hover:underline mt-2 inline-block">View Details</a>
          </div>
        `);
      markersRef.current.push(marker);
      latLngs.push([coords.lat, coords.lng]);
    });

    // Draw paths connecting the itinerary
    if (latLngs.length > 1) {
      const polyline = L.polyline(latLngs, {
        color: "#16a34a", // Emerald-600 / green-600
        weight: 3,
        opacity: 0.8,
        dashArray: "6, 6",
      }).addTo(mapInstanceRef.current);
      polylinesRef.current.push(polyline);
    }

    // Auto fit map bounds
    try {
      const bounds = L.latLngBounds(latLngs);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    } catch (e) {
      console.error("Error setting map bounds", e);
    }
  }, [leafletLoaded, places]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-[var(--color-border)] shadow-sm bg-stone-50 min-h-[400px]">
      <div ref={mapRef} className="absolute inset-0 h-full w-full z-10" />
    </div>
  );
}
