const NVIDIA_BASE_URL =
  process.env.NVIDIA_API_BASE_URL || "https://integrate.api.nvidia.com/v1";
const DEFAULT_MODEL =
  process.env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct";

/**
 * @param {{ system: string; user: string; model?: string; maxTokens?: number }} options
 */
async function nvidiaChatCompletion({ system, user, model, maxTokens = 4096 }) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY environment variable is required.");
  }

  const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_tokens: maxTokens,
    }),
  });

  const bodyText = await response.text();
  if (!response.ok) {
    /** @type {Error & { status?: number }} */
    const error = new Error(`NVIDIA API ${response.status}: ${bodyText}`);
    error.status = response.status;
    throw error;
  }

  const data = JSON.parse(bodyText);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("NVIDIA API returned empty content.");
  }
  return content;
}

module.exports = {
  nvidiaChatCompletion,
  DEFAULT_MODEL,
  NVIDIA_BASE_URL,
};
