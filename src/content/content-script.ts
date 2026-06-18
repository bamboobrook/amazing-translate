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
  sourceText: string;
}

type TranslationPlacement = "after" | "compact-block" | "compact-inline";

interface AmazingTranslateDebugApi {
  collectPageBlocks: (root?: ParentNode, options?: { onlyUntranslated?: boolean }) => PageTextBlock[];
  translatePage: () => Promise<void>;
  restorePage: () => void;
  ensureToolbar: () => HTMLElement;
}

interface AmazingWindow extends Window {
  __AMAZING_TRANSLATE_LOADED__?: boolean;
  __AMAZING_TRANSLATE_DEBUG__?: AmazingTranslateDebugApi;
}

{
const amazingWindow = window as AmazingWindow;
if (amazingWindow.__AMAZING_TRANSLATE_LOADED__) {
  amazingWindow.__AMAZING_TRANSLATE_DEBUG__?.ensureToolbar();
} else {
  amazingWindow.__AMAZING_TRANSLATE_LOADED__ = true;

const CONTENT_CSS = `
.amazing-translate-result{display:block;margin:.08em 0 .34em;padding:0;border:0;background:transparent;color:#2563eb;font-size:.96em;line-height:1.48;font-weight:400;white-space:pre-wrap}.amazing-translate-result:before{content:"";display:none}.amazing-translate-result[data-display-mode=replace]{margin:.08em 0 .34em;color:#172033}.amazing-translate-result[data-placement=compact-block]{display:block;margin:.04em 0 0;font-size:.92em;line-height:1.28;white-space:normal}.amazing-translate-result[data-placement=compact-inline]{display:inline;margin:0 0 0 .28em;font-size:.9em;line-height:inherit;white-space:normal}.amazing-translate-page-panel{position:fixed;right:16px;bottom:16px;z-index:2147483647;box-sizing:border-box;width:214px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#172033;box-shadow:0 18px 42px rgba(20,31,48,.2);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;line-height:1.35;overflow:hidden}.amazing-translate-page-panel[data-collapsed=true]{width:auto}.amazing-translate-page-panel[data-collapsed=true] .amazing-translate-page-panel-body,.amazing-translate-page-panel[data-collapsed=true] .amazing-translate-page-panel-title small{display:none}.amazing-translate-page-panel-header{display:flex;align-items:center;gap:8px;padding:9px 10px;border-bottom:1px solid #e2e8f0;background:#f8fafc}.amazing-translate-page-panel-mark{display:grid;place-items:center;width:26px;height:26px;border-radius:7px;background:#0f766e;color:#fff;font-size:11px;font-weight:800}.amazing-translate-page-panel-title{display:grid;min-width:0;flex:1}.amazing-translate-page-panel-title strong{font-size:13px;line-height:1.1}.amazing-translate-page-panel-title small{color:#64748b;font-size:11px;line-height:1.3}.amazing-translate-page-panel-toggle{width:28px;height:28px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#0f766e;cursor:pointer;font:inherit;font-weight:800;padding:0}.amazing-translate-page-panel-body{display:grid;gap:8px;padding:10px}.amazing-translate-page-panel-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.amazing-translate-page-panel button{font-family:inherit}.amazing-translate-page-panel-action{min-height:34px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#172033;cursor:pointer;font-size:12px;font-weight:760;padding:7px 8px}.amazing-translate-page-panel-action.primary{border-color:#0f766e;background:#0f766e;color:#fff}.amazing-translate-page-panel-action.secondary{background:#475569;border-color:#475569;color:#fff}.amazing-translate-popover{position:absolute;z-index:2147483647;box-sizing:border-box;max-width:360px;padding:12px;border:1px solid #c8d2e4;border-radius:8px;background:#fff;color:#1f2937;box-shadow:0 14px 40px rgba(25,35,55,.22);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;line-height:1.6}.amazing-translate-popover button{border:0;border-radius:6px;background:#2563eb;color:#fff;cursor:pointer;font:inherit;padding:7px 10px}.amazing-translate-popover-text{margin-bottom:10px;white-space:pre-wrap}.amazing-translate-toast{position:fixed;left:50%;top:18px;z-index:2147483647;transform:translateX(-50%);max-width:min(520px,calc(100vw - 32px));padding:10px 14px;border-radius:8px;background:#1f2937;color:#fff;box-shadow:0 10px 30px rgba(25,35,55,.2);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px}.amazing-translate-toast.error{background:#b42318}
`;

const MAX_PAGE_BLOCKS = 600;
const GENERIC_TEXT_LIMIT = 360;
const COMPACT_TEXT_LIMIT = 88;
const COMPACT_PARENT_DISPLAYS = new Set(["flex", "inline-flex", "grid", "inline-grid"]);

const SEMANTIC_TEXT_SELECTOR = [
  "p",
  "li",
  "blockquote",
  "figcaption",
  "summary",
  "dt",
  "dd",
  "th",
  "td",
  "caption",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "[data-amazing-translate-block]"
].join(",");

const NEWS_TEXT_SELECTOR = [
  "header a[href]",
  "nav a[href]",
  "[role='navigation'] a[href]",
  "main a[href]",
  "article a[href]",
  "[role='main'] a[href]",
  "main span",
  "main div",
  "article span",
  "article div",
  "[role='main'] span",
  "[role='main'] div",
  "[class*='headline' i]",
  "[class*='title' i]",
  "[class*='description' i]",
  "[class*='summary' i]",
  "[class*='excerpt' i]",
  "[class*='category' i]",
  "[class*='eyebrow' i]",
  "[class*='kicker' i]",
  "[class*='label' i]",
  "[data-testid*='headline' i]",
  "[data-testid*='title' i]",
  "[aria-label][href]"
].join(",");

const BLOCK_SELECTOR = `${SEMANTIC_TEXT_SELECTOR},${NEWS_TEXT_SELECTOR}`;

const FALLBACK_CONTAINER_SELECTOR = "article, main, [role='main'], .article, .post, .content, .entry-content";
const SEMANTIC_TAGS = new Set(["P", "LI", "BLOCKQUOTE", "FIGCAPTION", "SUMMARY", "DT", "DD", "TH", "TD", "CAPTION", "H1", "H2", "H3", "H4", "H5", "H6"]);

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
  "footer",
  "[contenteditable='true']",
  "[data-amazing-translate]",
  ".amazing-translate-result",
  ".amazing-translate-popover"
].join(",");

const inserted = new Map<string, InsertedTranslation>();
let popover: HTMLElement | null = null;
let toolbar: HTMLElement | null = null;
let stylesInjected = false;
let nextBlockId = 1;
let pageTranslationActive = false;
let translatingPage = false;
let pendingPageTranslation = false;
let mutationObserver: MutationObserver | null = null;
let incrementalTimer: number | null = null;

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

const isMeaningfulText = (text: string): boolean => {
  if (text.length < 10 || /^[-–—•\d\s.,:;!?]+$/.test(text)) return false;
  const letters = text.match(/[A-Za-z]/g)?.length || 0;
  if (letters < 5) return false;
  if (/^(by|updated|published|sponsored by|advertisement|sign up|log in|subscribe)\b/i.test(text)) return false;
  if (/^by\s+[A-Z][A-Za-z .-]+[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}$/i.test(text)) return false;
  return true;
};

const isShortUiLabelText = (text: string): boolean => {
  if (text.length < 3 || text.length > 60 || /[\n\r]/.test(text)) return false;
  if (/[\d$€¥£%]/.test(text)) return false;
  if (/^[-–—•/.,:;!?&+\s]+$/.test(text)) return false;
  if (/^(en|search|preview|log in|login|sign up|subscribe|advertisement)$/i.test(text)) return false;
  const words = text.match(/[A-Za-z][A-Za-z&-]*/g) || [];
  return words.some((word) => /[a-z]{2,}/.test(word));
};

const getElementMetadata = (element: HTMLElement): string =>
  [
    element.className,
    element.id,
    element.getAttribute("role"),
    element.getAttribute("data-testid"),
    element.getAttribute("aria-label")
  ]
    .filter(Boolean)
    .join(" ");

const isLikelyUiLabelElement = (element: HTMLElement): boolean => {
  if (element.closest("header,nav,[role='navigation']")) return element.matches("a[href],span,div,li");
  if (element.matches("a[href],h1,h2,h3,h4,h5,h6,[role='heading'],summary,dt,th,caption")) return true;
  if (/(category|eyebrow|kicker|label|headline|heading|title|nav|menu|tab)/i.test(getElementMetadata(element))) return true;
  const parentDisplay = element.parentElement ? window.getComputedStyle(element.parentElement).display : "";
  return COMPACT_PARENT_DISPLAYS.has(parentDisplay) && element.childElementCount <= 2;
};

const isTranslatableText = (element: HTMLElement, text: string): boolean =>
  isMeaningfulText(text) || (isLikelyUiLabelElement(element) && isShortUiLabelText(text));

const isSemanticTextElement = (element: HTMLElement): boolean =>
  SEMANTIC_TAGS.has(element.tagName) || element.hasAttribute("data-amazing-translate-block");

const hasBlockDescendant = (element: HTMLElement): boolean =>
  Boolean(element.querySelector(SEMANTIC_TEXT_SELECTOR));

const textWithBreaks = (element: HTMLElement): string => {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  clone.querySelectorAll("[data-amazing-translate]").forEach((node) => node.remove());
  return normalizeText(clone.innerText || clone.textContent || "");
};

const hasCollectableDescendant = (element: HTMLElement): boolean => {
  const descendants = Array.from(element.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  for (const child of descendants) {
    if (child === element || hasSkippedAncestor(child) || !isVisible(child)) continue;
    const text = textWithBreaks(child);
    if (!isTranslatableText(child, text)) continue;
    if (!isSemanticTextElement(child) && text.length > GENERIC_TEXT_LIMIT) continue;
    return true;
  }
  return false;
};

const hasSelectedAncestor = (element: HTMLElement): boolean => {
  const selected = element.parentElement?.closest<HTMLElement>("[data-amazing-translate-id]");
  return Boolean(selected);
};

const removeInsertedTranslation = (id: string): void => {
  const item = inserted.get(id);
  if (!item) return;
  item.source.style.display = "";
  delete item.source.dataset.amazingTranslateId;
  item.node.remove();
  inserted.delete(id);
};

const isTranslationCurrent = (element: HTMLElement, text: string): boolean => {
  const id = element.dataset.amazingTranslateId;
  if (!id) return false;
  const item = inserted.get(id);
  return Boolean(item && item.source === element && item.sourceText === text);
};

const removeStaleTranslation = (element: HTMLElement, text: string): void => {
  const id = element.dataset.amazingTranslateId;
  if (!id) return;
  const item = inserted.get(id);
  if (item && item.source === element && item.sourceText !== text) removeInsertedTranslation(id);
};

const allocateBlockId = (element: HTMLElement): string => {
  const existing = element.dataset.amazingTranslateId;
  if (existing && !inserted.has(existing)) return existing;
  let id = `block-${nextBlockId++}`;
  while (inserted.has(id) || document.querySelector(`[data-amazing-translate-id="${id}"]`)) {
    id = `block-${nextBlockId++}`;
  }
  return id;
};

const addBlock = (blocks: PageTextBlock[], seen: Set<HTMLElement>, element: HTMLElement, text: string): void => {
  if (seen.has(element)) return;
  const id = allocateBlockId(element);
  element.dataset.amazingTranslateId = id;
  blocks.push({ id, text, element });
  seen.add(element);
};

const shouldCollectElement = (element: HTMLElement, seen: Set<HTMLElement>, _onlyUntranslated: boolean): boolean => {
  if (seen.has(element) || hasSkippedAncestor(element) || hasSelectedAncestor(element) || !isVisible(element)) return false;
  if (isSemanticTextElement(element)) return !hasBlockDescendant(element);
  if (hasBlockDescendant(element) || hasCollectableDescendant(element)) return false;
  return true;
};

const collectFallbackBlocks = (
  blocks: PageTextBlock[],
  seen: Set<HTMLElement>,
  onlyUntranslated: boolean
) => {
  const containers = Array.from(document.querySelectorAll<HTMLElement>(FALLBACK_CONTAINER_SELECTOR));
  for (const container of containers) {
    if (!shouldCollectElement(container, seen, onlyUntranslated) || hasBlockDescendant(container)) continue;
    const text = textWithBreaks(container);
    if (!isTranslatableText(container, text) || text.length > GENERIC_TEXT_LIMIT) continue;
    if (onlyUntranslated && isTranslationCurrent(container, text)) continue;
    if (onlyUntranslated) removeStaleTranslation(container, text);
    addBlock(blocks, seen, container, text);
    if (blocks.length >= MAX_PAGE_BLOCKS) return;
  }
};

const collectPageBlocks = (root: ParentNode = document, options: { onlyUntranslated?: boolean } = {}): PageTextBlock[] => {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  const blocks: PageTextBlock[] = [];
  const seen = new Set<HTMLElement>();
  const onlyUntranslated = options.onlyUntranslated ?? false;

  for (const element of candidates) {
    if (!shouldCollectElement(element, seen, onlyUntranslated)) continue;
    const text = textWithBreaks(element);
    if (!isTranslatableText(element, text)) continue;
    if (!isSemanticTextElement(element) && text.length > GENERIC_TEXT_LIMIT) continue;
    if (onlyUntranslated && isTranslationCurrent(element, text)) continue;
    if (onlyUntranslated) removeStaleTranslation(element, text);
    addBlock(blocks, seen, element, text);
    if (blocks.length >= MAX_PAGE_BLOCKS) return blocks;
  }

  collectFallbackBlocks(blocks, seen, onlyUntranslated);
  return blocks.slice(0, MAX_PAGE_BLOCKS);
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
  toolbar.className = "amazing-translate-page-panel";
  toolbar.dataset.amazingTranslate = "true";
  toolbar.innerHTML = `<div class="amazing-translate-page-panel-header"><span class="amazing-translate-page-panel-mark">AT</span><span class="amazing-translate-page-panel-title"><strong>Amazing Translate</strong><small>当前页翻译</small></span><button type="button" class="amazing-translate-page-panel-toggle" data-action="toggle" aria-label="收起或展开">−</button></div><div class="amazing-translate-page-panel-body"><button type="button" class="amazing-translate-page-panel-action primary" data-action="translate">翻译网页</button><div class="amazing-translate-page-panel-grid"><button type="button" class="amazing-translate-page-panel-action" data-action="selection">划词</button><button type="button" class="amazing-translate-page-panel-action" data-action="editable">输入框</button></div><button type="button" class="amazing-translate-page-panel-action secondary" data-action="restore">恢复原文</button></div>`;
  toolbar.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("button[data-action]");
    const action = button?.dataset.action;
    if (!action) return;
    if (action === "toggle") {
      const collapsed = toolbar?.dataset.collapsed === "true";
      if (toolbar) toolbar.dataset.collapsed = String(!collapsed);
      button.textContent = collapsed ? "−" : "+";
      return;
    }
    if (action === "translate") translatePage();
    if (action === "selection") translateSelection();
    if (action === "editable") translateEditable();
    if (action === "restore") restorePage();
  });
  document.documentElement.append(toolbar);
  return toolbar;
};

