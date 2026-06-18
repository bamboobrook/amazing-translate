import { LANGUAGE_OPTIONS } from "../shared/defaults";
import { sendMessage } from "../shared/runtime";
import type { ExtensionSettings } from "../shared/types";
import "./popup.css";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const languageLabel = (value: string) => LANGUAGE_OPTIONS.find(([id]) => id === value)?.[1] || value;

const setStatus = (message: string, tone: "info" | "error" = "info") => {
  const status = $<HTMLParagraphElement>("status");
  status.textContent = message;
  status.dataset.tone = tone;
};

const load = async () => {
  const settings = await sendMessage<ExtensionSettings>({ type: "GET_SETTINGS" });
  $("provider").textContent = settings.provider === "deepseek" ? "DeepSeek" : "智谱 GLM Coding";
  $("languages").textContent = `${languageLabel(settings.sourceLanguage)} -> ${languageLabel(settings.targetLanguage)}`;
};

$("translatePage").addEventListener("click", async () => {
  try {
    await sendMessage({ type: "TRANSLATE_PAGE" });
    setStatus("已发送翻译指令");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  }
});

$("restorePage").addEventListener("click", async () => {
  try {
    await sendMessage({ type: "RESTORE_PAGE" });
    setStatus("已发送恢复指令");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  }
});

$("openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());

load().catch((error) => setStatus(error instanceof Error ? error.message : String(error), "error"));
