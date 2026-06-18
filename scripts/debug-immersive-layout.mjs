import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = [
  '<!doctype html><html><body>',
  '<header>',
  '  <nav style="display:flex;gap:24px"><a href="/news">News</a><a href="/video">Video</a><a href="/prices">Prices</a></nav>',
  '</header>',
  '<main>',
  '  <section style="display:flex;justify-content:space-between;align-items:center">',
  '    <h2>Featured Stories</h2>',
  '    <a href="/stories">View all stories</a>',
  '  </section>',
  '  <article>',
  '    <h1 style="color:rgb(89, 42, 130)">A concise heading for immersive translation testing</h1>',
  '    <p style="color:rgb(35, 47, 62)">Modern browser extensions can improve reading workflows without sending every page to a remote service automatically.</p>',
  '    <p>A manual translation flow gives the reader control over cost, privacy, and timing.</p>',
  '    <blockquote>Selected text should stay close to its original paragraph when translated inline.</blockquote>',
  '  </article>',
  '</main>',
  '</body></html>'
].join('\n');

const dom = new JSDOM(html, {
  url: 'https://example.test/article',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});

const { window } = dom;
Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
  get() {
    return this.textContent;
  },
  set(value) {
    this.textContent = value;
  },
  configurable: true
});
window.HTMLElement.prototype.getBoundingClientRect = function () {
  const top = Number.parseFloat(this.style.top || '0') || 0;
  return { x: 0, y: top, top, left: 0, right: 640, bottom: top + 42, width: 640, height: 42, toJSON: () => ({}) };
};

if (!window.PointerEvent) {
  window.PointerEvent = class PointerEvent extends window.MouseEvent {
    constructor(type, init = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
    }
  };
}

window.HTMLElement.prototype.setPointerCapture = function () {};
window.HTMLElement.prototype.releasePointerCapture = function () {};

const capturedBlocks = [];
let batchDelayMs = 0;
const selectionRect = { x: 0, y: 0, top: 96, left: 80, right: 300, bottom: 118, width: 220, height: 22, toJSON: () => ({}) };
const selectionRange = {
  getBoundingClientRect: () => selectionRect,
  getClientRects: () => [selectionRect]
};
let selectedText = 'Selected text should close automatically after translation';
window.getSelection = () => ({
  toString: () => selectedText,
  rangeCount: selectedText ? 1 : 0,
  getRangeAt: () => selectionRange
});
window.chrome = {
  runtime: {
    sendMessage: async (request) => {
      if (request.type === 'GET_SETTINGS') return { ok: true, data: { displayMode: 'below' } };
      if (request.type === 'TRANSLATE_BATCH') {
        capturedBlocks.push(...request.blocks);
        if (batchDelayMs > 0) await new Promise((resolve) => window.setTimeout(resolve, batchDelayMs));
        return {
          ok: true,
          data: {
            cached: 0,
            translations: request.blocks.map((block, index) => ({
              id: block.id,
              text: '译文 ' + (index + 1) + ': ' + block.text.slice(0, 42)
            }))
          }
        };
      }
      return { ok: true, data: { sent: true } };
    },
    onMessage: { addListener: (listener) => { window.chrome.runtime.onMessage._listener = listener; } }
  }
};

window.eval(readFileSync('dist/content-script.js', 'utf8'));
const initialToolbarActions = [...window.document.querySelectorAll('.amazing-translate-page-panel button[data-action]')].map((button) => button.getAttribute('data-action'));
window.__AMAZING_TRANSLATE_DEBUG__.showSelectionButton();
await new Promise((resolve) => window.setTimeout(resolve, 0));
const selectionButton = window.document.querySelector('.amazing-translate-selection-button');
selectionButton?.dispatchEvent(new window.Event('click', { bubbles: true }));
await new Promise((resolve) => window.setTimeout(resolve, 0));
const selectionPopoverFromButton = window.document.querySelector('.amazing-translate-popover');
const selectionButtonAfterPopover = window.document.querySelector('.amazing-translate-selection-button');
window.__AMAZING_TRANSLATE_DEBUG__.closePopover();

const toolbar = window.document.querySelector('.amazing-translate-page-panel');
const toolbarButton = window.document.querySelector('.amazing-translate-page-toggle');
const translateMessagesBeforeDrag = capturedBlocks.length;
toolbar?.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 7, clientY: 500 }));
toolbar?.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, button: 0, pointerId: 7, clientY: 610 }));
toolbar?.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, button: 0, pointerId: 7, clientY: 610 }));
toolbarButton?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise((resolve) => window.setTimeout(resolve, 0));
const translateMessagesAfterDrag = capturedBlocks.length;
const draggedToolbarTop = toolbar?.style.top || '';

await new Promise((resolve) => window.setTimeout(resolve, 150));
const translateMessagesBeforeToolbarClick = capturedBlocks.length;
toolbarButton?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise((resolve) => window.setTimeout(resolve, 30));
const translateMessagesAfterToolbarClick = capturedBlocks.length;
const toolbarActionAfterClick = window.document.querySelector('.amazing-translate-page-toggle')?.getAttribute('data-action');
window.__AMAZING_TRANSLATE_DEBUG__.restorePage();
await new Promise((resolve) => window.setTimeout(resolve, 0));
const toolbarActionAfterRestore = window.document.querySelector('.amazing-translate-page-toggle')?.getAttribute('data-action');

batchDelayMs = 25;
const pageTranslate = window.__AMAZING_TRANSLATE_DEBUG__.translatePage();
await new Promise((resolve) => window.setTimeout(resolve, 0));
const pendingDuringTranslate = [...window.document.querySelectorAll('.amazing-translate-pending')];
await pageTranslate;
await new Promise((resolve) => window.setTimeout(resolve, 0));
const pendingAfterTranslate = [...window.document.querySelectorAll('.amazing-translate-pending')];
batchDelayMs = 0;

