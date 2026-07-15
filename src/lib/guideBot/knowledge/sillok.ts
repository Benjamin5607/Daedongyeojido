import {
  fetchWithTimeout,
  stripTags,
  truncate,
} from "@/lib/guideBot/knowledge/http";
import type { KnowledgeSnippet } from "@/lib/guideBot/knowledge/types";

const SOURCE_LABEL = "국사편찬위원회 조선왕조실록";
const HOME = "https://sillok.history.go.kr/";
const SEARCH = "https://sillok.history.go.kr/search/searchResultList.do";

function pickCookies(res: Response): string {
  // Node/undici may expose getSetCookie(); avoid splitting Set-Cookie on commas
  // (Expires=Wed, 21 Oct ... would break a naive comma split).
  const anyHeaders = res.headers as Headers & { getSetCookie?: () => string[] };
  const list =
    typeof anyHeaders.getSetCookie === "function"
      ? anyHeaders.getSetCookie()
      : [];
  if (list.length > 0) {
    return list.map((c) => c.split(";")[0]?.trim()).filter(Boolean).join("; ");
  }
  const single = res.headers.get("set-cookie");
  return single ? single.split(";")[0].trim() : "";
}

function parseSearchHits(html: string, limit: number) {
  const hits: { id: string; title: string; excerpt: string; url: string }[] = [];
  for (const m of html.matchAll(
    /href="javascript:goView\('([^']+)'[^"]*"\s+class="subject">([\s\S]*?)<\/a>\s*<p class="text">([\s\S]*?)<\/p>/gi
  )) {
    const id = m[1];
    const title = stripTags(m[2]);
    const excerpt = stripTags(m[3]);
    hits.push({
      id,
      title: truncate(title.replace(/^\d+\.\s*/, ""), 160),
      excerpt: truncate(excerpt, 420),
      url: `https://sillok.history.go.kr/id/${id}`,
    });
    if (hits.length >= limit) break;
  }
  return hits;
}

async function fetchArticleExcerpt(id: string): Promise<string> {
  const res = await fetchWithTimeout(`https://sillok.history.go.kr/id/${id}`, {
    timeoutMs: 9000,
  });
  if (!res.ok) return "";
  const html = await res.text();
  // Prefer 국역 paragraph blocks
  const candidates = [
    ...html.matchAll(/id="[^"]*ins_view[^"]*"[\s\S]{0,200}?<([^>]+)>([\s\S]*?)<\/\1>/gi),
    ...html.matchAll(/class="[^"]*(?:ins_view|paragraph|view_text)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi),
  ];
  for (const m of candidates) {
    const text = stripTags(m[m.length - 1] ?? "");
    if (text.length > 80) return truncate(text, 700);
  }
  const plain = stripTags(html);
  const idx = plain.search(/[가-힣]{8,}/);
  if (idx >= 0) return truncate(plain.slice(idx, idx + 700), 700);
  return "";
}

export async function searchSillok(
  query: string,
  limit = 3
): Promise<KnowledgeSnippet[]> {
  const q = query.trim();
  if (!q) return [];

  const home = await fetchWithTimeout(HOME, { timeoutMs: 8000 });
  const cookie = pickCookies(home);

  const body = new URLSearchParams({ topSearchWord: q });
  const res = await fetchWithTimeout(SEARCH, {
    method: "POST",
    timeoutMs: 12000,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Referer: HOME,
      Origin: "https://sillok.history.go.kr",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body,
  });
  if (!res.ok) return [];
  const html = await res.text();
  const hits = parseSearchHits(html, limit);
  if (hits.length === 0) return [];

  const enriched = await Promise.all(
    hits.map(async (hit) => {
      const extra = await fetchArticleExcerpt(hit.id).catch(() => "");
      return {
        source: "sillok" as const,
        sourceLabel: SOURCE_LABEL,
        title: hit.title,
        summary: truncate([hit.excerpt, extra].filter(Boolean).join(" / "), 900),
        url: hit.url,
      };
    })
  );

  return enriched;
}
