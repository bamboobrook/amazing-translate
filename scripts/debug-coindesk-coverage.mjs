import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const fixtureHtml = `<!doctype html><html><body>
<header><a>Markets</a><a>Policy</a></header>
<main>
  <section>
    <h1>Latest Crypto News</h1>
    ${Array.from({ length: 34 }, (_, index) => `
      <article class="news-card">
        <a href="/markets/story-${index}">
          <div class="card-title">${index % 2 === 0 ? 'Fidelity joins Wall Street race to manage stablecoin reserves' : 'Kentucky targets prediction markets in potential clash with Trump team'} ${index + 1}</div>
          <div class="card-summary">${index % 2 === 0 ? 'Following State Street, Fidelity is targeting reserve assets that underpin the expanding stablecoin market.' : 'President Donald Trump has taken the stance that states have no business with firms like Kalshi and other prediction markets.'}</div>
        </a>
      </article>`).join('')}
  </section>
</main>
</body></html>`;

const fetchWithTimeout = async (url, timeoutMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'Mozilla/5.0 AmazingTranslateDebug/1.0' }
    });
    if (!response.ok) throw new Error(`Coindesk fetch failed: ${response.status}`);
    return { html: await response.text(), source: 'live' };
  } finally {
    clearTimeout(timer);
  }
};

let loaded;
try {
  loaded = await fetchWithTimeout('https://www.coindesk.com/', 12000);
} catch (error) {
  loaded = { html: fixtureHtml, source: `fixture (${error?.name === 'AbortError' ? 'timeout' : error.message})` };
}

const dom = new JSDOM(loaded.html, {
  url: 'https://www.coindesk.com/',
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
const batches = [];
window.chrome = {
  runtime: {
    sendMessage: async (request) => {
      if (request.type === 'GET_SETTINGS') return { ok: true, data: { displayMode: 'below' } };
      if (request.type === 'TRANSLATE_BATCH') {
        capturedBlocks.push(...request.blocks);
        batches.push(request.blocks.length);
        return {
          ok: true,
          data: {
            cached: 0,
            translations: request.blocks.map((block) => ({ id: block.id, text: `译文: ${block.text.slice(0, 96)}` }))
          }
        };
      }
      return { ok: true, data: { sent: true } };
    },
    onMessage: { addListener: () => undefined }
  }
};

window.eval(readFileSync('dist/content-script.js', 'utf8'));
const before = window.__AMAZING_TRANSLATE_DEBUG__.collectPageBlocks();
await window.__AMAZING_TRANSLATE_DEBUG__.translatePage();
await new Promise((resolve) => window.setTimeout(resolve, 20));

const main = window.document.querySelector('main') || window.document.body;
const dynamic = window.document.createElement('article');
dynamic.className = 'news-card dynamic-card';
dynamic.innerHTML = `<a href="/markets/dynamic"><div class="headline">BlackRock analysts say spot crypto products are changing investor behavior</div><div class="summary">The new card arrived after initial page translation and should be translated by the incremental observer.</div></a>`;
main.append(dynamic);
await new Promise((resolve) => window.setTimeout(resolve, 1150));

const dynamicHeadline = dynamic.querySelector('.headline');
const oldDynamicHeadlineText = dynamicHeadline.nextElementSibling?.textContent || '';
dynamicHeadline.textContent = 'Ether treasury firms attract Wall Street investors after new accounting guidance';
await new Promise((resolve) => window.setTimeout(resolve, 1150));
const newDynamicHeadlineText = dynamicHeadline.nextElementSibling?.textContent || '';

const translations = [...window.document.querySelectorAll('.amazing-translate-result')];
const sources = [...window.document.querySelectorAll('[data-amazing-translate-id]')];
const sample = capturedBlocks.slice(0, 12).map((block) => block.text.slice(0, 100));
const failures = [];

if (capturedBlocks.length < 50) failures.push(`expected at least 50 Coindesk/news text blocks, got ${capturedBlocks.length}`);
if (translations.length !== sources.length) failures.push(`expected every current source to have one translation, got ${translations.length} translations for ${sources.length} sources`);
if (!capturedBlocks.some((block) => /President Donald Trump|State Street|Fidelity|Kalshi|stablecoin/i.test(block.text))) {
  failures.push('expected to capture Coindesk card summary/headline text, but did not');
}
if (!capturedBlocks.some((block) => /new card arrived after initial page translation/i.test(block.text))) {
  failures.push('expected incremental translation to capture dynamically added card text');
}
if (!capturedBlocks.some((block) => /Ether treasury firms attract Wall Street investors/i.test(block.text))) {
  failures.push('expected text mutation to retrigger translation for reused dynamic card nodes');
}
if (/BlackRock analysts say spot crypto products/i.test(newDynamicHeadlineText)) {
  failures.push('dynamic headline kept the stale translation after its source text changed');
}
if (!/Ether treasury firms attract Wall Street investors/i.test(newDynamicHeadlineText)) {
  failures.push('dynamic headline did not receive a translation matching its new source text');
}

for (const source of sources.slice(0, 100)) {
  const id = source.getAttribute('data-amazing-translate-id');
  const next = source.nextElementSibling;
  if (!next?.classList.contains('amazing-translate-result')) failures.push(`${id} is not followed by a translation node`);
  if (next?.getAttribute('data-amazing-translate-for') !== id) failures.push(`${id} translation node does not point back to source`);
}

if (failures.length) {
  console.error(JSON.stringify({ failures, source: loaded.source, beforeCount: before.length, capturedCount: capturedBlocks.length, translationCount: translations.length, batches, sample, oldDynamicHeadlineText, newDynamicHeadlineText }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ source: loaded.source, beforeCount: before.length, capturedCount: capturedBlocks.length, translationCount: translations.length, batches, sample, oldDynamicHeadlineText, newDynamicHeadlineText }, null, 2));
