import type { KnowledgeBundle } from "@/lib/guideBot/knowledge/types";

export async function fetchGuideKnowledge(
  query: string,
  nearbyNames: string[] = []
): Promise<KnowledgeBundle | null> {
  try {
    const res = await fetch("/api/guide-knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, nearbyNames }),
    });
    if (!res.ok) return null;
    return (await res.json()) as KnowledgeBundle;
  } catch {
    return null;
  }
}
