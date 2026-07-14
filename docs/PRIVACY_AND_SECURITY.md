# Privacy and Security

## Data handling

The extension has no backend, analytics, telemetry, user account, or remote runtime dependency. Inspected-page data is not sent to any external service. Full network observations live only in extension memory for the active debugging session. The extension never requests browsing history and does not persist full request payloads.

`chrome.storage.local` stores only user settings, expected domain profiles, and explicitly imported catalog entries. An expected account GUID is saved only when the user enters and saves it. Diagnostic files are written only through an explicit local export.

## Raw QA evidence

The inspector displays browser-visible request URLs, account GUIDs, and parameter values exactly as observed. Empty strings and explicit nulls are retained and highlighted. The sensitivity scanner still flags email-, phone-, payment-card-, identifier-, and token-like values as diagnostic findings, but it does not alter or obscure the evidence.

JSON and Markdown QA reports include complete captured event payloads and request metadata. Reports are generated locally only after an explicit export action and are never uploaded by the extension. Because these files can contain client data, identifiers, or URLs, handle them according to the client's approved QA evidence and retention process.

## Permissions

- `storage` is used for settings and imported catalog entries.
- `activeTab` supports the toolbar popup's current-tab summary without a persistent `tabs` permission.
- The static content script matches HTTP and HTTPS pages because the product must inspect arbitrary developer-selected pages. It scans script elements only, is read-only, and sends only Oracle loader evidence and inferred route changes.
- No `host_permissions`, `webRequest`, `webRequestBlocking`, `history`, or `tabs` permission is requested.

The broad HTTP(S) content-script match is the principal permission tradeoff. It is required for passive early DOM observation on arbitrary pages, but the implementation minimizes collection and never transmits page data externally.

## Page safety

The content script runs in an isolated world and never changes DOM nodes, scripts, cookies, storage, or request behavior. It never calls `ORA.view`, `ORA.click`, `ORA.collect`, or any other tracking function. It does not replace `window.ORA`, patch fetch/XHR, append Oracle debug parameters, or reload automatically.

The optional page-context check evaluates only `typeof window.ORA !== 'undefined'`. Reloading and copying a debug URL require explicit button clicks. Copying `_ora.debug=vvvv` changes only clipboard content.

## Extension security

Manifest V3 uses an event-driven service worker. The extension content security policy permits only `script-src 'self'` and `object-src 'self'`. Vite bundles all executable dependencies locally; no remote code, `eval`, or remotely hosted script is used by extension pages.
