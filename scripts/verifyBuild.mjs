import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(await readFile(resolve(dist, 'manifest.json'), 'utf8'));
const contentScriptPath = resolve(dist, manifest.content_scripts?.[0]?.js?.[0] ?? '');
const contentScript = await readFile(contentScriptPath, 'utf8');

if (/^\s*(?:import|export)\b/m.test(contentScript))
  throw new Error('The static content script must be a self-contained classic script.');
if (!contentScript.includes('ACTIVATE_DOM_INSPECTION'))
  throw new Error('The built content script is missing panel activation handling.');
if (manifest.version !== packageJson.version)
  throw new Error(
    `Manifest version ${manifest.version} does not match package version ${packageJson.version}.`,
  );

const requiredFiles = [
  manifest.devtools_page,
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  'panel.html',
  ...Object.values(manifest.icons ?? {}),
];
for (const file of requiredFiles) {
  if (typeof file !== 'string' || !file) throw new Error('Manifest contains an invalid file path.');
  await access(resolve(dist, file));
}

console.log('Verified the MV3 distribution and self-contained static content script.');
