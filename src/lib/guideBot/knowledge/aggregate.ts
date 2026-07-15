import { searchEncykorea } from "@/lib/guideBot/knowledge/encykorea";
import { searchHeritage } from "@/lib/guideBot/knowledge/heritage";
import { searchJangseogak } from "@/lib/guideBot/knowledge/jangseogak";
import { searchSillok } from "@/lib/guideBot/knowledge/sillok";
import type {
  KnowledgeBundle,
  KnowledgeSnippet,
  KnowledgeSourceId,
} from "@/lib/guideBot/knowledge/types";

const SOURCE_ORDER: KnowledgeSourceId[] = [
  "encykorea",
  "heritage",
  "sillok",
  "jangseogak",
];

async function settleSource(
  id: KnowledgeSourceId,
  runner: () => Promise<KnowledgeSnippet[]>
): Promise<{ id: KnowledgeSourceId; snippets: KnowledgeSnippet[]; ok: boolean }> {
  try {
    const snippets = await runner();
    return { id, snippets, ok: snippets.length > 0 };
  } catch {
    return { id, snippets: [], ok: false };
  }
}

/** Prefer Hangul / meaningful history keywords for official Korean sources. */
export function extractKnowledgeQueries(
  userText: string,
  nearbyNames: string[] = []
): string[] {
  const queries: string[] = [];
  const push = (raw: string) => {
    const q = raw.replace(/\s+/g, " ").trim();
    if (q.length < 2) return;
    if (!queries.includes(q)) queries.push(q);
  };

  for (const name of nearbyNames.slice(0, 4)) push(name);

  const hangulSpans = userText.match(/[가-힣]{2,12}/g) ?? [];
  for (const span of hangulSpans.slice(0, 4)) push(span);

  // English place-ish tokens (e.g. Gyeongbokgung)
  const latin = userText.match(/\b[A-Z][a-z]{3,}(?:\s+[A-Z][a-z]{2,})?\b/g) ?? [];
  for (const span of latin.slice(0, 2)) push(span);

  if (queries.length === 0) {
    const fallback = userText.trim().slice(0, 40);
    if (fallback) push(fallback);
  }

  return queries.slice(0, 3);
}

function formatSnippets(snippets: KnowledgeSnippet[]): string {
  if (snippets.length === 0) {
    return "No authoritative knowledge snippets were retrieved for this turn.";
  }

  return snippets
    .map((s, i) => {
      const link = s.url ? `\n   URL: ${s.url}` : "";
      return `${i + 1}. [${s.sourceLabel}] ${s.title}\n   ${s.summary}${link}`;
    })
    .join("\n\n");
}

export async function gatherKnowledge(query: string): Promise<KnowledgeBundle> {
  const q = query.trim();
  const empty: KnowledgeBundle = {
    query: q,
    snippets: [],
    sourcesTried: SOURCE_ORDER,
    sourcesOk: [],
    formatted: formatSnippets([]),
  };
  if (!q) return empty;

  const settled = await Promise.all([
    settleSource("encykorea", () => searchEncykorea(q, 2)),
    settleSource("heritage", () => searchHeritage(q, 2)),
    settleSource("sillok", () => searchSillok(q, 2)),
    settleSource("jangseogak", () => searchJangseogak(q, 2)),
  ]);

  const snippets = settled.flatMap((s) => s.snippets);
  const sourcesOk = settled.filter((s) => s.ok).map((s) => s.id);

  return {
    query: q,
    snippets,
    sourcesTried: SOURCE_ORDER,
    sourcesOk,
    formatted: formatSnippets(snippets),
  };
}

export async function gatherKnowledgeForQueries(
  queries: string[]
): Promise<KnowledgeBundle> {
  const unique = [...new Set(queries.map((q) => q.trim()).filter(Boolean))].slice(
    0,
    2
  );
  if (unique.length === 0) {
    return gatherKnowledge("");
  }

  const bundles = await Promise.all(unique.map((q) => gatherKnowledge(q)));
  const seen = new Set<string>();
  const snippets: KnowledgeSnippet[] = [];
  const sourcesOk = new Set<KnowledgeSourceId>();

  for (const bundle of bundles) {
    for (const ok of bundle.sourcesOk) sourcesOk.add(ok);
    for (const snip of bundle.snippets) {
      const key = `${snip.source}|${snip.title}|${snip.url ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      snippets.push(snip);
      if (snippets.length >= 10) break;
    }
    if (snippets.length >= 10) break;
  }

  return {
    query: unique.join(" / "),
    snippets,
    sourcesTried: SOURCE_ORDER,
    sourcesOk: [...sourcesOk],
    formatted: formatSnippets(snippets),
  };
}
