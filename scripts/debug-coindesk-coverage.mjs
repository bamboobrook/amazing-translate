import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const cards = Array.from({ length: 34 }, (_, index) => {
  const title = index % 2 === 0
    ? 'Fidelity joins Wall Street race to manage stablecoin reserves'
    : 'Kentucky targets prediction markets in potential clash with Trump team';
  const summary = index % 2 === 0
    ? 'Following State Street, Fidelity is targeting reserve assets that underpin the expanding stablecoin market.'
    : 'President Donald Trump has taken the stance that states have no business with firms like Kalshi and other prediction markets.';
  return [
    '<article class="news-card">',
    '<a href="/markets/story-' + index + '">',
    '<div class="card-title">' + title + ' ' + (index + 1) + '</div>',
    '<div class="card-summary">' + summary + '</div>',
    '</a>',
    '</article>'
  ].join('');
}).join('');

const fixtureHtml = [
  '<!doctype html><html><body>',
  '<header>',
  '<nav style="display:flex;gap:24px"><a href="/news">News</a><a href="/video">Video</a><a href="/prices">Prices</a><a href="/research">Research</a><a href="/events">Events</a><a href="/data">Data & Indices</a><a href="/sponsored">Sponsored</a></nav>',
  '</header>',
  '<main>',
  '<section>',
  '<h1>Latest Crypto News</h1>',
  '<div style="display:flex;justify-content:space-between;align-items:center">',
  '<h2>Featured Stories</h2>',
  '<a href="/stories">View all stories</a>',
  '</div>',
  '<div class="featured-side-list">',
  '<a href="/tech/live-markets"><span class="category">Tech</span><span class="headline">Live markets: Fed holds rates steady, but makes a hawkish turn as Warsh takes over...</span></a>',
  '<a href="/policy/kentucky"><span class="category">Policy</span><span class="headline">Kentucky targets prediction markets, puts red state in potential clash with Trump team...</span></a>',
  '<a href="/markets/fidelity"><span class="category">Markets</span><span class="headline">Fidelity joins Wall Street race to manage stablecoin reserves...</span></a>',
  '</div>',
  cards,
  '</section>',
  '<section style="display:flex;justify-content:space-between;align-items:center">',
  '<h2>Explore more from CoinDesk</h2>',
  '<a href="/prices">Prices</a>',
  '</section>',
  '</main>',
  '</body></html>'
].join('\n');

const fetchWithTimeout = async (url, timeoutMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'Mozilla/5.0 AmazingTranslateDebug/1.0' }
    });
    if (!response.ok) throw new Error('Coindesk fetch failed: ' + response.status);
    return { html: await response.text(), source: 'live' };
  } finally {
    clearTimeout(timer);
  }
};

