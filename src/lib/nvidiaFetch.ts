/**
 * Shared NVIDIA upstream fetch with retries for transient network / 5xx failures.
 */

export async function nvidiaFetchWithRetry(
  url: string,
  init: RequestInit,
  opts?: { attempts?: number; timeoutMs?: number; label?: string }
): Promise<Response> {
  const attempts = opts?.attempts ?? 3;
  const timeoutMs = opts?.timeoutMs ?? 90_000;
  const label = opts?.label ?? "NVIDIA";
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      // Retry transient upstream overloads
      if ((response.status === 503 || response.status === 429) && attempt < attempts) {
        await response.text().catch(() => "");
        await sleep(800 * attempt);
        continue;
      }
      return response;
    } catch (err) {
      lastError = err;
      if (attempt >= attempts) break;
      await sleep(800 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.name === "AbortError"
        ? `${label} timed out after ${timeoutMs}ms`
        : `${label} fetch failed: ${lastError.message}`
      : `${label} fetch failed`;
  throw new Error(message);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
