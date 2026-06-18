import { clearTranslationCache, getCachedTranslations, getSettings, makeCacheKey, saveSettings, setCachedTranslations } from "../shared/storage";
import type { RuntimeRequest, RuntimeResponse, TextBlock, TranslateResponse, TranslationResult } from "../shared/types";
import { testProvider, translateBatch } from "./provider";

const ok = <T>(data: T): RuntimeResponse<T> => ({ ok: true, data });
const fail = (error: unknown): RuntimeResponse => ({ ok: false, error: error instanceof Error ? error.message : String(error) });

const chunkBlocks = (blocks: TextBlock[], maxChars: number): TextBlock[][] => {
  const chunks: TextBlock[][] = [];
  let current: TextBlock[] = [];
  let size = 0;
  for (const block of blocks) {
    const nextSize = block.text.length;
    if (current.length > 0 && size + nextSize > maxChars) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(block);
    size += nextSize;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
};

const translateWithCache = async (blocks: TextBlock[]): Promise<TranslateResponse> => {
  const settings = await getSettings();
  const providerConfig = settings.providers[settings.provider];
  const sourceLanguage = settings.sourceLanguage;
  const targetLanguage = settings.targetLanguage;

  const keys = await Promise.all(
    blocks.map((block) =>
      makeCacheKey(settings.provider, providerConfig.model, sourceLanguage, targetLanguage, block.text)
    )
  );
  const cache = settings.cacheEnabled ? await getCachedTranslations(keys) : {};
  const translations = new Map<string, string>();
  let cached = 0;
  const missing: TextBlock[] = [];
  const missingKeys = new Map<string, string>();
  const duplicateIds = new Map<string, string[]>();
  const representativeByKey = new Map<string, TextBlock>();

  blocks.forEach((block, index) => {
    const key = keys[index];
    const cachedText = cache[key];
    if (cachedText) {
      translations.set(block.id, cachedText);
      cached += 1;
      return;
    }

    const representative = representativeByKey.get(key);
    if (representative) {
      duplicateIds.set(representative.id, [...(duplicateIds.get(representative.id) || []), block.id]);
      return;
    }

    representativeByKey.set(key, block);
    missing.push(block);
    missingKeys.set(block.id, key);
  });

  const newCacheEntries: Record<string, string> = {};
  const applyResults = (result: TranslationResult[]) => {
    for (const item of result) {
      if (!item.text) continue;
      translations.set(item.id, item.text);
      for (const duplicateId of duplicateIds.get(item.id) || []) translations.set(duplicateId, item.text);
      const key = missingKeys.get(item.id);
      if (key && settings.cacheEnabled) newCacheEntries[key] = item.text;
    }
  };

  for (const chunk of chunkBlocks(missing, settings.maxBatchChars)) {
    applyResults(await translateBatch(settings, chunk, sourceLanguage, targetLanguage));
    const unresolved = chunk.filter((block) => !translations.get(block.id));
    for (const block of unresolved) {
      applyResults(await translateBatch(settings, [block], sourceLanguage, targetLanguage));
    }
  }
  await setCachedTranslations(newCacheEntries);

  return {
    cached,
    translations: blocks.map<TranslationResult>((block) => ({ id: block.id, text: translations.get(block.id) || "" }))
  };
};

const isInjectableTab = (tab: chrome.tabs.Tab): boolean => {
  const url = tab.url || "";
  return /^https?:\/\//i.test(url) || /^file:\/\//i.test(url);
};

const runContentCommand = async (tabId: number, request: RuntimeRequest): Promise<void> => {
  try {
    await chrome.tabs.sendMessage(tabId, request);
    return;
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content-script.js"] });
    await chrome.tabs.sendMessage(tabId, request);
  }
};

const sendCommandToActiveTab = async (request: RuntimeRequest): Promise<void> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) throw new Error("No active tab found.");
  if (!isInjectableTab(tab)) throw new Error("Amazing Translate can only translate normal web pages, not Chrome internal pages.");
  await runContentCommand(tab.id, request);
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "translate-selection",
    title: "Amazing Translate：翻译选中文本",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "translate-editable",
    title: "Amazing Translate：翻译输入内容",
    contexts: ["editable"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id || !isInjectableTab(tab)) return;
  const type = info.menuItemId === "translate-editable" ? "TRANSLATE_EDITABLE" : "TRANSLATE_SELECTION";
  runContentCommand(tab.id, { type }).catch(console.error);
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "translate-page") sendCommandToActiveTab({ type: "TRANSLATE_PAGE" }).catch(console.error);
});

chrome.runtime.onMessage.addListener((request: RuntimeRequest, _sender, sendResponse) => {
  const run = async (): Promise<RuntimeResponse> => {
    switch (request.type) {
      case "GET_SETTINGS":
        return ok(await getSettings());
      case "SAVE_SETTINGS":
        if (!request.settings) throw new Error("Settings payload is missing.");
        return ok(await saveSettings(request.settings));
      case "CLEAR_CACHE":
        return ok({ cleared: await clearTranslationCache() });
      case "TEST_PROVIDER":
        return ok({ sample: await testProvider(await getSettings()) });
      case "TRANSLATE_BATCH":
        return ok(await translateWithCache(request.blocks));
      case "TRANSLATE_PAGE":
      case "RESTORE_PAGE":
      case "TRANSLATE_SELECTION":
      case "TRANSLATE_EDITABLE":
        await sendCommandToActiveTab(request);
        return ok({ sent: true });
      default:
        throw new Error("Unknown Amazing Translate request.");
    }
  };

  run().then(sendResponse).catch((error) => sendResponse(fail(error)));
  return true;
});
