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
Inspected network -> discovery-provider registry -> Google/Adobe/Tealium technology evidence -> panel store
explicit Discovery capture -> read-only inspected-page probe -> bounded normalized data-layer snapshot -> comparison/reuse analysis
panel store -> active platform adapter -> diagnostics/summaries -> tabs/export
saved QA plan -> pure contract evaluator + captured step evidence -> pass/warn/fail scorecard -> export
panel store -> service worker in-memory summary -> actionable toolbar companion
settings + saved QA plans -> chrome.storage.local
current per-tab QA run -> chrome.storage.session
explicit export -> local Blob download or clipboard
```

No backend is used because all required evidence is already available locally in the inspected browser. Avoiding a backend also prevents diagnostic payloads, account identifiers, URLs, or parameter values from leaving the machine.

## Platform adapter layer

Browser and React runtime surfaces do not select Infinity parsers, scanners, diagnostics, catalogs, profile fields, or terminology directly. They resolve a typed adapter through the validated platform registry. Observations and sessions carry the stable adapter ID, and explicit unknown IDs fail instead of falling back to Infinity.

The current `oracle-infinity` adapter wraps the existing Infinity behavior. A future adapter can add request matchers, payload parsers, loader evidence, catalogs, expected-profile fields, diagnostics, UI labels, and export notes without replacing the DevTools, storage, UI shell, or report-delivery infrastructure. Lightweight identity, DOM, and diagnostics registries keep the popup, content script, and service worker from importing the full panel/catalog bundle. See [Platform adapters](PLATFORM_ADAPTERS.md).

## Discovery provider layer

Discovery providers describe existing source ecosystems rather than the target Oracle platform. Google, Adobe, and Tealium providers recognize bounded network signatures and normalize them into common technology evidence. A self-contained inspected-page probe reads only supported data objects on explicit capture: Google data layers (including custom names discoverable from standard GTM bootstraps), `adobeDataLayer`, Adobe-associated `digitalData`, `utag_data`, and `utag.data`.

The probe enumerates own property descriptors so accessors are reported rather than invoked. It does not wrap push functions, call vendor APIs, patch networking, or enumerate arbitrary browser globals. Each layer is capped at 100 queue entries, 500 flattened fields, six levels of depth, and 2,000 characters per scalar value. Cycles, functions, symbols, DOM nodes, unreadable proxies, and deeper values become explicit unsupported markers.

The reuse analyzer is separate from both discovery providers and the Infinity platform adapter. It compares normalized discovered names and values with the active session's observed target-platform parameters. Exact name/value equality is the only automatic **already collected** conclusion; all other populated sources remain candidates requiring client confirmation. This boundary allows the same discovery providers to be reused by a future Oracle Fusion adapter.

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

## QA contract engine

QA plans are validated, platform-aware data rather than component state. A plan contains ordered scenario or consent-checkpoint steps. Scenario expectations can match event kind, source, `wt.dl`, and `wt.ev`, then enforce count, parameter presence, empty-value, and regular-expression rules. Consent checkpoints compare configured blocked/allowed/required expectations with browser-visible collection events, current loader evidence, and identifier-classified parameters.

The evaluator is a pure TypeScript module independent from React and Chrome APIs. Starting a step records the current collection-event IDs as its baseline; completing it evaluates only later events and stores an immutable evidence snapshot. Existing event-scoped diagnostics are folded into the score. High diagnostics fail a step, lower actionable diagnostics warn, and contract violations fail. The run remains in progress until every step has a result, then resolves to fail, warn, or pass in that order.

## Session and persistence

Full request observations and bodies are not written to long-term storage. They live in the panel store and a bounded `chrome.storage.session` per-tab cache until cleared, the tab closes, or the browser extension session ends. The current QA run and completed-step event snapshots use the same per-tab session storage so a scorecard can span page navigation. Discovery retains at most 10 snapshots in the active panel store so before/after comparison can span navigation while that DevTools context remains open; those snapshots are not written to `chrome.storage.local` or uploaded. The latest 1,000 live observations are retained; the UI reports when older entries are removed. Only user settings, expected profiles, saved QA plan definitions, and explicitly imported catalog entries use `chrome.storage.local`. Files are created only when the user acknowledges the raw-data handling notice and initiates an export.

## Build structure

Vite builds three HTML entries and the module service worker in the primary build. A second single-entry build emits the static content script as a self-contained IIFE because Manifest V3 content scripts cannot import shared ES-module chunks. A distribution verifier confirms the manifest paths, icons, and classic-script content bundle. The fixed names match `public/manifest.json`; all other extension-page chunks are locally bundled with hashes. The extension content security policy permits only self-hosted scripts.
