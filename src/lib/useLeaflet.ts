"use client";

import { useEffect, useState } from "react";

// Extend global window interface for L (Leaflet)
declare global {
  interface Window {
    L?: any;
  }
}

export function useLeaflet() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.L) {
      setLoaded(true);
      return;
    }

    // Check if script/link tags are already added to prevent duplicates
    let link = document.querySelector('link[href*="leaflet.css"]') as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.crossOrigin = "";
      document.head.appendChild(link);
    }

    let script = document.querySelector('script[src*="leaflet.js"]') as HTMLScriptElement;
    if (!script) {
      script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.crossOrigin = "";
      script.onload = () => {
        setLoaded(true);
      };
      document.head.appendChild(script);
    } else if (window.L) {
      setLoaded(true);
    } else {
      // If script exists but onload has not fired yet, poll until window.L exists
      const interval = setInterval(() => {
        if (window.L) {
          setLoaded(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  return loaded;
}
