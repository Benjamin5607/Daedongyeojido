import type { GuideApiConfig } from "@/lib/guideBot/types";
import { getProviderInfo } from "@/lib/guideBot/providers";
import type { TripGuide, TripGuideStop } from "@/lib/tripGuide/types";

export const dynamic = "force-dynamic";

interface TripGuideRequestBody {
  config?: GuideApiConfig;
  guide?: TripGuide;
  locale?: string;
}

/**
 * Optionally enrich a local trip guide with NVIDIA NIM.
 * Returns patched stop fields (transitGuide, tip, foodFeature) only.
 * Key stays in the request body — never persisted.
 */
export async function POST(request: Request) {
  let body: TripGuideRequestBody = {};
  try {
    body = (await request.json()) as TripGuideRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { config, guide } = body;
  if (!config?.apiKey || config.provider !== "nvidia") {
    return Response.json(
      { error: "NVIDIA API config required (provider=nvidia)" },
      { status: 400 }
    );
  }
  if (!guide?.stops?.length) {
    return Response.json({ error: "Missing guide.stops" }, { status: 400 });
  }

  const compact = guide.stops.slice(0, 12).map((s) => ({
    id: s.id,
    dayNumber: s.dayNumber,
    title: s.title,
    category: s.category,
    regionLabel: s.regionLabel,
    locationName: s.locationName,
    transitGuide: s.transitGuide,
    tip: s.tip,
    foodName: s.foodName,
  }));

  const model = getProviderInfo("nvidia").model;
  const system = `You deepen Korea trip guides for Daedongyeojido travelers.
Return ONLY a JSON array. Each item: {"id":"...","transitGuide":"...","tip":"...","foodFeature":"..."}.
Rules:
- Keep practical, specific, Korea-local (subway lines, trailheads, Naver hours, T-money).
- Do NOT invent hotel bookings, ticket reservation codes, or fake phone numbers.
- Do NOT invent restaurants that are not hinted; refine foodFeature for the given foodName.
- Match the language of the input tips (English/Japanese/Chinese/etc.).
- Max 60 words per field. No markdown fences.`;

  const upstream = await fetch(
    "https://integrate.api.nvidia.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Enrich these stops:\n${JSON.stringify(compact, null, 2)}`,
          },
        ],
        temperature: 0.4,
        max_tokens: 2500,
      }),
    }
  );

  const text = await upstream.text();
  if (!upstream.ok) {
    return Response.json(
      { error: `NVIDIA ${upstream.status}: ${text.slice(0, 300)}` },
      { status: upstream.status }
    );
  }

  let content = "";
  try {
    const data = JSON.parse(text) as {
      choices?: { message?: { content?: string } }[];
    };
    content = data?.choices?.[0]?.message?.content?.trim() || "";
  } catch {
    return Response.json({ error: "NVIDIA returned non-JSON" }, { status: 502 });
  }

  const match = content.match(/\[[\s\S]*\]/);
  if (!match) {
    return Response.json(
      { error: "NVIDIA response missing JSON array", raw: content.slice(0, 200) },
      { status: 502 }
    );
  }

  type Patch = {
    id: string;
    transitGuide?: string;
    tip?: string;
    foodFeature?: string;
  };

  let patches: Patch[] = [];
  try {
    patches = JSON.parse(match[0]) as Patch[];
  } catch {
    return Response.json({ error: "Failed to parse enrichment JSON" }, { status: 502 });
  }

  const byId = new Map(patches.map((p) => [p.id, p]));
  const stops: TripGuideStop[] = guide.stops.map((stop) => {
    const patch = byId.get(stop.id);
    if (!patch) return stop;
    return {
      ...stop,
      transitGuide: patch.transitGuide?.trim() || stop.transitGuide,
      tip: patch.tip?.trim() || stop.tip,
      foodFeature: patch.foodFeature?.trim() || stop.foodFeature,
    };
  });

  const enriched: TripGuide = {
    ...guide,
    source: "nvidia",
    createdAt: new Date().toISOString(),
    stops,
  };

  return Response.json({ guide: enriched });
}
