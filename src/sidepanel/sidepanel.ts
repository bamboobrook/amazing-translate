import { LANGUAGE_OPTIONS } from "../shared/defaults";
import { sendMessage } from "../shared/runtime";
import type { DisplayMode, ExtensionSettings, PageCommandRequest, ProviderId } from "../shared/types";
import "./sidepanel.css";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const languageLabel = (value: string) => LANGUAGE_OPTIONS.find(([id]) => id === value)?.[1] || value;
const providerLabel = (value: ProviderId) => (value === "deepseek" ? "DeepSeek" : "智谱 GLM Coding");

const fields = {
  providerSummary: $<HTMLElement>("providerSummary"),
  languageSummary: $<HTMLElement>("languageSummary"),
  provider: $<HTMLSelectElement>("provider"),
  sourceLanguage: $<HTMLSelectElement>("sourceLanguage"),
  targetLanguage: $<HTMLSelectElement>("targetLanguage"),
  apiKey: $<HTMLInputElement>("apiKey"),
  model: $<HTMLInputElement>("model"),
  baseUrl: $<HTMLInputElement>("baseUrl"),
  cacheEnabled: $<HTMLInputElement>("cacheEnabled"),
  maxBatchChars: $<HTMLInputElement>("maxBatchChars"),
  status: $<HTMLParagraphElement>("status")
};

let currentSettings: ExtensionSettings;

const setStatus = (message: string, tone: "ok" | "error" | "info" = "info") => {
  fields.status.textContent = message;
  fields.status.dataset.tone = tone;
};

const setBusy = (busy: boolean) => {
  document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    button.disabled = busy;
  });
};

const fillLanguageOptions = () => {
  for (const select of [fields.sourceLanguage, fields.targetLanguage]) {
    select.innerHTML = "";
    for (const [value, label] of LANGUAGE_OPTIONS) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.append(option);
    }
  }
};

const getSelectedDisplayMode = (): DisplayMode =>
  document.querySelector<HTMLButtonElement>(".segmented button[data-active='true']")?.dataset.mode as DisplayMode || "below";

const setDisplayMode = (mode: DisplayMode) => {
  document.querySelectorAll<HTMLButtonElement>(".segmented button").forEach((button) => {
    button.dataset.active = String(button.dataset.mode === mode);
  });
};

const readSettingsForProvider = (providerForVisibleFields: ProviderId): ExtensionSettings => ({
  ...currentSettings,
  provider: fields.provider.value as ProviderId,
  sourceLanguage: fields.sourceLanguage.value,
  targetLanguage: fields.targetLanguage.value,
  displayMode: getSelectedDisplayMode(),
  cacheEnabled: fields.cacheEnabled.checked,
  maxBatchChars: Number(fields.maxBatchChars.value) || currentSettings.maxBatchChars,
  providers: {
    ...currentSettings.providers,
    [providerForVisibleFields]: {
      apiKey: fields.apiKey.value.trim(),
      model: fields.model.value.trim(),
      baseUrl: fields.baseUrl.value.trim()
    }
  }
});

const readVisibleSettings = (): ExtensionSettings => readSettingsForProvider(fields.provider.value as ProviderId);

const render = (settings: ExtensionSettings) => {
  currentSettings = settings;
  const activeProvider = settings.provider;
  const providerConfig = settings.providers[activeProvider];
  fields.provider.value = activeProvider;
  fields.sourceLanguage.value = settings.sourceLanguage;
  fields.targetLanguage.value = settings.targetLanguage;
  fields.apiKey.value = providerConfig.apiKey;
  fields.model.value = providerConfig.model;
  fields.baseUrl.value = providerConfig.baseUrl;
  fields.cacheEnabled.checked = settings.cacheEnabled;
  fields.maxBatchChars.value = String(settings.maxBatchChars);
  fields.providerSummary.textContent = `${providerLabel(activeProvider)} · ${providerConfig.model}`;
  fields.languageSummary.textContent = `${languageLabel(settings.sourceLanguage)} → ${languageLabel(settings.targetLanguage)}`;
  setDisplayMode(settings.displayMode);
};

const persistSettings = async (message = "设置已保存", tone: "ok" | "info" = "ok") => {
  currentSettings = await sendMessage<ExtensionSettings>({ type: "SAVE_SETTINGS", settings: readVisibleSettings() });
  render(currentSettings);
  if (message) setStatus(message, tone);
};

const runPageCommand = async (type: PageCommandRequest["type"], successMessage: string) => {
  try {
    setBusy(true);
    await persistSettings("", "info");
    await sendMessage({ type });
    setStatus(successMessage, "ok");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  } finally {
    setBusy(false);
  }
};

const load = async () => {
  fillLanguageOptions();
  render(await sendMessage<ExtensionSettings>({ type: "GET_SETTINGS" }));
  setStatus("就绪");
};

fields.provider.addEventListener("change", async () => {
  try {
    const previousProvider = currentSettings.provider;
    currentSettings = readSettingsForProvider(previousProvider);
    currentSettings.provider = fields.provider.value as ProviderId;
    render(currentSettings);
    await persistSettings("已切换服务商");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  }
});

for (const select of [fields.sourceLanguage, fields.targetLanguage]) {
  select.addEventListener("change", () => persistSettings("语言已更新").catch((error) => setStatus(String(error), "error")));
}

for (const button of document.querySelectorAll<HTMLButtonElement>(".segmented button")) {
  button.addEventListener("click", () => {
    setDisplayMode(button.dataset.mode as DisplayMode);
    persistSettings("显示模式已更新").catch((error) => setStatus(String(error), "error"));
  });
}

$("translatePage").addEventListener("click", () => runPageCommand("TRANSLATE_PAGE", "已开始翻译当前页"));
$("restorePage").addEventListener("click", () => runPageCommand("RESTORE_PAGE", "已恢复原文"));
$("translateSelection").addEventListener("click", () => runPageCommand("TRANSLATE_SELECTION", "已发送划词翻译"));
$("translateEditable").addEventListener("click", () => runPageCommand("TRANSLATE_EDITABLE", "已发送输入框翻译"));

$("saveSettings").addEventListener("click", async () => {
  try {
    setBusy(true);
    await persistSettings();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  } finally {
    setBusy(false);
  }
});

$("testProvider").addEventListener("click", async () => {
  try {
    setBusy(true);
    await persistSettings("", "info");
    const result = await sendMessage<{ sample: string }>({ type: "TEST_PROVIDER" });
    setStatus(`连接成功：${result.sample}`, "ok");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  } finally {
    setBusy(false);
  }
});

$("toggleKey").addEventListener("click", () => {
  fields.apiKey.type = fields.apiKey.type === "password" ? "text" : "password";
});

$("openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());

$("clearCache").addEventListener("click", async () => {
  try {
    const result = await sendMessage<{ cleared: number }>({ type: "CLEAR_CACHE" });
    setStatus(`已清空 ${result.cleared} 条缓存`, "ok");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  }
});

load().catch((error) => setStatus(error instanceof Error ? error.message : String(error), "error"));