const translatedToolbarAction = window.document.querySelector('.amazing-translate-page-toggle')?.getAttribute('data-action');
const translatedToolbarLabel = window.document.querySelector('.amazing-translate-page-toggle-label')?.textContent || '';

window.chrome.runtime.onMessage._listener({ type: 'TRANSLATE_SELECTION' });
await new Promise((resolve) => window.setTimeout(resolve, 0));
const selectionPopover = window.document.querySelector('.amazing-translate-popover');
window.__AMAZING_TRANSLATE_DEBUG__.closePopover();
const popoverAfterDebugClose = window.document.querySelector('.amazing-translate-popover');
window.chrome.runtime.onMessage._listener({ type: 'TRANSLATE_SELECTION' });
await new Promise((resolve) => window.setTimeout(resolve, 0));
window.document.body.dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
const popoverAfterOutsideClick = window.document.querySelector('.amazing-translate-popover');

const translations = [...window.document.querySelectorAll('.amazing-translate-result')];
const sources = [...window.document.querySelectorAll('[data-amazing-translate-id]')];
const failures = [];

const translationFor = (source) => {
  const id = source.getAttribute('data-amazing-translate-id');
  return [...source.children].find((child) => child.classList?.contains('amazing-translate-result') && child.getAttribute('data-amazing-translate-for') === id)
    || (source.nextElementSibling?.classList.contains('amazing-translate-result') && source.nextElementSibling.getAttribute('data-amazing-translate-for') === id ? source.nextElementSibling : null);
};

const capturedText = capturedBlocks.map((block) => block.text);
for (const expected of ['News', 'Video', 'Prices', 'Featured Stories', 'View all stories']) {
  if (!capturedText.includes(expected)) failures.push('expected to capture compact/navigation label: ' + expected);
}
if (!capturedText.some((text) => /Modern browser extensions/.test(text))) failures.push('expected article paragraph text to be captured');
if (initialToolbarActions.length !== 1 || initialToolbarActions[0] !== 'translate') failures.push('expected default toolbar to expose one translate button, got ' + initialToolbarActions.join(','));
if (translatedToolbarAction !== 'restore' || !translatedToolbarLabel.includes('恢复原文')) failures.push('expected toolbar to switch to restore after translating page');
if (!selectionButton) failures.push('selection AT button was not shown');
if (!selectionPopoverFromButton) failures.push('selection AT button did not open translation popover');
if (selectionButtonAfterPopover) failures.push('selection AT button should disappear while translation popover is visible');
if (!selectionPopover) failures.push('selection translation popover was not shown');
if (popoverAfterDebugClose) failures.push('popover did not close through debug close helper');
if (popoverAfterOutsideClick) failures.push('popover did not close when clicking outside');
if (translations.length !== pendingDuringTranslate.length) failures.push('expected ' + pendingDuringTranslate.length + ' page translation nodes, got ' + translations.length);
if (pendingDuringTranslate.length === 0) failures.push('expected pending spinners while page translation request is in flight');
if (pendingAfterTranslate.length !== 0) failures.push('expected pending spinners to be removed after translation');
if (!draggedToolbarTop || Number.parseFloat(draggedToolbarTop) <= 0) failures.push('expected toolbar to move vertically after drag, got top=' + draggedToolbarTop);
if (translateMessagesAfterDrag !== translateMessagesBeforeDrag) failures.push('dragging toolbar should not trigger page translation click');
if (translateMessagesAfterToolbarClick <= translateMessagesBeforeToolbarClick) failures.push('plain toolbar button click should trigger page translation');
if (toolbarActionAfterClick !== 'restore') failures.push('plain toolbar click should switch action to restore, got ' + toolbarActionAfterClick);
if (toolbarActionAfterRestore !== 'translate') failures.push('restorePage should reset toolbar action to translate, got ' + toolbarActionAfterRestore);

for (const source of sources) {
  const id = source.getAttribute('data-amazing-translate-id');
  const node = translationFor(source);
  if (!node) failures.push(id + ' does not have an adjacent or compact child translation node');
}

const coloredParagraph = sources.find((source) => source.textContent?.includes('Modern browser extensions'));
const coloredParagraphTranslation = coloredParagraph ? translationFor(coloredParagraph) : null;
if (!coloredParagraphTranslation) failures.push('colored source paragraph should have a translation node');
else if (coloredParagraphTranslation.style.color !== window.getComputedStyle(coloredParagraph).color) failures.push('translation color should match source color');

const featured = [...sources].find((source) => source.textContent?.includes('Featured Stories'));
const viewAll = [...sources].find((source) => source.textContent?.includes('View all stories'));
if (featured && translationFor(featured)?.getAttribute('data-placement') !== 'compact-block') failures.push('Featured Stories should use compact block placement inside the heading');
if (viewAll && translationFor(viewAll)?.getAttribute('data-placement') !== 'compact-inline') failures.push('View all stories should use compact inline placement inside the link');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(JSON.stringify({
  capturedBlocks: capturedBlocks.length,
  translationNodes: translations.length,
  compactNodes: translations.filter((node) => node.getAttribute('data-placement') !== 'after').length,
  pendingDuringTranslate: pendingDuringTranslate.length,
  pendingAfterTranslate: pendingAfterTranslate.length,
  selectionButtonShown: Boolean(selectionButton),
  toolbarAction: translatedToolbarAction,
  toolbarActionAfterClick,
  toolbarActionAfterRestore,
  draggedToolbarTop,
  selectionPopoverClosed: !popoverAfterDebugClose && !popoverAfterOutsideClick
}, null, 2));
