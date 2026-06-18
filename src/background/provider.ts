import type { ExtensionSettings, ProviderConfig, ProviderId, TextBlock, TranslationResult } from "../shared/types";

interface ChatCompletionChoice {
  message?: { content?: string };
}

interface ChatCompletionResponse {
  choices?: ChatCompletionChoice[];
  error?: { message?: string; code?: string };
}

const providerName = (provider: ProviderId): string => (provider === "deepseek" ? "DeepSeek" : "智谱 GLM Coding");

const completionUrl = (config: ProviderConfig): string => `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;

const systemPrompt = "You are a careful translation engine for a browser extension. Translate only the provided text. Preserve meaning, numbers, Markdown-like inline markers, and the user's line breaks where possible. Return compact JSON only.";

const buildPrompt = (blocks: TextBlock[], sourceLanguage: string, targetLanguage: string): string =>
  JSON.stringify({
    instruction:
      "Translate each item. Return exactly {\"translations\":[{\"id\":string,\"text\":string}]} with every id preserved.",
    sourceLanguage,
    targetLanguage,
    items: blocks
  });

export const extractJson = (content: string): unknown => {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (fenced) return JSON.parse(fenced.trim());
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(trimmed.slice(first, last + 1));
    throw new Error("The model returned text that was not valid JSON.");
  }
};

export const normalizeTranslations = (raw: unknown, blocks: TextBlock[]): TranslationResult[] => {
  if (!raw || typeof raw !== "object") throw new Error("The model returned an empty response.");
  const translations = (raw as { translations?: unknown }).translations;
  if (!Array.isArray(translations)) throw new Error("The model response did not include translations.");
  const byId = new Map<string, string>();
  for (const item of translations) {
    if (!item || typeof item !== "object") continue;
    const { id, text } = item as { id?: unknown; text?: unknown };
    if (typeof id === "string" && typeof text === "string") byId.set(id, text.trim());
  }
  return blocks.map((block) => ({ id: block.id, text: byId.get(block.id) || "" }));
};

const explainFetchError = (provider: ProviderId, status: number, body: string): string => {
  const label = providerName(provider);
  if (status === 401 || status === 403) return `${label} authentication failed. Check the API Key in settings.`;
  if (status === 429) return `${label} rate limit reached. Wait a moment or reduce batch size.`;
  if (status >= 500) return `${label} server error (${status}). Try again later.`;
  return `${label} request failed (${status}): ${body.slice(0, 240)}`;
};

export const translateBatch = async (
  settings: ExtensionSettings,
  blocks: TextBlock[],
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranslationResult[]> => {
  const provider = settings.provider;
  const config = settings.providers[provider];
  if (!config.apiKey.trim()) throw new Error(`${providerName(provider)} API Key is missing. Open settings first.`);
  if (blocks.length === 0) return [];

  const response = await fetch(completionUrl(config), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildPrompt(blocks, sourceLanguage, targetLanguage) }
      ]
    })
  });

  const body = await response.text();
  if (!response.ok) throw new Error(explainFetchError(provider, response.status, body));

  let json: ChatCompletionResponse;
  try {
    json = JSON.parse(body) as ChatCompletionResponse;
  } catch {
    throw new Error(`${providerName(provider)} returned a non-JSON HTTP response.`);
  }
  if (json.error?.message) throw new Error(json.error.message);
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${providerName(provider)} returned no translation content.`);
  return normalizeTranslations(extractJson(content), blocks);
};

export const testProvider = async (settings: ExtensionSettings): Promise<string> => {
  const result = await translateBatch(
    settings,
    [{ id: "test", text: "Browser extensions should be useful and respectful of user control." }],
    "en",
    settings.targetLanguage
  );
  return result[0]?.text || "Connection succeeded.";
};
