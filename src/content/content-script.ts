import { sendMessage } from "../shared/runtime";
import type { ExtensionSettings, PageCommandRequest, TranslateResponse, TranslationResult } from "../shared/types";
import { collectPageBlocks, findEditableTarget, readEditableText, replaceEditableText } from "./dom";
import contentCss from "./content.css?inline";

interface InsertedTranslation {
  source: HTMLElement;
  node: HTMLElement;
}

const inserted = new Map<string, InsertedTranslation>();
let popover: HTMLElement | null = null;
let toolbar: HTMLElement | null = null;
let stylesInjected = false;

const injectStyles = () => {
  if (stylesInjected) return;
  const style = document.createElement("style");
  style.dataset.amazingTranslate = "true";
  style.textContent = contentCss;
  document.documentElement.append(style);
  stylesInjected = true;
};

const showToast = (message: string, tone: "info" | "error" = "info") => {
  const toast = document.createElement("div");
  toast.className = `amazing-translate-toast ${tone}`;
  toast.dataset.amazingTranslate = "true";
  toast.textContent = message;
  document.documentElement.append(toast);
  window.setTimeout(() => toast.remove(), 3600);
};

const ensureToolbar = () => {
  if (toolbar) return toolbar;
  toolbar = document.createElement("div");
  toolbar.className = "amazing-translate-toolbar";
  toolbar.dataset.amazingTranslate = "true";
  toolbar.innerHTML = `
    <button type="button" data-action="translate">翻译</button>
    <button type="button" data-action="restore">恢复</button>
  `;
  toolbar.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const action = target.dataset.action;
    if (action === "translate") translatePage();
    if (action === "restore") restorePage();
  });
  document.documentElement.append(toolbar);
  return toolbar;
};

const restorePage = () => {
  for (const [, item] of inserted) {
    item.source.style.display = "";
    item.node.remove();
  }
  inserted.clear();
  showToast("已恢复原文");
};

const renderTranslations = async (translations: TranslationResult[]) => {
  const settings = await sendMessage<ExtensionSettings>({ type: "GET_SETTINGS" });
  for (const translation of translations) {
    const source = document.querySelector<HTMLElement>(`[data-amazing-translate-id="${translation.id}"]`);
    if (!source || !translation.text) continue;
    inserted.get(translation.id)?.node.remove();
    const node = document.createElement("div");
    node.className = "amazing-translate-result";
    node.dataset.amazingTranslate = "true";
    node.textContent = translation.text;
    if (settings.displayMode === "replace") source.style.display = "none";
    source.insertAdjacentElement("afterend", node);
    inserted.set(translation.id, { source, node });
  }
};

const translatePage = async () => {
  ensureToolbar();
  const blocks = collectPageBlocks();
  if (blocks.length === 0) {
    showToast("没有找到适合翻译的正文内容", "error");
    return;
  }
  showToast(`正在翻译 ${blocks.length} 段文本...`);
  try {
    const response = await sendMessage<TranslateResponse>({
      type: "TRANSLATE_BATCH",
      blocks: blocks.map(({ id, text }) => ({ id, text }))
    });
    await renderTranslations(response.translations);
    showToast(response.cached > 0 ? `翻译完成，${response.cached} 段来自缓存` : "翻译完成");
  } catch (error) {
    showToast(error instanceof Error ? error.message : String(error), "error");
  }
};

const showPopover = (content: string, options?: { replacement?: () => void }) => {
  popover?.remove();
  const selection = window.getSelection();
  const rect = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).getBoundingClientRect() : null;
  popover = document.createElement("div");
  popover.className = "amazing-translate-popover";
  popover.dataset.amazingTranslate = "true";
  const text = document.createElement("div");
  text.className = "amazing-translate-popover-text";
  text.textContent = content;
  popover.append(text);
  if (options?.replacement) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "替换为译文";
    button.addEventListener("click", () => {
      options.replacement?.();
      popover?.remove();
      showToast("已替换输入内容");
    });
    popover.append(button);
  }
  document.documentElement.append(popover);
  const top = rect ? window.scrollY + rect.bottom + 10 : window.scrollY + 80;
  const left = rect ? Math.min(window.scrollX + rect.left, window.scrollX + window.innerWidth - 360) : window.scrollX + 24;
  popover.style.top = `${Math.max(16, top)}px`;
  popover.style.left = `${Math.max(16, left)}px`;
};

const translateSelection = async () => {
  const text = window.getSelection()?.toString().trim();
  if (!text) {
    showToast("请先选择要翻译的文本", "error");
    return;
  }
  try {
    const response = await sendMessage<TranslateResponse>({
      type: "TRANSLATE_BATCH",
      blocks: [{ id: "selection", text }]
    });
    showPopover(response.translations[0]?.text || "没有返回译文");
  } catch (error) {
    showToast(error instanceof Error ? error.message : String(error), "error");
  }
};

const translateEditable = async () => {
  const target = findEditableTarget();
  if (!target) {
    showToast("请先把光标放在输入框中", "error");
    return;
  }
  const text = readEditableText(target);
  if (!text) {
    showToast("输入框没有可翻译内容", "error");
    return;
  }
  try {
    const response = await sendMessage<TranslateResponse>({
      type: "TRANSLATE_BATCH",
      blocks: [{ id: "editable", text }]
    });
    const translated = response.translations[0]?.text || "";
    showPopover(translated || "没有返回译文", { replacement: () => replaceEditableText(target, translated) });
  } catch (error) {
    showToast(error instanceof Error ? error.message : String(error), "error");
  }
};

injectStyles();
ensureToolbar();

chrome.runtime.onMessage.addListener((request: PageCommandRequest) => {
  if (request.type === "TRANSLATE_PAGE") translatePage();
  if (request.type === "RESTORE_PAGE") restorePage();
  if (request.type === "TRANSLATE_SELECTION") translateSelection();
  if (request.type === "TRANSLATE_EDITABLE") translateEditable();
});
