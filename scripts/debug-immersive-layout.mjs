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
  '    <h1>A concise heading for immersive translation testing</h1>',
  '    <p>Modern browser extensions can improve reading workflows without sending every page to a remote service automatically.</p>',
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
  return { x: 0, y: 0, top: 0, left: 0, right: 640, bottom: 24, width: 640, height: 24, toJSON: () => ({}) };
};

const capturedBlocks = [];
const selectionRange = {
  getBoundingClientRect: () => ({ x: 0, y: 0, top: 96, left: 80, right: 300, bottom: 118, width: 220, height: 22, toJSON: () => ({}) })
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
await window.__AMAZING_TRANSLATE_DEBUG__.translatePage();
await new Promise((resolve) => window.setTimeout(resolve, 0));

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
if (!selectionPopover) failures.push('selection translation popover was not shown');
if (popoverAfterDebugClose) failures.push('popover did not close through debug close helper');
if (popoverAfterOutsideClick) failures.push('popover did not close when clicking outside');
if (translations.length !== capturedBlocks.length - 2) failures.push('expected ' + (capturedBlocks.length - 2) + ' page translation nodes, got ' + translations.length);

for (const source of sources) {
  const id = source.getAttribute('data-amazing-translate-id');
  const node = translationFor(source);
  if (!node) failures.push(id + ' does not have an adjacent or compact child translation node');
}

const featured = [...sources].find((source) => source.textContent?.includes('Featured Stories'));
const viewAll = [...sources].find((source) => source.textContent?.includes('View all stories'));
if (featured && translationFor(featured)?.getAttribute('data-placement') !== 'compact-block') failures.push('Featured Stories should use compact block placement inside the heading');
if (viewAll && translationFor(viewAll)?.getAttribute('data-placement') !== 'compact-inline') failures.push('View all stories should use compact inline placement inside the link');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(JSON.stringify({ capturedBlocks: capturedBlocks.length, translationNodes: translations.length, compactNodes: translations.filter((node) => node.getAttribute('data-placement') !== 'after').length, selectionPopoverClosed: !popoverAfterDebugClose && !popoverAfterOutsideClick }, null, 2));