const scheduleIncrementalTranslation = (delay = 900) => {
  if (!pageTranslationActive) return;
  if (incrementalTimer !== null) window.clearTimeout(incrementalTimer);
  incrementalTimer = window.setTimeout(() => {
    incrementalTimer = null;
    void translatePage({ incremental: true });
  }, delay);
};

const startContinuousTranslation = () => {
  if (!mutationObserver) {
    mutationObserver = new MutationObserver((mutations) => {
      const hasChangedContent = mutations.some((mutation) =>
        mutation.type === "characterData" ||
        (mutation.target instanceof HTMLElement && Boolean(mutation.target.closest("[data-amazing-translate-id]"))) ||
        Array.from(mutation.addedNodes).some(
          (node) => node instanceof HTMLElement && !node.matches("[data-amazing-translate]") && !hasSkippedAncestor(node)
        )
      );
      if (hasChangedContent) scheduleIncrementalTranslation();
    });
    mutationObserver.observe(document.body || document.documentElement, { childList: true, characterData: true, subtree: true });
  }
  window.addEventListener("scroll", handleViewportChange, { passive: true });
  window.addEventListener("resize", handleViewportChange, { passive: true });
};

const stopContinuousTranslation = () => {
  mutationObserver?.disconnect();
  mutationObserver = null;
  window.removeEventListener("scroll", handleViewportChange);
  window.removeEventListener("resize", handleViewportChange);
  if (incrementalTimer !== null) window.clearTimeout(incrementalTimer);
  incrementalTimer = null;
};

