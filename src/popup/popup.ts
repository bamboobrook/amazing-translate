import { applyI18n, languageLabel, providerLabel, t } from "../shared/i18n";
import { sendMessage } from "../shared/runtime";
import type { ExtensionSettings } from "../shared/types";
import "./popup.css";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
let targetLanguage = "zh-Hans";

const setStatus = (message: string, tone: "info" | "error" = "info") => {
  const status = $<HTMLParagraphElement>("status");
  status.textContent = message;
  status.dataset.tone = tone;
};

const load = async () => {
  const settings = await sendMessage<ExtensionSettings>({ type: "GET_SETTINGS" });
  targetLanguage = settings.targetLanguage;
  applyI18n(document, targetLanguage);
  $("provider").textContent = providerLabel(settings.provider, targetLanguage);
  $("languages").textContent = `${languageLabel(settings.sourceLanguage, targetLanguage)} -> ${languageLabel(settings.targetLanguage, targetLanguage)}`;
};

$("translatePage").addEventListener("click", async () => {
  try {
    await sendMessage({ type: "TRANSLATE_PAGE" });
    setStatus(t(targetLanguage, "translateCommandSent"));
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  }
});

$("restorePage").addEventListener("click", async () => {
  try {
    await sendMessage({ type: "RESTORE_PAGE" });
    setStatus(t(targetLanguage, "restoreCommandSent"));
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  }
});

$("openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());

load().catch((error) => setStatus(error instanceof Error ? error.message : String(error), "error"));
