import { getProviderInfo } from "@/lib/guideBot/providers";
import type { ChatMessage, GuideApiConfig } from "@/lib/guideBot/types";

export const dynamic = "force-dynamic";

/**
 * Browser → NVIDIA integrate.api.nvidia.com is blocked by CORS.
 * This route forwards chat completions server-side while keeping the
 * user-supplied key in the request body (never persisted).
 */
interface GuideChatBody {
  config?: GuideApiConfig;
  system?: string;
  messages?: ChatMessage[];
}

export async function POST(request: Request) {
  let body: GuideChatBody = {};
  try {
    body = (await request.json()) as GuideChatBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { config, system, messages } = body;
  if (!config?.apiKey || !config.provider) {
    return Response.json({ error: "Missing API config" }, { status: 400 });
  }
  if (typeof system !== "string" || !Array.isArray(messages)) {
    return Response.json({ error: "Missing system/messages" }, { status: 400 });
  }
  if (config.provider !== "nvidia") {
    return Response.json(
      { error: "Proxy currently supports nvidia only" },
      { status: 400 }
    );
  }

  const model = getProviderInfo("nvidia").model;
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
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.7,
        max_tokens: 1024,
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

  let data: { choices?: { message?: { content?: string } }[] };
  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    return Response.json({ error: "NVIDIA returned non-JSON" }, { status: 502 });
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    return Response.json({ error: "NVIDIA returned empty response" }, { status: 502 });
  }

  return Response.json({ content });
}