const handleViewportChange = () => scheduleIncrementalTranslation();

const restorePage = () => {
  pageTranslationActive = false;
  pendingPageTranslation = false;
  stopContinuousTranslation();
  for (const id of Array.from(inserted.keys())) removeInsertedTranslation(id);
  inserted.clear();
  showToast("已恢复原文");
};

const chooseTranslationPlacement = (source: HTMLElement, sourceText: string, settings: ExtensionSettings): TranslationPlacement => {
  if (settings.displayMode === "replace") return "after";
  if (source.closest("header,nav,[role='navigation']")) return source.matches("a[href],span,li") ? "compact-inline" : "compact-block";
  const parentDisplay = source.parentElement ? window.getComputedStyle(source.parentElement).display : "";
  if (COMPACT_PARENT_DISPLAYS.has(parentDisplay) && sourceText.length <= COMPACT_TEXT_LIMIT) {
    return source.matches("a[href]") ? "compact-inline" : "compact-block";
  }
  if (isLikelyUiLabelElement(source) && isShortUiLabelText(sourceText)) {
    return source.matches("a[href]") ? "compact-inline" : "compact-block";
  }
  return "after";
};

const createTranslationNode = (translation: TranslationResult, settings: ExtensionSettings, placement: TranslationPlacement): HTMLElement => {
  const node = document.createElement(placement === "after" ? "div" : "span");
  node.className = "amazing-translate-result";
  node.dataset.amazingTranslate = "true";
  node.dataset.amazingTranslateFor = translation.id;
  node.dataset.displayMode = settings.displayMode;
  node.dataset.placement = placement;
  node.textContent = translation.text;
  return node;
};

