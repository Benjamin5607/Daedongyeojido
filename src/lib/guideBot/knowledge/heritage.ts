import {
  fetchWithTimeout,
  truncate,
  xmlCdataOrText,
} from "@/lib/guideBot/knowledge/http";
import type { KnowledgeSnippet } from "@/lib/guideBot/knowledge/types";

const SOURCE_LABEL = "국가유산청 국가유산정보 OpenAPI";
const LIST_URL = "https://www.cha.go.kr/cha/SearchKindOpenapiList.do";
const DETAIL_URL = "https://www.cha.go.kr/cha/SearchKindOpenapiDt.do";

interface HeritageListItem {
  name: string;
  nameHanja: string;
  grade: string;
  region: string;
  district: string;
  kdcd: string;
  asno: string;
  ctcd: string;
  lat?: string;
  lng?: string;
}

function parseListItems(xml: string): HeritageListItem[] {
  const items: HeritageListItem[] = [];
  for (const block of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const item = block[1];
    const kdcd = xmlCdataOrText(item, "ccbaKdcd");
    const asno = xmlCdataOrText(item, "ccbaAsno");
    const ctcd = xmlCdataOrText(item, "ccbaCtcd");
    const name = xmlCdataOrText(item, "ccbaMnm1");
    if (!name || !kdcd || !asno || !ctcd) continue;
    items.push({
      name,
      nameHanja: xmlCdataOrText(item, "ccbaMnm2"),
      grade: xmlCdataOrText(item, "ccmaName"),
      region: xmlCdataOrText(item, "ccbaCtcdNm"),
      district: xmlCdataOrText(item, "ccsiName"),
      kdcd: kdcd.trim(),
      asno: asno.trim(),
      ctcd: ctcd.trim(),
      lat: xmlCdataOrText(item, "latitude") || undefined,
      lng: xmlCdataOrText(item, "longitude") || undefined,
    });
  }
  return items;
}

async function fetchDetail(item: HeritageListItem): Promise<string> {
  const url =
    `${DETAIL_URL}?ccbaKdcd=${encodeURIComponent(item.kdcd)}` +
    `&ccbaAsno=${encodeURIComponent(item.asno)}` +
    `&ccbaCtcd=${encodeURIComponent(item.ctcd)}`;
  const res = await fetchWithTimeout(url, { timeoutMs: 9000 });
  if (!res.ok) return "";
  const xml = await res.text();
  const detailBlock = xml.match(/<item>([\s\S]*?)<\/item>/i)?.[1] ?? xml;
  const content = xmlCdataOrText(detailBlock, "content");
  const era = xmlCdataOrText(detailBlock, "ccceName");
  const address = xmlCdataOrText(detailBlock, "ccbaLcad");
  const parts = [
    era ? `시대/건립: ${era}` : "",
    address ? `소재: ${address}` : "",
    content,
  ].filter(Boolean);
  return truncate(parts.join(" / "), 900);
}

export async function searchHeritage(
  query: string,
  limit = 3
): Promise<KnowledgeSnippet[]> {
  const q = query.trim();
  if (!q) return [];

  const listUrl =
    `${LIST_URL}?ccbaMnm1=${encodeURIComponent(q)}` +
    `&pageUnit=${Math.max(limit, 5)}&pageIndex=1&ccbaCncl=N`;
  const res = await fetchWithTimeout(listUrl, { timeoutMs: 10000 });
  if (!res.ok) return [];
  const xml = await res.text();
  const items = parseListItems(xml).slice(0, limit);
  if (items.length === 0) return [];

  const snippets = await Promise.all(
    items.map(async (item) => {
      const detail = await fetchDetail(item).catch(() => "");
      const meta = [item.grade, item.region, item.district, item.nameHanja]
        .filter(Boolean)
        .join(" · ");
      return {
        source: "heritage" as const,
        sourceLabel: SOURCE_LABEL,
        title: item.name,
        summary: truncate(
          [meta, detail || "상세 설명은 목록 메타데이터만 확보됨."].filter(Boolean).join(" — "),
          900
        ),
        url:
          `https://www.heritage.go.kr/heri/cul/culSelectDetail.do?ccbaKdcd=${item.kdcd}` +
          `&ccbaAsno=${item.asno}&ccbaCtcd=${item.ctcd}`,
      };
    })
  );

  return snippets;
}
