import { getDefaultPlatformIdentity } from '../features/platform/platformIdentityRegistry';

chrome.devtools.panels.create(getDefaultPlatformIdentity().panelName, '', 'panel.html');
