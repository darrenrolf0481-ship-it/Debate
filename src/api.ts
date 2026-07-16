import { AgentConfig, AppSettings } from "./types";

function extractError(data: any, fallback: string): string {
  const err = data?.error;
  if (typeof err === "string") return err;
  if (err?.message) return err.message;
  return fallback;
}

export async function generateResponse(
  prompt: string,
  config: AgentConfig,
  settings: AppSettings,
  signal?: AbortSignal
): Promise<string> {
  if (config.provider === "ollama") {
    // Direct client fetch so localhost resolves to the user's machine running Ollama
    const endpoint = settings.ollamaBaseUrl || "http://127.0.0.1:11434";
    const res = await fetch(`${endpoint}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model || "llama3",
        prompt: prompt,
        system: config.systemPrompt,
        stream: false
      }),
      signal,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(extractError(data, `Ollama fetch failed: HTTP ${res.status}`));
    }
    const json = await res.json();
    return json.response || "";
  }

  // Google and OpenRouter are proxied securely to avoid CORS issues if any occur
  let apiKey = "";
  if (config.provider === "google") apiKey = settings.googleApiKey;
  if (config.provider === "openrouter") apiKey = settings.openRouterApiKey;

  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: config.provider,
      model: config.model,
      prompt,
      systemPrompt: config.systemPrompt,
      apiKey,
      baseUrl: settings.ollamaBaseUrl,
    }),
    signal,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(extractError(data, `HTTP error ${res.status}`));
  }

  const json = await res.json();
  return json.text || "";
}