const insertTranslationNode = (source: HTMLElement, node: HTMLElement, placement: TranslationPlacement): void => {
  if (placement === "after") source.insertAdjacentElement("afterend", node);
  else source.append(node);
};

const renderTranslations = async (translations: TranslationResult[], sourceTexts = new Map<string, string>()): Promise<number> => {
  const settings = await sendMessage<ExtensionSettings>({ type: "GET_SETTINGS" });
  let rendered = 0;
  for (const translation of translations) {
    const source = document.querySelector<HTMLElement>(`[data-amazing-translate-id="${translation.id}"]`);
    if (!source || !translation.text) continue;
    const expectedSourceText = sourceTexts.get(translation.id);
    const currentSourceText = textWithBreaks(source);
    if (expectedSourceText && currentSourceText !== expectedSourceText) {
      removeInsertedTranslation(translation.id);
      if (pageTranslationActive) pendingPageTranslation = true;
      continue;
    }
    inserted.get(translation.id)?.node.remove();
    const sourceText = expectedSourceText || currentSourceText;
    const placement = chooseTranslationPlacement(source, sourceText, settings);
    const node = createTranslationNode(translation, settings, placement);
    source.style.display = settings.displayMode === "replace" ? "none" : "";
    insertTranslationNode(source, node, placement);
    inserted.set(translation.id, { source, node, sourceText });
    rendered += 1;
  }
  return rendered;
};

