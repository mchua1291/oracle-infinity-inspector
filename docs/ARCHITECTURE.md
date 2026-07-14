# Architecture

## Runtime surfaces

Oracle Infinity Inspector is a Manifest V3 extension with five runtime boundaries:

1. The DevTools bootstrap page creates the **Oracle Infinity** panel. Chrome exposes `chrome.devtools.*` only in this DevTools context.
2. The React panel owns the active diagnostic session and subscribes to `chrome.devtools.network`. Existing HAR entries are read when the panel opens and new completed requests are parsed as they arrive.
3. A passive, isolated-world content script is present on HTTP(S) pages but remains dormant until the DevTools panel activates inspection or the user requests a one-time popup scan. Active panel inspection can observe later DOM insertions; a popup scan reads only the current DOM snapshot. Both paths send implementation evidence, not general page content, to the extension.
4. A small event-driven service worker coordinates the current tab, content script, popup, and panel. It mirrors bounded per-tab observations into `chrome.storage.session`, allowing the cache to survive service-worker suspension while still clearing when the browser extension session ends.
5. The toolbar popup displays a lightweight cached summary, can request an explicit one-time DOM scan, surfaces bounded priority finding titles, and explains that Chrome cannot reliably open a specific DevTools panel from a popup.

## Redwood-inspired presentation

The panel and popup use a locally implemented, Redwood-inspired token layer: Oracle JET's documented warm neutral ramp, simplified product header, restrained dividers and shadows, consistent status colors, and CSS-variable-based theming. The extension does not bundle Oracle JET or fetch Oracle fonts or styles at runtime; this keeps the MV3 package small, self-contained, and free of remote code.

## Data flow

```text
active DevTools panel -> activate dormant content scanner
Inspected DOM -> platform adapter loader scanners + tag-manager scanners -> service worker session cache -> DevTools panel store
Inspected network -> adapter registry -> product parser/classifiers -> panel store
panel store -> active platform adapter -> diagnostics/summaries -> tabs/export
panel store -> service worker in-memory summary -> actionable toolbar companion
settings -> chrome.storage.local
explicit export -> local Blob download or clipboard
```

No backend is used because all required evidence is already available locally in the inspected browser. Avoiding a backend also prevents diagnostic payloads, account identifiers, URLs, or parameter values from leaving the machine.

## Platform adapter layer

Browser and React runtime surfaces do not select Infinity parsers, scanners, diagnostics, catalogs, profile fields, or terminology directly. They resolve a typed adapter through the validated platform registry. Observations and sessions carry the stable adapter ID, and explicit unknown IDs fail instead of falling back to Infinity.

The current `oracle-infinity` adapter wraps the existing Infinity behavior. A future adapter can add request matchers, payload parsers, loader evidence, catalogs, expected-profile fields, diagnostics, UI labels, and export notes without replacing the DevTools, storage, UI shell, or report-delivery infrastructure. Lightweight identity, DOM, and diagnostics registries keep the popup, content script, and service worker from importing the full panel/catalog bundle. See [Platform adapters](PLATFORM_ADAPTERS.md).

## Parser and classifier layer

The parser layer is independent from React and Chrome APIs:

- URL pattern parsing recognizes only documented or explicitly scoped Oracle patterns.
- Static Oracle-hosted JavaScript and related resources become library observations and are aggregated separately from collection events.
- Oracle Infinity-hosted requests that do not match a verified collection or library endpoint become concise support/service traffic evidence and are never counted as collection events.
- `dcs.gif` parsing preserves repeated and unknown query parameters.
- DC API parsing validates JSON, requires a non-empty `events` array, accepts an optional `static` object, and reports partial results when invalid values can be safely omitted.
- Each DC API event item becomes a logical network observation. Event values override static values on key collisions.
- The parameter classifier uses a versioned static catalog generated from Oracle's Full Parameter Reference, curated official-document supplements (including commerce parameters), and optional locally imported entries. Documentation matches are out-of-the-box, conventional undocumented names are custom, and unmatched reserved namespaces remain needs-review.
- The sensitive-value scanner detects email-, phone-, payment-card-, identifier-, and token-like values without transmitting them.
- Documented or name-identified identifiers override only the generic token-shape heuristic. Raw email, payment-card, and phone detection retain priority except for validated system-generated formats such as `dcsdat` timestamps.
- Adapter-specific observations are normalized into extensible platform-neutral loader, network, parameter, and session models before reaching the UI.

## Diagnostic engine

Diagnostics are recomputed from immutable session evidence. Rules cover absent or duplicate loaders, no collection after a loader, account/environment mismatches, late capture, malformed or failed requests, duplicate page-view heuristics, sensitive values, unknown parameters, high custom cardinality, and documented commerce event/payload consistency. Every result has severity, evidence identifiers, and a recommendation; documentation-backed commerce findings also carry their Oracle source URL.

## Session and persistence

Full request observations and bodies are not written to long-term storage. They live in the panel store and a bounded `chrome.storage.session` per-tab cache until cleared, the tab closes, or the browser extension session ends. The latest 1,000 observations are retained; the UI reports when older entries are removed. Only user settings, expected profiles, and explicitly imported catalog entries use `chrome.storage.local`. Files are created only when the user acknowledges the raw-data handling notice and initiates an export.

## Build structure

Vite builds three HTML entries and the module service worker in the primary build. A second single-entry build emits the static content script as a self-contained IIFE because Manifest V3 content scripts cannot import shared ES-module chunks. A distribution verifier confirms the manifest paths, icons, and classic-script content bundle. The fixed names match `public/manifest.json`; all other extension-page chunks are locally bundled with hashes. The extension content security policy permits only self-hosted scripts.
