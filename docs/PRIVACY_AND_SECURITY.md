# Privacy and Security

## Data handling

The extension has no backend, analytics, telemetry, user account, or remote runtime dependency. Inspected-page data is not sent to any external service. Full network observations live in the active panel and bounded `chrome.storage.session` for the current browser extension session. The session cache survives service-worker suspension but is not long-term storage. The extension never requests browsing history and does not persist full request payloads across browser sessions.

`chrome.storage.local` stores only user settings, expected domain profiles, saved QA plan definitions, and explicitly imported catalog entries. An expected account GUID or QA rule is saved only when the user enters and saves it. Diagnostic files are written only through an explicit local export.

The current per-tab QA run is stored in `chrome.storage.session` with its completed-step event evidence so multi-page plans survive navigation and service-worker suspension. It clears when the tab closes, the browser extension session ends, or the user clears the QA run. It is not synced or uploaded.

Discovery technology evidence and up to 10 explicitly captured data-layer snapshots live in the active DevTools panel store. They can span navigation while that panel context remains open, but they are not written to long-term storage, synced, or uploaded. **Clear snapshots** removes the captured page-context values while retaining technology evidence already observed from the DOM or network.

The toolbar companion can copy a deliberately limited status summary containing the current page URL, detection state, and aggregate counts. It does not include captured parameter names or values. Its **Scan current page** action explicitly requests a one-time read-only DOM scan; it does not start network interception or continuous monitoring.

## Raw QA evidence

The inspector displays browser-visible request URLs, account GUIDs, and parameter values exactly as observed. Empty strings and explicit nulls are retained and highlighted. The sensitivity scanner still flags email-, phone-, payment-card-, identifier-, and token-like values as diagnostic findings, but it does not alter or obscure the evidence.

JSON and Markdown QA reports include complete captured event payloads, request metadata, and any explicitly captured discovery snapshots and reuse assessments. Reports are generated locally only after the user acknowledges the raw client-data notice and explicitly exports or copies a report. They are never uploaded by the extension. Because these files can contain client data, identifiers, or URLs, handle them according to the client's approved QA evidence and retention process.

## Permissions

- `storage` is used for settings, expected profiles, saved QA plans, imported catalog entries, and bounded per-tab session/scorecard evidence.
- The static content script matches HTTP and HTTPS pages because the product must inspect arbitrary developer-selected pages. It remains dormant until an Oracle Infinity DevTools panel activates its tab or the user explicitly selects **Scan current page** in the popup. It scans script elements and supported tag-manager iframe sources, is read-only, and sends only Oracle/tag-manager implementation evidence and inferred route changes.
- No `host_permissions`, `webRequest`, `webRequestBlocking`, `history`, or `tabs` permission is requested.

The broad HTTP(S) content-script match is the principal permission tradeoff. It allows activation on arbitrary developer-selected pages, while the dormant-by-default implementation avoids page scanning or URL publication when the inspector is not active. No `activeTab`, `tabs`, or broad `host_permissions` permission is requested.

## Page safety

The content script runs in an isolated world and never changes DOM nodes, scripts, cookies, storage, or request behavior. It never calls `ORA.view`, `ORA.click`, `ORA.collect`, or any other tracking function. It does not replace `window.ORA`, patch fetch/XHR, append Oracle debug parameters, or reload automatically.

The optional Infinity page-context check evaluates only `typeof window.ORA !== 'undefined'`. A Discovery capture evaluates one locally bundled, self-contained read-only probe in the inspected page context. It reads own property descriptors only from supported Google, Adobe, and Tealium globals, applies strict depth/entry/field/value caps, and returns plain bounded data. It does not call `gtag`, `_satellite`, `alloy`, `utag`, data-layer push functions, or tracking methods. Reloading and copying a debug URL require explicit button clicks. Copying `_ora.debug=vvvv` changes only clipboard content.

Consent checkpoint settings are user-authored QA expectations. The extension compares them with browser-visible collection events, loader evidence, and identifier-classified parameters; it does not read or change CMP state, cookies, consent strings, or legal-policy configuration.

## Extension security

Manifest V3 uses an event-driven service worker. The extension content security policy permits only `script-src 'self'` and `object-src 'self'`. Vite bundles all executable dependencies locally; no remote code or remotely hosted script is used by extension pages. The explicit Discovery snapshot uses the Chromium DevTools inspected-window evaluation API to run only the locally bundled read-only probe described above; it does not evaluate client-supplied code.