const translatePage = async (options: { incremental?: boolean } = {}) => {
  ensureToolbar();
  const incremental = options.incremental ?? false;
  if (translatingPage) {
    pendingPageTranslation = true;
    return;
  }

  pageTranslationActive = true;
  startContinuousTranslation();
  translatingPage = true;

  try {
    const blocks = collectPageBlocks(document, { onlyUntranslated: true });
    if (blocks.length === 0) {
      if (!incremental) showToast(inserted.size > 0 ? "当前页面内容已翻译" : "没有找到适合翻译的正文内容", inserted.size > 0 ? "info" : "error");
      return;
    }

    if (!incremental) showToast(`正在逐段翻译 ${blocks.length} 段文本...`);
    const response = await sendMessage<TranslateResponse>({
      type: "TRANSLATE_BATCH",
      blocks: blocks.map(({ id, text }) => ({ id, text }))
    });
    const rendered = await renderTranslations(response.translations, new Map(blocks.map((block) => [block.id, block.text])));

    if (!incremental) {
      const cacheText = response.cached > 0 ? `，${response.cached} 段来自缓存` : "";
      showToast(`逐段翻译完成：${rendered}/${blocks.length} 段${cacheText}`);
    }
  } catch (error) {
    pageTranslationActive = false;
    stopContinuousTranslation();
    showToast(error instanceof Error ? error.message : String(error), "error");
  } finally {
    translatingPage = false;
    if (pendingPageTranslation && pageTranslationActive) {
      pendingPageTranslation = false;
      scheduleIncrementalTranslation(160);
    }
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
  Object.assign(amazingWindow, {
    __AMAZING_TRANSLATE_DEBUG__: {
      collectPageBlocks,
      translatePage,
      restorePage,
      ensureToolbar
    }
  });
}
}
}
