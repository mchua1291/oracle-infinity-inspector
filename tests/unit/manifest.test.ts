import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('MV3 manifest', () => {
  const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'public/manifest.json'), 'utf8'));
  it('contains required MV3 DevTools keys', () => {
    expect(manifest).toMatchObject({
      manifest_version: 3,
      devtools_page: 'devtools.html',
      background: { service_worker: 'assets/serviceWorker.js' },
    });
  });
  it('does not request blocking, history, or broad host permissions', () => {
    expect(manifest.permissions).not.toEqual(
      expect.arrayContaining(['webRequest', 'webRequestBlocking', 'history', 'tabs']),
    );
    expect(manifest.host_permissions).toBeUndefined();
  });
  it('loads only local extension scripts', () =>
    expect(manifest.content_security_policy.extension_pages).toBe(
      "script-src 'self'; object-src 'self'",
    ));
});
