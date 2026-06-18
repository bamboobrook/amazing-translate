import { DEFAULT_SETTINGS } from "./defaults";
import type { ExtensionSettings } from "./types";

const SETTINGS_KEY = "amazingTranslate.settings";
const CACHE_PREFIX = "amazingTranslate.cache.";

const cloneDefaults = (): ExtensionSettings => JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

export const mergeSettings = (raw: Partial<ExtensionSettings> | undefined): ExtensionSettings => {
  const defaults = cloneDefaults();
  if (!raw) return defaults;
  return {
    ...defaults,
    ...raw,
    providers: {
      deepseek: { ...defaults.providers.deepseek, ...raw.providers?.deepseek },
      glm: { ...defaults.providers.glm, ...raw.providers?.glm }
    }
  };
};

export const getSettings = async (): Promise<ExtensionSettings> => {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return mergeSettings(result[SETTINGS_KEY]);
};

export const saveSettings = async (settings: ExtensionSettings): Promise<ExtensionSettings> => {
  const merged = mergeSettings(settings);
  await chrome.storage.local.set({ [SETTINGS_KEY]: merged });
  return merged;
};

export const makeCacheKey = async (
  provider: string,
  model: string,
  sourceLanguage: string,
  targetLanguage: string,
  text: string
): Promise<string> => {
  const encoded = new TextEncoder().encode(
    JSON.stringify({ provider, model, sourceLanguage, targetLanguage, text })
  );
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const hash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${CACHE_PREFIX}${hash}`;
};

export const getCachedTranslations = async (
  keys: string[]
): Promise<Record<string, string | undefined>> => {
  if (keys.length === 0) return {};
  const result = await chrome.storage.local.get(keys);
  return result as Record<string, string | undefined>;
};

export const setCachedTranslations = async (entries: Record<string, string>): Promise<void> => {
  if (Object.keys(entries).length === 0) return;
  await chrome.storage.local.set(entries);
};

export const clearTranslationCache = async (): Promise<number> => {
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter((key) => key.startsWith(CACHE_PREFIX));
  if (keys.length > 0) await chrome.storage.local.remove(keys);
  return keys.length;
};
