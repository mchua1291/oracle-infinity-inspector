import { createServer } from 'node:http';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const root = resolve(import.meta.dirname, '..');
const extensionPath = join(root, 'dist');
const fixturePath = join(root, 'tests', 'fixtures', 'dom', 'synchronous-cx-tag.html');
const profilePath = join(tmpdir(), `oracle-infinity-inspector-smoke-${process.pid}`);
const fixture = (await readFile(fixturePath, 'utf8')).replace(
  '<head>',
  `<head><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'none'; connect-src 'none'; img-src 'none'">`,
);
const server = createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(fixture);
});

await new Promise((resolveListen, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolveListen);
});
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Unable to start the fixture server.');
const fixtureUrl = `http://127.0.0.1:${address.port}/`;

let context;
try {
  context = await chromium.launchPersistentContext(profilePath, {
    channel: 'msedge',
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });
  let worker;
  for (let attempt = 0; attempt < 30 && !worker; attempt += 1) {
    worker = context
      .serviceWorkers()
      .find((candidate) => candidate.url().endsWith('/assets/serviceWorker.js'));
    if (!worker) await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  if (!worker)
    throw new Error(
      `Oracle Infinity Inspector service worker not found. Observed: ${context
        .serviceWorkers()
        .map((candidate) => candidate.url())
        .join(', ')}`,
    );
  const extensionId = new URL(worker.url()).hostname;
  const page = await context.newPage();
  await page.goto(fixtureUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.bringToFront();
  const tabId = await worker.evaluate(async () => {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id === undefined) continue;
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: 'ACTIVATE_DOM_INSPECTION',
          monitorMutations: true,
        });
        if (response?.ok) return tab.id;
      } catch {
        // Edge internal and extension pages do not accept the HTTP(S) content script.
      }
    }
    return undefined;
  });
  if (tabId === undefined) {
    const diagnostics = await worker.evaluate(async () => ({
      contentScripts: chrome.runtime.getManifest().content_scripts,
      permissions: await chrome.permissions.getAll(),
      tabs: (await chrome.tabs.query({})).map((tab) => ({
        id: tab.id,
        active: tab.active,
        status: tab.status,
      })),
    }));
    throw new Error(
      `Unable to resolve a tab hosting the content script. Extension worker: ${worker.url()}. Diagnostics: ${JSON.stringify(diagnostics)}`,
    );
  }
  await page.waitForTimeout(250);
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.getByRole('heading', { name: 'Inspector quick status' }).waitFor();
  const session = await popup.evaluate(
    async (id) => chrome.runtime.sendMessage({ type: 'GET_TAB_SESSION', tabId: id }),
    tabId,
  );
  if (!session || session.loaders.length !== 1)
    throw new Error('The activated content scan did not report exactly one fixture loader.');
  console.log(
    JSON.stringify(
      {
        status: 'passed',
        extensionId,
        detectedLoaders: session.loaders.length,
        popupRendered: true,
      },
      null,
      2,
    ),
  );
} finally {
  await context?.close();
  await new Promise((resolveClose) => server.close(resolveClose));
  if (basename(profilePath).startsWith('oracle-infinity-inspector-smoke-'))
    await rm(profilePath, { recursive: true, force: true });
}
