import {
  decodeHtmlEntities,
  fetchWithTimeout,
  stripTags,
  truncate,
} from "@/lib/guideBot/knowledge/http";
import type { KnowledgeSnippet } from "@/lib/guideBot/knowledge/types";

const SOURCE_LABEL = "한국학중앙연구원 한국민족문화대백과사전";

interface SearchHit {
  id: string;
  url: string;
  title: string;
  snippet: string;
}

function extractSearchHits(html: string, query: string, limit: number): SearchHit[] {
  // Prefer the main search-result region when present.
  const resultRegion =
    html.match(
      /class="[^"]*(?:sch_result|result-list|search_result)[^"]*"[\s\S]*?(?:<\/section>|<\/ul>|<\/div>\s*<div class="(?:paging|page))/i
    )?.[0] ?? html;

  const hits: SearchHit[] = [];
  const seen = new Set<string>();

  for (const m of resultRegion.matchAll(
    /href="(\/Article\/(E\d+))"[^>]*>([\s\S]*?)<\/a>([\s\S]{0,900})/gi
  )) {
    const path = m[1];
    const id = m[2];
    if (seen.has(id)) continue;

    const title = stripTags(m[3]).replace(/^\d+\s*/, "").trim();
    const snippet = stripTags(m[4]).slice(0, 400);
    const blob = `${title} ${snippet}`;
    if (!blob.includes(query)) continue;

    seen.add(id);
    hits.push({
      id,
      url: `https://encykorea.aks.ac.kr${path}`,
      title: title || id,
      snippet: truncate(snippet || title, 320),
    });
    if (hits.length >= limit * 3) break;
  }

  // Fallback: any Article link whose nearby text mentions the query.
  if (hits.length === 0) {
    const parts = html.split(/(?=<a[^>]+href="\/Article\/E\d+")/);
    for (const part of parts.slice(1)) {
      const idMatch = part.match(/href="(\/Article\/(E\d+))"/);
      if (!idMatch) continue;
      const path = idMatch[1];
      const id = idMatch[2];
      if (seen.has(id)) continue;
      const text = stripTags(part.slice(0, 1200));
      if (!text.includes(query)) continue;
      seen.add(id);
      hits.push({
        id,
        url: `https://encykorea.aks.ac.kr${path}`,
        title: truncate(text.split(/[.。#]/)[0] || id, 80),
        snippet: truncate(text, 320),
      });
      if (hits.length >= limit) break;
    }
  }

  return hits.slice(0, limit);
}

async function fetchArticleBody(url: string): Promise<{ title: string; body: string }> {
  const res = await fetchWithTimeout(url, { timeoutMs: 9000 });
  if (!res.ok) return { title: "", body: "" };
  const html = await res.text();

  const ogTitle = html.match(/property="og:title"\s+content="([^"]*)"/i)?.[1];
  const title = ogTitle ? decodeHtmlEntities(stripTags(ogTitle)) : "";

  const bodyMatch = html.match(
    /id="body_content"[^>]*>([\s\S]*?)(?:<div[^>]+class="[^"]*(?:footer|relate|bottom)[^"]*"|<\/section>|$)/i
  );
  const chunk = bodyMatch?.[1] ?? html;
  const paragraphs = [...chunk.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => stripTags(m[1]))
    .filter((p) => p.length > 60);

  if (paragraphs.length > 0) {
    return { title, body: truncate(paragraphs.slice(0, 3).join(" "), 900) };
  }

  const og = html.match(/property="og:description"\s+content="([^"]*)"/i)?.[1];
  return {
    title,
    body: og ? truncate(decodeHtmlEntities(stripTags(og)), 500) : "",
  };
}

export async function searchEncykorea(
  query: string,
  limit = 3
): Promise<KnowledgeSnippet[]> {
  const q = query.trim();
  if (!q) return [];

  const searchUrl = `https://encykorea.aks.ac.kr/Article/Search?query=${encodeURIComponent(q)}`;
  const res = await fetchWithTimeout(searchUrl, { timeoutMs: 10000 });
  if (!res.ok) return [];
  const html = await res.text();
  const hits = extractSearchHits(html, q, limit);
  if (hits.length === 0) return [];

  const detailed: KnowledgeSnippet[] = [];
  for (const hit of hits.slice(0, Math.min(2, hits.length))) {
    const article = await fetchArticleBody(hit.url).catch(() => ({
      title: "",
      body: "",
    }));
    detailed.push({
      source: "encykorea",
      sourceLabel: SOURCE_LABEL,
      title: article.title || hit.title,
      summary: article.body || hit.snippet,
      url: hit.url,
    });
  }

  for (const hit of hits.slice(detailed.length)) {
    detailed.push({
      source: "encykorea",
      sourceLabel: SOURCE_LABEL,
      title: hit.title,
      summary: hit.snippet,
      url: hit.url,
    });
  }

  return detailed;
}
