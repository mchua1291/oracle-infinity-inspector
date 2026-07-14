# Known Limitations

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

## Static libraries

Static Oracle Infinity resources are recognized by Oracle-hosted resource paths and extensions. A 304 response means the browser validated a cached copy; it does not prove the JavaScript executed successfully. First-party-proxied or self-hosted Infinity libraries may not match the Oracle-host rule and will remain outside the summary.

## Network bodies

Chrome HAR may omit request bodies, and compressed/binary bodies may not be readable as JSON. These cases are reported as unavailable or partial. The extension does not decompress opaque bodies or patch page networking.

## Long sessions

The inspector retains the latest 1,000 network observations per tab to keep diagnostics and report previews responsive. When the limit is reached, older observations are removed and an informational warning records the count. Use focused captures or separate exports when a test plan produces more than 1,000 supporting, library, loader, and collection requests.

## SPA routes

Hash changes and popstate events are observed. Other SPA route changes are inferred opportunistically when DOM mutations reveal that `location.href` changed. History APIs are not monkeypatched, so some route transitions may not be reported.

## Browser compatibility

The build targets Chromium Manifest V3 and Chrome DevTools APIs. Firefox and Safari extension architectures are not supported. Edge and other Chromium browsers may work but are not part of the verified compatibility scope. Chrome internal pages, the Chrome Web Store, and pages where content scripts are prohibited cannot be inspected fully.

A DevTools instance is attached to one browser tab. Switching to another Edge or Chrome tab cannot reattach the existing DevTools panel; open DevTools on the new tab instead. Navigation within the attached tab is synchronized through navigation events, focus/visibility checks, and a five-second visible-panel backstop.
