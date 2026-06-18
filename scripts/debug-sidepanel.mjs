import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

const html = readFileSync('dist/sidepanel.html', 'utf8');
const scriptName = html.match(/\/assets\/sidepanel-[^"]+\.js/)?.[0];
if (!scriptName) throw new Error('Built sidepanel script not found.');

const defaultSettings = {
  provider: 'deepseek',
  sourceLanguage: 'auto',
  targetLanguage: 'zh-Hans',
  displayMode: 'below',
  maxBatchChars: 4000,
  cacheEnabled: true,
  providers: {
    deepseek: { apiKey: '', baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-flash' },
    glm: { apiKey: '', baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4', model: 'glm-5.2' }
  }
};

let settings = structuredClone(defaultSettings);
const messages = [];
const dom = new JSDOM(html, {
  url: 'chrome-extension://amazing-translate/sidepanel.html',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});

const { window } = dom;
window.chrome = {
  runtime: {
    sendMessage: async (request) => {
      messages.push(request);
      if (request.type === 'GET_SETTINGS') return { ok: true, data: structuredClone(settings) };
      if (request.type === 'SAVE_SETTINGS') {
        settings = structuredClone(request.settings);
        return { ok: true, data: structuredClone(settings) };
      }
      if (request.type === 'TEST_PROVIDER') return { ok: true, data: { sample: '你好，Amazing Translate' } };
      if (request.type === 'CLEAR_CACHE') return { ok: true, data: { cleared: 3 } };
      return { ok: true, data: { sent: true } };
    },
    openOptionsPage: () => messages.push({ type: 'OPEN_OPTIONS' })
  }
};

globalThis.window = window;
globalThis.document = window.document;
globalThis.chrome = window.chrome;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLButtonElement = window.HTMLButtonElement;
globalThis.HTMLInputElement = window.HTMLInputElement;
globalThis.HTMLSelectElement = window.HTMLSelectElement;
globalThis.Event = window.Event;
globalThis.MutationObserver = window.MutationObserver;
globalThis.fetch = async () => ({ ok: true, text: async () => '', arrayBuffer: async () => new ArrayBuffer(0) });

await import(pathToFileURL('dist' + scriptName).href + '?debug=' + Date.now());
await new Promise((resolve) => window.setTimeout(resolve, 10));

const document = window.document;
const failures = [];
const provider = document.querySelector('#providerSummary')?.textContent || '';
const languages = document.querySelector('#languageSummary')?.textContent || '';
if (!provider.includes('DeepSeek') || !provider.includes('deepseek-v4-flash')) failures.push('provider summary did not render');
if (!languages.includes('自动识别') || !languages.includes('简体中文')) failures.push('language summary did not render');
if (document.querySelector('#sourceLanguage')?.children.length < 8) failures.push('language options were not populated');
if (document.querySelector('.segmented button[data-mode="below"]')?.dataset.active !== 'true') failures.push('below display mode is not active');

const targetLanguage = document.querySelector('#targetLanguage');
targetLanguage.value = 'ja';
targetLanguage.dispatchEvent(new window.Event('change'));
await new Promise((resolve) => window.setTimeout(resolve, 10));
if (settings.targetLanguage !== 'ja') failures.push('target language change was not saved');
if (!document.querySelector('#languageSummary')?.textContent?.includes('日本語')) failures.push('language summary did not update after save');

document.querySelector('#provider').value = 'glm';
document.querySelector('#provider').dispatchEvent(new window.Event('change'));
await new Promise((resolve) => window.setTimeout(resolve, 10));
if (settings.provider !== 'glm') failures.push('provider switch was not saved');
if (!document.querySelector('#providerSummary')?.textContent?.includes('GLM')) failures.push('provider summary did not update after switch');

document.querySelector('#testProvider').click();
await new Promise((resolve) => window.setTimeout(resolve, 10));
if (!document.querySelector('#status')?.textContent?.includes('连接成功')) failures.push('test provider status was not shown');

if (failures.length) {
  console.error(JSON.stringify({ failures, provider, languages, messages }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ provider, languages, messageTypes: messages.map((message) => message.type), status: document.querySelector('#status')?.textContent }, null, 2));
