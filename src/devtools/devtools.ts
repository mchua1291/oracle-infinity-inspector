import { getDefaultPlatformIdentity } from '../features/platform/platformIdentityRegistry';

chrome.devtools.panels.create(
  getDefaultPlatformIdentity().panelName,
  'icons/icon-32.png',
  'panel.html',
);
