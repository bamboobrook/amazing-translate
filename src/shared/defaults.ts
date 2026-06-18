import type { ExtensionSettings } from "./types";

export const DEFAULT_SETTINGS: ExtensionSettings = {
  provider: "deepseek",
  sourceLanguage: "auto",
  targetLanguage: "zh-Hans",
  displayMode: "below",
  maxBatchChars: 4000,
  cacheEnabled: true,
  providers: {
    deepseek: {
      apiKey: "",
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-v4-flash"
    },
    glm: {
      apiKey: "",
      baseUrl: "https://open.bigmodel.cn/api/coding/paas/v4",
      model: "glm-5.2"
    }
  }
};

export const LANGUAGE_OPTIONS = [
  ["auto", "自动识别"],
  ["zh-Hans", "简体中文"],
  ["zh-Hant", "繁体中文"],
  ["en", "English"],
  ["ja", "日本語"],
  ["ko", "한국어"],
  ["fr", "Français"],
  ["de", "Deutsch"],
  ["es", "Español"],
  ["ru", "Русский"]
] as const;