let loaded;
try {
  loaded = await fetchWithTimeout('https://www.coindesk.com/', 12000);
} catch (error) {
  loaded = { html: fixtureHtml, source: 'fixture (' + (error?.name === 'AbortError' ? 'timeout' : error.message) + ')' };
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
            translations: request.blocks.map((block) => ({ id: block.id, text: '译文: ' + block.text.slice(0, 96) }))
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
dynamic.innerHTML = '<a href="/markets/dynamic"><div class="headline">BlackRock analysts say spot crypto products are changing investor behavior</div><div class="summary">The new card arrived after initial page translation and should be translated by the incremental observer.</div></a>';
main.append(dynamic);
await new Promise((resolve) => window.setTimeout(resolve, 1150));

const dynamicHeadline = dynamic.querySelector('.headline');
const oldDynamicHeadlineText = dynamicHeadline.nextElementSibling?.textContent || '';
dynamicHeadline.textContent = 'Ether treasury firms attract Wall Street investors after new accounting guidance';
await new Promise((resolve) => window.setTimeout(resolve, 1150));
const newDynamicHeadlineText = dynamicHeadline.nextElementSibling?.textContent || '';

const translations = [...window.document.querySelectorAll('.amazing-translate-result')];
const sources = [...window.document.querySelectorAll('[data-amazing-translate-id]')];
const sample = capturedBlocks.slice(0, 16).map((block) => block.text.slice(0, 100));
const failures = [];

const translationFor = (source) => {
  const id = source.getAttribute('data-amazing-translate-id');
  return [...source.children].find((child) => child.classList?.contains('amazing-translate-result') && child.getAttribute('data-amazing-translate-for') === id)
    || (source.nextElementSibling?.classList.contains('amazing-translate-result') && source.nextElementSibling.getAttribute('data-amazing-translate-for') === id ? source.nextElementSibling : null);
};

const capturedText = capturedBlocks.map((block) => block.text);
if (capturedBlocks.length < 50) failures.push('expected at least 50 Coindesk/news text blocks, got ' + capturedBlocks.length);
for (const expected of ['News', 'Video', 'Prices', 'Research', 'Events', 'Data & Indices', 'Sponsored']) {
  if (!capturedText.includes(expected)) failures.push('expected to capture top navigation label: ' + expected);
}
for (const expected of ['Featured Stories', 'View all stories']) {
  if (!capturedText.includes(expected)) failures.push('expected to capture compact section label: ' + expected);
}
if ((loaded.source !== 'live' || loaded.html.includes('Explore more from CoinDesk')) && !capturedText.includes('Explore more from CoinDesk')) {
  failures.push('expected to capture compact section label: Explore more from CoinDesk');
}
if (loaded.source !== 'live') {
  if (!capturedText.some((text) => /Live markets: Fed holds rates steady/i.test(text))) failures.push('expected to capture right-side featured list item text');
  if (!capturedText.some((text) => /Kentucky targets prediction markets/i.test(text))) failures.push('expected to capture policy side-list/card text');
} else {
  const liveHeadlineLikeBlocks = capturedBlocks.filter((block) => /markets|bitcoin|ether|crypto|stock|investor|policy|treasury|ETF|XRP/i.test(block.text));
  if (liveHeadlineLikeBlocks.length < 8) failures.push('expected to capture multiple live Coindesk headline/card blocks, got ' + liveHeadlineLikeBlocks.length);
}
if (translations.length !== sources.length) failures.push('expected every current source to have one translation, got ' + translations.length + ' translations for ' + sources.length + ' sources');
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

for (const source of sources.slice(0, 140)) {
  const id = source.getAttribute('data-amazing-translate-id');
  const node = translationFor(source);
  if (!node) failures.push(id + ' does not have an adjacent or compact child translation node');
}

const compactExpectations = [
  ['Featured Stories', 'compact-block'],
  ['View all stories', 'compact-inline'],
  ...(loaded.source !== 'live' || loaded.html.includes('Explore more from CoinDesk') ? [['Explore more from CoinDesk', 'compact-block']] : [])
];
for (const [label, placement] of compactExpectations) {
  const source = sources.find((node) => node.textContent?.includes(label));
  const translation = source ? translationFor(source) : null;
  if (!translation) failures.push('expected ' + label + ' to have a compact/adjacent translation');
  else if (translation.getAttribute('data-placement') !== placement) failures.push('expected ' + label + ' placement ' + placement + ', got ' + translation.getAttribute('data-placement'));
}

if (failures.length) {
  console.error(JSON.stringify({ failures, source: loaded.source, beforeCount: before.length, capturedCount: capturedBlocks.length, translationCount: translations.length, batches, sample, oldDynamicHeadlineText, newDynamicHeadlineText }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ source: loaded.source, beforeCount: before.length, capturedCount: capturedBlocks.length, translationCount: translations.length, batches, compactNodes: translations.filter((node) => node.getAttribute('data-placement') !== 'after').length, sample, oldDynamicHeadlineText, newDynamicHeadlineText }, null, 2));
