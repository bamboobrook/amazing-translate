type PageCommandType = "TRANSLATE_PAGE" | "RESTORE_PAGE" | "TRANSLATE_SELECTION" | "TRANSLATE_EDITABLE";

type DisplayMode = "below" | "replace";

interface ExtensionSettings {
  displayMode: DisplayMode;
}

interface TextBlock {
  id: string;
  text: string;
}

interface TranslationResult {
  id: string;
  text: string;
}

interface TranslateResponse {
  translations: TranslationResult[];
  cached: number;
}

interface RuntimeOk<T = unknown> {
  ok: true;
  data: T;
}

interface RuntimeErr {
  ok: false;
  error: string;
}

type RuntimeResponse<T = unknown> = RuntimeOk<T> | RuntimeErr;

type RuntimeRequest =
  | { type: "GET_SETTINGS" }
  | { type: "TRANSLATE_BATCH"; blocks: TextBlock[] }
  | { type: PageCommandType };

interface PageTextBlock extends TextBlock {
  element: HTMLElement;
}

interface InsertedTranslation {
  source: HTMLElement;
  node: HTMLElement;
}

const CONTENT_CSS = `.amazing-translate-result{display:block;margin:.18em 0 .72em;padding:0;border:0;background:transparent;color:#2563eb;font-size:.96em;line-height:1.72;font-weight:400;white-space:pre-wrap}.amazing-translate-result:before{content:"";display:none}.amazing-translate-result[data-display-mode=replace]{margin:.18em 0 .72em;color:#172033}.amazing-translate-toolbar{position:fixed;right:18px;bottom:18px;z-index:2147483647;display:flex;gap:8px;padding:8px;border:1px solid #c8d2e4;border-radius:8px;background:#fff;box-shadow:0 10px 30px rgba(25,35,55,.18);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.amazing-translate-toolbar button,.amazing-translate-popover button{border:0;border-radius:6px;background:#2563eb;color:#fff;cursor:pointer;font:inherit;padding:7px 10px}.amazing-translate-toolbar button[data-action=restore]{background:#475569}.amazing-translate-popover{position:absolute;z-index:2147483647;box-sizing:border-box;max-width:360px;padding:12px;border:1px solid #c8d2e4;border-radius:8px;background:#fff;color:#1f2937;box-shadow:0 14px 40px rgba(25,35,55,.22);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;line-height:1.6}.amazing-translate-popover-text{margin-bottom:10px;white-space:pre-wrap}.amazing-translate-toast{position:fixed;left:50%;top:18px;z-index:2147483647;transform:translateX(-50%);max-width:min(520px,calc(100vw - 32px));padding:10px 14px;border-radius:8px;background:#1f2937;color:#fff;box-shadow:0 10px 30px rgba(25,35,55,.2);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px}.amazing-translate-toast.error{background:#b42318}`;

const BLOCK_SELECTOR = [
  "article p",
  "article li",
  "article blockquote",
  "main p",
  "main li",
  "main blockquote",
  "section p",
  "section li",
  "section blockquote",
  "p",
  "li",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "[data-amazing-translate-block]"
].join(",");

const FALLBACK_CONTAINER_SELECTOR = "article, main, [role='main'], .article, .post, .content, .entry-content";

const SKIP_SELECTOR = [
  "script",
  "style",
  "noscript",
  "svg",
  "canvas",
  "pre",
  "code",
  "textarea",
  "input",
  "select",
  "button",
  "nav",
  "footer",
  "header",
  "aside",
  "[contenteditable='true']",
  "[data-amazing-translate]",
  ".amazing-translate-result",
  ".amazing-translate-popover"
].join(",");

const inserted = new Map<string, InsertedTranslation>();
let popover: HTMLElement | null = null;
let toolbar: HTMLElement | null = null;
let stylesInjected = false;

const sendMessage = async <T>(request: RuntimeRequest): Promise<T> => {
  const response = (await chrome.runtime.sendMessage(request)) as RuntimeResponse<T> | undefined;
  if (!response) throw new Error("No response from Amazing Translate background service.");
  if (!response.ok) throw new Error(response.error);
  return response.data;
};

