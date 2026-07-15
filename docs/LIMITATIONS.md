# Known Limitations

## Future platform generations

The adapter boundary makes another browser-visible Oracle analytics generation additive, but it does not predict undocumented future endpoints or schemas. A new product is unsupported until an adapter is implemented from official documentation and synthetic or authorized evidence. Unknown explicit adapter identifiers fail rather than being interpreted as Infinity.

## Server-side DC API

A Chromium extension sees browser traffic only. DC API calls made by a backend, edge function, batch job, mobile app, or other device cannot be detected. The UI therefore says **browser-visible DC API**, never all DC API.

## Sync/async inference

DOM attributes and mutation timing do not provide a complete execution trace. A tag manager can remove or recreate nodes, a dynamic script can be inserted while the HTML parser is still active, and `async` behavior can be influenced by script-creation semantics. Conflicting evidence is reported as unknown. Results are sync/async inference with confidence, not a guarantee.

## DevTools opened late

Chrome documents that HAR entries may be missing when DevTools opens after a page has loaded. The extension recommends a clear-and-reload workflow. A missing request before reload is not evidence that the implementation is absent or broken.

## Parameter catalog

The bundled catalog covers the Oracle Full Parameter Reference plus explicitly curated names from other official Oracle Infinity pages. Oracle's schema-less collection and implementation-defined parameters mean that an uncatalogued parameter can still be valid custom data. Unknown values are never called invalid, and teams can import verified local catalog entries. Collection-time and reporting-time names are kept distinct in notes where documented.

No finite bundled catalog can automatically discover every parameter that may appear in every Oracle document published later. The repeatable catalog sync script refreshes the Full Parameter Reference, while supplemental entries require an official Oracle source and a catalog update.

## Commerce rules

Commerce diagnostics apply to the reserved event names and formats documented in Oracle's commerce quickstart. Custom event taxonomies are not automatically mapped to those rules. Oracle's tables and examples contain a few inconsistencies, including omitted `wt.ev` values and competing order-status identifiers; affected findings are deliberately advisory. Cart-total reconciliation is not enforced because the documented examples include tax and shipping in ways that do not support one unambiguous formula.

## Tag managers and consent managers

The extension can infer tag-manager injection only from DOM identifiers, inline loader evidence, and mutation timing. It cannot prove which container, rule, consent decision, or vendor template created a script. Closed shadow roots, inaccessible frames, restricted browser pages, and extension-disabled pages may hide DOM evidence.

Independent tag-manager detection is intentionally limited to standard Google Tag Manager, Tealium iQ, and Adobe Tags CDN/bootstrap signatures. Self-hosted, proxied, renamed, consent-blocked, or unsupported managers may not be detected. Seeing a manager and an Infinity call on the same page establishes coexistence, not causation.

## Discovery providers and snapshots

Discovery recognizes standard browser-visible Google, Adobe, and Tealium signatures. First-party proxies, server-side containers, renamed globals, inaccessible frames, consent-blocked tools, custom Adobe Web SDK instance names, and unsupported platforms may remain undetected. Adobe Edge Network evidence does not by itself prove which downstream Adobe applications received the data.

On-demand snapshots inspect only supported page-context objects. They do not search every global variable, execute getters, invoke a vendor's computed-state API, or reconstruct values that existed before DevTools opened. Queue history is capped at the latest 100 entries per object; each layer is capped at 500 fields, six levels of depth, and 2,000 characters per scalar value. The UI and JSON report mark truncation and unsupported values.

The initial comparison is exact and browser-local. A field can be called **already collected** only when an observed Infinity parameter has the same normalized name and value. A populated source with no exact name match is a candidate, not a recommendation that its meaning, consent status, ownership, format, or target parameter has been approved. Discovery snapshots last only for the active DevTools panel context and are not a shared implementation inventory.

QA Plan consent checkpoints do not inspect a consent manager's internal state, consent strings, cookies, server-side collection, or legal-policy configuration. They evaluate only client-configured expectations against collection calls captured during the step, current loader evidence, and parameters already classified as identifiers. Loader presence does not prove execution, and no browser-visible call does not prove that every downstream system is suppressed. Treat the result as repeatable QA evidence, not a legal-compliance verdict.

## QA plans and scorecards

A step captures collection events observed after **Start capture** and before **Complete step**. Requests that finish outside that interval may be attributed to the wrong step or missed. Keep steps focused, wait for traffic to settle, and rerun ambiguous results. Event matching is exact for configured values and regular expressions are evaluated locally with JavaScript semantics.

Saved plans are local to the browser profile. The active scorecard is per inspected tab and lasts only for the browser extension session. It is not a shared test-management system, approval record, or immutable audit log.

## Static libraries

Static Oracle Infinity resources are recognized by Oracle-hosted resource paths and extensions. A 304 response means the browser validated a cached copy; it does not prove the JavaScript executed successfully. First-party-proxied or self-hosted Infinity libraries may not match the Oracle-host rule and will remain outside the summary.

## Network bodies

Chrome HAR may omit request bodies, and compressed/binary bodies may not be readable as JSON. These cases are reported as unavailable or partial. The extension does not decompress opaque bodies or patch page networking.

## Long sessions

The inspector retains the latest 1,000 network observations per tab to keep diagnostics and report previews responsive. When the limit is reached, older observations are removed and an informational warning records the count. Completed QA steps retain their own collection-event snapshots for scorecard export, which can increase session-storage use during large plans. If Chromium rejects a session-storage write, the active in-memory run continues only while its extension context remains alive. Use focused captures or separate exports for high-volume plans.

## SPA routes

Hash changes and popstate events are observed. Other SPA route changes are inferred opportunistically when DOM mutations reveal that `location.href` changed. History APIs are not monkeypatched, so some route transitions may not be reported.

## Browser compatibility

The build targets Chromium Manifest V3 and standard Chrome extension APIs. Microsoft Edge 102+ is the verified compatibility target. Google Chrome 102+ is expected-compatible but is not yet part of the automated browser test matrix. Brave, Vivaldi, Opera, and other Chromium 102+ browsers are expected to load the extension but remain unverified because DevTools placement, enterprise policies, and API behavior can vary. Version 102 is the minimum because the extension uses `chrome.storage.session`.

Firefox and Safari are unsupported because their extension and DevTools architectures require a separate port. Browser internal pages, extension stores, and pages where content scripts are prohibited cannot be inspected fully.

A DevTools instance is attached to one browser tab. Switching to another tab cannot reattach the existing DevTools panel; open DevTools on the new tab instead. Navigation within the attached tab is synchronized through navigation events, focus/visibility checks, and a five-second visible-panel backstop.
