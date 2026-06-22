import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = [
  '<!doctype html><html><body>',
  '<header>',
  '  <nav style="display:flex;gap:24px"><a href="/news">News</a><a href="/video">Video</a><a href="/prices">Prices</a></nav>',
  '</header>',
  '<header role="banner" class="x-sidebar-shell" style="position:fixed;left:0;top:0;width:220px;height:760px">',
  '<nav role="navigation" aria-label="主要" class="x-sidebar" style="display:flex;flex-direction:column">',
  '  <a href="/i/grok">Grok</a>',
  '  <a href="/i/bookmarks">书签</a>',
  '  <a href="/i/premium">Premium</a>',
  '  <a href="/profile">个人资料</a>',
  '</nav>',
  '</header>',
  '<main>',
  '  <div role="tablist"><div role="tab">为你推荐</div><div role="tab">正在关注</div><div role="tab">COSMOS</div></div>',
  '  <section style="display:flex;justify-content:space-between;align-items:center">',
  '    <h2>Featured Stories</h2>',
  '    <a href="/stories">View all stories</a>',
  '  </section>',
  '  <aside class="x-live-card"><h2>X 上的直播</h2><p>比特币按预期暴跌，后续怎么看？水哥盈利300万！</p></aside>',
  '  <article data-testid="tweet" style="width:520px">',
  '    <div data-testid="tweetText" lang="en" style="width:500px;height:260px">alright it seems people are losing their shit about zai glm being good.<br><br>it’s been a not too open secret that the best hyper token burning engineers for last six months have been doing statsarb in this window of opportunity whilst western companies have been locking in with either openai or anthropic.<br><br>the glm models are really fantastic but they are like an autistic german. black and white thinking and high precision.</div>',
  '    <div role="group" aria-label="Post actions"><span>21</span><span>39</span><span>274</span></div>',
  '  </article>',
  '  <article>',
  '    <h1 style="color:rgb(89, 42, 130)">A concise heading for immersive translation testing</h1>',
  '    <p style="color:rgb(35, 47, 62)">Modern browser extensions can improve reading workflows without sending every page to a remote service automatically.</p>',
  '    <p>A manual translation flow gives the reader control over cost, privacy, and timing.</p>',
  '    <blockquote>Selected text should stay close to its original paragraph when translated inline.</blockquote>',
  '    <p>6月10日 @dr3dn0t · 6月10日</p>',
  '    <p>这是中文内容，目标语言是中文时不应该再次翻译，也不应该产生重复译文。</p>',
  '    <p>Try it out today because the AI demo is live and the audience can inspect every result.</p>',
  '    <p>Welcome to Computex, 全球最大的 AI 展览.</p>',
  '    <p>@arkuy99 · 1小时</p>',
  '    <p>所有给我 claude code settings 写 hooks 的第三方软件我全卸载了。</p>',
  '    <p>OpenAI 额度消耗绝逼有问题！半小时不到，5h 额度干光。</p>',
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
Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
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
  const left = Number.parseFloat(this.style.left || '0') || 0;
  const width = Number.parseFloat(this.style.width || '640') || 640;
  const height = Number.parseFloat(this.style.height || '42') || 42;
  return { x: left, y: top, top, left, right: left + width, bottom: top + height, width, height, toJSON: () => ({}) };
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
const capturedBatches = [];
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
      if (request.type === 'GET_SETTINGS') return { ok: true, data: { displayMode: 'below', targetLanguage: 'zh-Hans' } };
      if (request.type === 'TRANSLATE_BATCH') {
        capturedBlocks.push(...request.blocks);
        capturedBatches.push(request.blocks.map((block) => block.text));
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
if (!capturedText.some((text) => /zai glm being good/.test(text))) failures.push('expected X tweet detail body text to be captured');
if (capturedBatches.some((batch) => batch.filter((text) => /zai glm being good/.test(text)).length > 1)) failures.push('expected X tweet detail body to be captured once per translation batch');
if (!capturedText.some((text) => /Try it out today/.test(text))) failures.push('expected English X-style post text to be captured');
if (!capturedText.some((text) => /Welcome to Computex/.test(text))) failures.push('expected English-dominant mixed text to be captured');
for (const unexpected of [
  'Grok',
  'Premium',
  '书签',
  '个人资料',
  'X 上的直播',
  '比特币按预期暴跌，后续怎么看？水哥盈利300万！',
  '为你推荐',
  '正在关注',
  'COSMOS',
  '@arkuy99 · 1小时',
  '所有给我 claude code settings 写 hooks 的第三方软件我全卸载了。',
  'OpenAI 额度消耗绝逼有问题！半小时不到，5h 额度干光。'
]) {
  if (capturedText.includes(unexpected)) failures.push('expected to skip target-language or fixed-sidebar text: ' + unexpected);
}
if (capturedText.some((text) => /目标语言是中文时不应该再次翻译|6月10日/.test(text))) failures.push('expected Chinese target-language content and metadata to be skipped');
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
  capturedBatches: capturedBatches.length,
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