const injectStyles = () => {
  if (stylesInjected) return;
  const style = document.createElement("style");
  style.dataset.amazingTranslate = "true";
  style.textContent = CONTENT_CSS;
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

const hasSkippedAncestor = (element: HTMLElement): boolean => Boolean(element.closest(SKIP_SELECTOR));

const normalizeText = (text: string): string =>
  text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const isVisible = (element: HTMLElement): boolean => {
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

const isMeaningfulText = (text: string): boolean => text.length >= 18 && !/^[-–—•\d\s.,:;!?]+$/.test(text);

const hasBlockDescendant = (element: HTMLElement): boolean =>
  Boolean(element.querySelector("p, li, blockquote, h1, h2, h3, [data-amazing-translate-block]"));

const textWithBreaks = (element: HTMLElement): string => {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  return normalizeText(clone.innerText || clone.textContent || "");
};

const collectFallbackBlocks = (blocks: PageTextBlock[], seen: Set<HTMLElement>) => {
  const containers = Array.from(document.querySelectorAll<HTMLElement>(FALLBACK_CONTAINER_SELECTOR));
  for (const container of containers) {
    if (hasSkippedAncestor(container) || !isVisible(container) || hasBlockDescendant(container)) continue;
    const text = textWithBreaks(container);
    const pieces = text.split(/\n{2,}/).map(normalizeText).filter(isMeaningfulText);
    if (pieces.length <= 1) continue;
    for (const piece of pieces) {
      const id = `block-${blocks.length + 1}`;
      container.dataset.amazingTranslateId = id;
      blocks.push({ id, text: piece, element: container });
    }
    seen.add(container);
  }
};

const collectPageBlocks = (root: ParentNode = document): PageTextBlock[] => {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  const blocks: PageTextBlock[] = [];
  const seen = new Set<HTMLElement>();

  for (const element of candidates) {
    if (seen.has(element) || hasSkippedAncestor(element) || !isVisible(element)) continue;
    if (hasBlockDescendant(element)) continue;
    const text = textWithBreaks(element);
    if (!isMeaningfulText(text)) continue;
    const id = `block-${blocks.length + 1}`;
    element.dataset.amazingTranslateId = id;
    blocks.push({ id, text, element });
    seen.add(element);
  }

  collectFallbackBlocks(blocks, seen);
  return blocks.slice(0, 180);
};

const findEditableTarget = (): HTMLTextAreaElement | HTMLInputElement | HTMLElement | null => {
  const active = document.activeElement;
  if (!active) return null;
  if (active instanceof HTMLTextAreaElement) return active;
  if (active instanceof HTMLInputElement && ["text", "search", "url", "email"].includes(active.type)) return active;
  if (active instanceof HTMLElement && active.isContentEditable) return active;
  return null;
};

const readEditableText = (target: HTMLTextAreaElement | HTMLInputElement | HTMLElement): string => {
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    const selected = target.value.slice(target.selectionStart || 0, target.selectionEnd || 0).trim();
    return selected || target.value.trim();
  }
  const selection = window.getSelection()?.toString().trim();
  return selection || target.innerText.trim();
};

const replaceEditableText = (target: HTMLTextAreaElement | HTMLInputElement | HTMLElement, text: string): void => {
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    const start = target.selectionStart || 0;
    const end = target.selectionEnd || 0;
    if (end > start) target.setRangeText(text, start, end, "end");
    else target.value = text;
    target.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  target.innerText = text;
  target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
};

const ensureToolbar = () => {
  if (toolbar) return toolbar;
  toolbar = document.createElement("div");
  toolbar.className = "amazing-translate-toolbar";
  toolbar.dataset.amazingTranslate = "true";
  toolbar.innerHTML = `<button type="button" data-action="translate">翻译</button><button type="button" data-action="restore">恢复</button>`;
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

const createTranslationNode = (translation: TranslationResult, settings: ExtensionSettings): HTMLElement => {
  const node = document.createElement("div");
  node.className = "amazing-translate-result";
  node.dataset.amazingTranslate = "true";
  node.dataset.amazingTranslateFor = translation.id;
  node.dataset.displayMode = settings.displayMode;
  node.textContent = translation.text;
  return node;
};

const renderTranslations = async (translations: TranslationResult[]) => {
  const settings = await sendMessage<ExtensionSettings>({ type: "GET_SETTINGS" });
  for (const translation of translations) {
    const source = document.querySelector<HTMLElement>(`[data-amazing-translate-id="${translation.id}"]`);
    if (!source || !translation.text) continue;
    inserted.get(translation.id)?.node.remove();
    const node = createTranslationNode(translation, settings);
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
  showToast(`正在逐段翻译 ${blocks.length} 段文本...`);
  try {
    const response = await sendMessage<TranslateResponse>({
      type: "TRANSLATE_BATCH",
      blocks: blocks.map(({ id, text }) => ({ id, text }))
    });
    await renderTranslations(response.translations);
    showToast(response.cached > 0 ? `翻译完成，${response.cached} 段来自缓存` : "逐段翻译完成");
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
    const response = await sendMessage<TranslateResponse>({ type: "TRANSLATE_BATCH", blocks: [{ id: "selection", text }] });
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
    const response = await sendMessage<TranslateResponse>({ type: "TRANSLATE_BATCH", blocks: [{ id: "editable", text }] });
    const translated = response.translations[0]?.text || "";
    showPopover(translated || "没有返回译文", { replacement: () => replaceEditableText(target, translated) });
  } catch (error) {
    showToast(error instanceof Error ? error.message : String(error), "error");
  }
};

injectStyles();
ensureToolbar();

chrome.runtime.onMessage.addListener((request: { type: PageCommandType }) => {
  if (request.type === "TRANSLATE_PAGE") translatePage();
  if (request.type === "RESTORE_PAGE") restorePage();
  if (request.type === "TRANSLATE_SELECTION") translateSelection();
  if (request.type === "TRANSLATE_EDITABLE") translateEditable();
});

if (typeof window !== "undefined") {
  Object.assign(window, {
    __AMAZING_TRANSLATE_DEBUG__: {
      collectPageBlocks,
      translatePage,
      restorePage
    }
  });
}
