import { LANGUAGE_OPTIONS } from "../shared/defaults";
import { applyI18n, languageLabel, providerLabel, t } from "../shared/i18n";
import { sendMessage } from "../shared/runtime";
import type { ExtensionSettings, ProviderId } from "../shared/types";
import "./options.css";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const fields = {
  provider: $<HTMLSelectElement>("provider"),
  maxBatchChars: $<HTMLInputElement>("maxBatchChars"),
  deepseekApiKey: $<HTMLInputElement>("deepseekApiKey"),
  deepseekModel: $<HTMLInputElement>("deepseekModel"),
  deepseekBaseUrl: $<HTMLInputElement>("deepseekBaseUrl"),
  glmApiKey: $<HTMLInputElement>("glmApiKey"),
  glmModel: $<HTMLInputElement>("glmModel"),
  glmBaseUrl: $<HTMLInputElement>("glmBaseUrl"),
  sourceLanguage: $<HTMLSelectElement>("sourceLanguage"),
  targetLanguage: $<HTMLSelectElement>("targetLanguage"),
  displayMode: $<HTMLSelectElement>("displayMode"),
  cacheEnabled: $<HTMLInputElement>("cacheEnabled"),
  status: $<HTMLSpanElement>("status")
};

let currentSettings: ExtensionSettings;

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

const setStatus = (message: string, tone: "ok" | "error" | "info" = "info") => {
  fields.status.textContent = message;
  fields.status.dataset.tone = tone;
};

const applyTargetLanguageUi = (targetLanguage: string) => {
  fillLanguageOptions(targetLanguage);
  applyI18n(document, targetLanguage);
  document.title = t(targetLanguage, "optionsPageTitle");
  fields.provider.querySelector<HTMLOptionElement>("option[value=glm]")!.textContent = providerLabel("glm", targetLanguage);
};

const render = (settings: ExtensionSettings) => {
  currentSettings = settings;
  applyTargetLanguageUi(settings.targetLanguage);
  fields.provider.value = settings.provider;
  fields.maxBatchChars.value = String(settings.maxBatchChars);
  fields.deepseekApiKey.value = settings.providers.deepseek.apiKey;
  fields.deepseekModel.value = settings.providers.deepseek.model;
  fields.deepseekBaseUrl.value = settings.providers.deepseek.baseUrl;
  fields.glmApiKey.value = settings.providers.glm.apiKey;
  fields.glmModel.value = settings.providers.glm.model;
  fields.glmBaseUrl.value = settings.providers.glm.baseUrl;
  fields.sourceLanguage.value = settings.sourceLanguage;
  fields.targetLanguage.value = settings.targetLanguage;
  fields.displayMode.value = settings.displayMode;
  fields.cacheEnabled.checked = settings.cacheEnabled;
};

const readSettings = (): ExtensionSettings => ({
  ...currentSettings,
  provider: fields.provider.value as ProviderId,
  maxBatchChars: Number(fields.maxBatchChars.value) || 4000,
  sourceLanguage: fields.sourceLanguage.value,
  targetLanguage: fields.targetLanguage.value,
  displayMode: fields.displayMode.value as ExtensionSettings["displayMode"],
  cacheEnabled: fields.cacheEnabled.checked,
  providers: {
    deepseek: {
      apiKey: fields.deepseekApiKey.value.trim(),
      model: fields.deepseekModel.value.trim(),
      baseUrl: fields.deepseekBaseUrl.value.trim()
    },
    glm: {
      apiKey: fields.glmApiKey.value.trim(),
      model: fields.glmModel.value.trim(),
      baseUrl: fields.glmBaseUrl.value.trim()
    }
  }
});

const load = async () => {
  render(await sendMessage<ExtensionSettings>({ type: "GET_SETTINGS" }));
};

$("save").addEventListener("click", async () => {
  try {
    render(await sendMessage<ExtensionSettings>({ type: "SAVE_SETTINGS", settings: readSettings() }));
    setStatus(t(currentSettings.targetLanguage, "settingsSaved"), "ok");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  }
});

$("test").addEventListener("click", async () => {
  try {
    render(await sendMessage<ExtensionSettings>({ type: "SAVE_SETTINGS", settings: readSettings() }));
    const result = await sendMessage<{ sample: string }>({ type: "TEST_PROVIDER" });
    setStatus(`${t(currentSettings.targetLanguage, "connectionSuccess")}: ${result.sample}`, "ok");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  }
});

fields.targetLanguage.addEventListener("change", () => {
  currentSettings = { ...currentSettings, targetLanguage: fields.targetLanguage.value };
  applyTargetLanguageUi(fields.targetLanguage.value);
});

$("clearCache").addEventListener("click", async () => {
  try {
    const result = await sendMessage<{ cleared: number }>({ type: "CLEAR_CACHE" });
    setStatus(t(currentSettings.targetLanguage, "cacheCleared", { count: result.cleared }), "ok");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  }
});

load().catch((error) => setStatus(error instanceof Error ? error.message : String(error), "error"));
