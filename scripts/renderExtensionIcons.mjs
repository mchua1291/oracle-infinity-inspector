import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const root = resolve(import.meta.dirname, '..');
const sourcePath = resolve(root, 'public', 'icons', 'icon-source.svg');
const outputDirectory = dirname(sourcePath);
const source = await readFile(sourcePath, 'utf8');
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const size of [16, 32, 48, 128]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<style>html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden}svg{display:block;width:${size}px;height:${size}px}</style>${source}`,
    );
    await page.locator('svg').screenshot({
      path: resolve(outputDirectory, `icon-${size}.png`),
      omitBackground: true,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
