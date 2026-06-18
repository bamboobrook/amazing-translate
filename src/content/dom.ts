import type { TextBlock } from "../shared/types";

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
  "[contenteditable='true']",
  "[data-amazing-translate]",
  ".amazing-translate-result",
  ".amazing-translate-popover"
].join(",");

const BLOCK_SELECTOR = "article p, article li, main p, main li, section p, section li, p, li, blockquote, h1, h2, h3";

export interface PageTextBlock extends TextBlock {
  element: HTMLElement;
}

const isVisible = (element: HTMLElement): boolean => {
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

const hasSkippedAncestor = (element: HTMLElement): boolean => Boolean(element.closest(SKIP_SELECTOR));

const normalizeText = (text: string): string => text.replace(/\s+/g, " ").trim();

export const collectPageBlocks = (root: ParentNode = document): PageTextBlock[] => {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  const blocks: PageTextBlock[] = [];
  const seen = new Set<HTMLElement>();

  for (const element of candidates) {
    if (seen.has(element) || hasSkippedAncestor(element) || !isVisible(element)) continue;
    if (element.querySelector("p, li, blockquote")) continue;
    const text = normalizeText(element.innerText || element.textContent || "");
    if (text.length < 24 || /^[-–—•\d\s.,:;!?]+$/.test(text)) continue;
    const id = `block-${blocks.length + 1}`;
    element.dataset.amazingTranslateId = id;
    blocks.push({ id, text, element });
    seen.add(element);
  }
  return blocks.slice(0, 120);
};

export const findEditableTarget = (): HTMLTextAreaElement | HTMLInputElement | HTMLElement | null => {
  const active = document.activeElement;
  if (!active) return null;
  if (active instanceof HTMLTextAreaElement) return active;
  if (active instanceof HTMLInputElement && ["text", "search", "url", "email"].includes(active.type)) return active;
  if (active instanceof HTMLElement && active.isContentEditable) return active;
  return null;
};

export const readEditableText = (target: HTMLTextAreaElement | HTMLInputElement | HTMLElement): string => {
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    const selected = target.value.slice(target.selectionStart || 0, target.selectionEnd || 0).trim();
    return selected || target.value.trim();
  }
  const selection = window.getSelection()?.toString().trim();
  return selection || target.innerText.trim();
};

export const replaceEditableText = (
  target: HTMLTextAreaElement | HTMLInputElement | HTMLElement,
  text: string
): void => {
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    const start = target.selectionStart || 0;
    const end = target.selectionEnd || 0;
    if (end > start) {
      target.setRangeText(text, start, end, "end");
    } else {
      target.value = text;
    }
    target.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  target.innerText = text;
  target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
};
