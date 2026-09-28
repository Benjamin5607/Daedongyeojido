import type { ChatMessage, GuideApiConfig } from "./types";
import { getProviderInfo } from "./providers";

async function chatGemini(
  config: GuideApiConfig,
  system: string,
  messages: ChatMessage[]
): Promise<string> {
  const model = getProviderInfo("gemini").model;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(config.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    }
  );

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Gemini ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = JSON.parse(body);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text?.trim()) throw new Error("Gemini returned empty response.");
  return text;
}

async function chatGroq(
  config: GuideApiConfig,
  system: string,
  messages: ChatMessage[]
): Promise<string> {
  const model = getProviderInfo("groq").model;
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
  });

  const body = await response.text();
  if (!response.ok) throw new Error(`Groq ${response.status}: ${body.slice(0, 200)}`);

  const data = JSON.parse(body);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned empty response.");
  return content;
}

async function chatNvidia(
  config: GuideApiConfig,
  system: string,
  messages: ChatMessage[]
): Promise<string> {
  // NVIDIA hosted chat blocks browser CORS — proxy through our API route.
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch("/api/guide-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, system, messages }),
      });

      const body = await response.text();
      if (!response.ok) {
        let detail = body.slice(0, 200);
        try {
          const parsed = JSON.parse(body) as { error?: string };
          if (parsed.error) detail = parsed.error;
        } catch {
          /* keep raw */
        }
        // Retry transient gateway / overload responses
        if (
          (response.status === 502 ||
            response.status === 503 ||
            response.status === 429) &&
          attempt < 3
        ) {
          await new Promise((r) => setTimeout(r, 700 * attempt));
          continue;
        }
        throw new Error(`NVIDIA ${response.status}: ${detail}`);
      }

      const data = JSON.parse(body) as { content?: string };
      if (!data.content?.trim()) {
        throw new Error("NVIDIA returned empty response.");
      }
      return data.content;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable =
        /fetch failed|Failed to fetch|timed out|502|503|429/i.test(msg) &&
        attempt < 3;
      if (!retryable) throw err;
      await new Promise((r) => setTimeout(r, 700 * attempt));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("NVIDIA chat failed after retries");
}

export async function sendGuideChat(
  config: GuideApiConfig,
  system: string,
  messages: ChatMessage[]
): Promise<string> {
  switch (config.provider) {
    case "gemini":
      return chatGemini(config, system, messages);
    case "groq":
      return chatGroq(config, system, messages);
    case "nvidia":
      return chatNvidia(config, system, messages);
    default:
      throw new Error("Unknown provider.");
  }
}

export async function testGuideApi(config: GuideApiConfig): Promise<void> {
  await sendGuideChat(config, "Reply with exactly: OK", [
    { id: "test", role: "user", content: "ping" },
  ]);
}
