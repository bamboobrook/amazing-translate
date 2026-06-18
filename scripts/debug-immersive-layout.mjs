import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = `<!doctype html><html><body>
<main>
  <article>
    <h1>A concise heading for immersive translation testing</h1>
    <p>Modern browser extensions can improve reading workflows without sending every page to a remote service automatically.</p>
    <p>A manual translation flow gives the reader control over cost, privacy, and timing.</p>
    <blockquote>Selected text should stay close to its original paragraph when translated inline.</blockquote>
  </article>
</main>
</body></html>`;

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
              text: `译文 ${index + 1}: ${block.text.slice(0, 42)}`
            }))
          }
        };
      }
      return { ok: true, data: { sent: true } };
    },
    onMessage: { addListener: () => undefined }
  }
};

window.eval(readFileSync('dist/content-script.js', 'utf8'));
await window.__AMAZING_TRANSLATE_DEBUG__.translatePage();
await new Promise((resolve) => window.setTimeout(resolve, 0));

const translations = [...window.document.querySelectorAll('.amazing-translate-result')];
const sources = [...window.document.querySelectorAll('[data-amazing-translate-id]')];
const failures = [];

if (capturedBlocks.length !== 4) failures.push(`expected 4 captured blocks, got ${capturedBlocks.length}`);
if (translations.length !== capturedBlocks.length) failures.push(`expected ${capturedBlocks.length} translation nodes, got ${translations.length}`);

for (const source of sources) {
  const id = source.getAttribute('data-amazing-translate-id');
  const next = source.nextElementSibling;
  if (!next?.classList.contains('amazing-translate-result')) failures.push(`${id} is not followed by a translation node`);
  if (next?.getAttribute('data-amazing-translate-for') !== id) failures.push(`${id} translation node does not point back to source`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(JSON.stringify({ capturedBlocks: capturedBlocks.length, translationNodes: translations.length }, null, 2));
