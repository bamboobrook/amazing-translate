import { LANGUAGE_OPTIONS } from "../shared/defaults";
import { applyI18n, languageLabel, providerLabel, t } from "../shared/i18n";
import { sendMessage } from "../shared/runtime";
import type { DisplayMode, ExtensionSettings, PageCommandRequest, ProviderId } from "../shared/types";
import "./sidepanel.css";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

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

const fillLanguageOptions = (targetLanguage = currentSettings?.targetLanguage || "zh-Hans") => {
  for (const select of [fields.sourceLanguage, fields.targetLanguage]) {
    const selectedValue = select.value;
    select.innerHTML = "";
    for (const [value] of LANGUAGE_OPTIONS) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = languageLabel(value, targetLanguage);
      select.append(option);
    }
    if (selectedValue) select.value = selectedValue;
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
  fillLanguageOptions(settings.targetLanguage);
  applyI18n(document, settings.targetLanguage);
  fields.provider.querySelector<HTMLOptionElement>("option[value=glm]")!.textContent = providerLabel("glm", settings.targetLanguage);
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
  fields.providerSummary.textContent = `${providerLabel(activeProvider, settings.targetLanguage)} · ${providerConfig.model}`;
  fields.languageSummary.textContent = `${languageLabel(settings.sourceLanguage, settings.targetLanguage)} → ${languageLabel(settings.targetLanguage, settings.targetLanguage)}`;
  setDisplayMode(settings.displayMode);
};

const persistSettings = async (message = t(currentSettings?.targetLanguage, "settingsSaved"), tone: "ok" | "info" = "ok") => {
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
  render(await sendMessage<ExtensionSettings>({ type: "GET_SETTINGS" }));
  setStatus(t(currentSettings.targetLanguage, "ready"));
};

fields.provider.addEventListener("change", async () => {
  try {
    const previousProvider = currentSettings.provider;
    currentSettings = readSettingsForProvider(previousProvider);
    currentSettings.provider = fields.provider.value as ProviderId;
    render(currentSettings);
    await persistSettings(t(currentSettings.targetLanguage, "providerSwitched"));
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  }
});

for (const select of [fields.sourceLanguage, fields.targetLanguage]) {
  select.addEventListener("change", () => persistSettings(t(fields.targetLanguage.value, "languagesUpdated")).catch((error) => setStatus(String(error), "error")));
}

for (const button of document.querySelectorAll<HTMLButtonElement>(".segmented button")) {
  button.addEventListener("click", () => {
    setDisplayMode(button.dataset.mode as DisplayMode);
    persistSettings(t(currentSettings.targetLanguage, "displayModeUpdated")).catch((error) => setStatus(String(error), "error"));
  });
}

$("translatePage").addEventListener("click", () => runPageCommand("TRANSLATE_PAGE", t(currentSettings.targetLanguage, "startedTranslatingPage")));
$("restorePage").addEventListener("click", () => runPageCommand("RESTORE_PAGE", t(currentSettings.targetLanguage, "restoredOriginal")));
$("translateSelection").addEventListener("click", () => runPageCommand("TRANSLATE_SELECTION", t(currentSettings.targetLanguage, "selectionCommandSent")));
$("translateEditable").addEventListener("click", () => runPageCommand("TRANSLATE_EDITABLE", t(currentSettings.targetLanguage, "editableCommandSent")));

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
    setStatus(`${t(currentSettings.targetLanguage, "connectionSuccess")}: ${result.sample}`, "ok");
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
    setStatus(t(currentSettings.targetLanguage, "cacheCleared", { count: result.cleared }), "ok");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  }
});

load().catch((error) => setStatus(error instanceof Error ? error.message : String(error), "error"));
