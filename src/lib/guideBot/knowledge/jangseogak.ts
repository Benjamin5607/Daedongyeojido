import { fetchWithTimeout, truncate } from "@/lib/guideBot/knowledge/http";
import type { KnowledgeSnippet } from "@/lib/guideBot/knowledge/types";

const SOURCE_LABEL = "한국학중앙연구원 디지털장서각(고문헌)";
const SEARCH_URL = "https://jsg.aks.ac.kr/api/search";

interface JsgResult {
  id?: string;
  자료명?: string;
  저자?: string;
  유형분류?: string;
  주제분류?: string;
  작성시기?: string;
  출처?: string;
  URL?: string;
}

interface JsgResponse {
  results?: JsgResult[];
}

export async function searchJangseogak(
  query: string,
  limit = 3
): Promise<KnowledgeSnippet[]> {
  const q = query.trim();
  if (!q) return [];

  const url =
    `${SEARCH_URL}?qw=dataName&q=${encodeURIComponent(q)}` +
    `&startIndex=0&pageUnit=${limit}`;
  const res = await fetchWithTimeout(url, {
    timeoutMs: 10000,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as JsgResponse;
  const results = Array.isArray(data.results) ? data.results.slice(0, limit) : [];

  return results
    .map((item) => {
      const title = item.자료명?.trim();
      if (!title) return null;
      const meta = [
        item.저자 ? `저자: ${item.저자}` : "",
        item.작성시기 ? `시기: ${item.작성시기}` : "",
        item.유형분류 ? `유형: ${item.유형분류}` : "",
        item.주제분류 ? `주제: ${item.주제분류}` : "",
        item.출처 ? `소장: ${item.출처}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      return {
        source: "jangseogak" as const,
        sourceLabel: SOURCE_LABEL,
        title,
        summary: truncate(meta || "고문헌 서지 정보", 500),
        url: item.URL || (item.id ? `https://jsg.aks.ac.kr/dir/view?dataId=${item.id}` : undefined),
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
}
