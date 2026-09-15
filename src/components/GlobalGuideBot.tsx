"use client";

import { usePathname } from "next/navigation";
import { GuideBot } from "@/components/GuideBot/GuideBot";

/** Floating FAB — switches to hiking mode on /themes/sanhaeng */
export function GlobalGuideBot() {
  const pathname = usePathname();
  const hiking = pathname?.startsWith("/themes/sanhaeng");
  // On sanhaeng page the embedded HikingGuideSection owns the bot UI.
  if (hiking) return null;
  return <GuideBot mode="history" />;
}
