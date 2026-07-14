import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('MV3 manifest', () => {
  const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'public/manifest.json'), 'utf8'));
  const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
  it('contains required MV3 DevTools keys', () => {
    expect(manifest).toMatchObject({
      manifest_version: 3,
      devtools_page: 'devtools.html',
      background: { service_worker: 'assets/serviceWorker.js' },
      minimum_chrome_version: '102',
    });
  });
  it('does not request blocking, history, or broad host permissions', () => {
    expect(manifest.permissions).not.toEqual(
      expect.arrayContaining(['webRequest', 'webRequestBlocking', 'history', 'tabs']),
    );
    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.permissions).not.toContain('activeTab');
  });
  it('loads only local extension scripts', () =>
    expect(manifest.content_security_policy.extension_pages).toBe(
      "script-src 'self'; object-src 'self'",
    ));
  it('keeps the package and browser manifest versions aligned', () =>
    expect(manifest.version).toBe(packageJson.version));
  it('declares local raster icons for Edge extension surfaces', () => {
    expect(manifest.icons).toMatchObject({
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    });
    expect(manifest.action.default_icon).toEqual(manifest.icons);
  });
});
