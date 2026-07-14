# Platform adapters

The browser-extension infrastructure is product-neutral. Product knowledge is supplied by a registered platform adapter so the current Oracle Infinity implementation can coexist with a future Oracle Fusion analytics implementation during a migration period.

No future Oracle product name, endpoint, or payload contract is assumed. A new adapter should be created only from authorized browser evidence and official documentation.

## Boundary

The shared runtime owns:

- Manifest V3 and DevTools lifecycle management
- HAR and live-network subscriptions
- dormant DOM inspection and mutation monitoring
- bounded per-tab session persistence
- parameter, warning, timeline, and export presentation
- sensitive-value safeguards
- JSON/Markdown download and clipboard handling
- build verification, CI, and Edge smoke testing

An adapter owns:

- product identity and UI terminology
- candidate request matching and payload parsing
- loader discovery and loader-specific detail fields
- collection, library, and support-traffic classification
- event display names and platform-specific metadata
- parameter catalog version and entries
- expected-domain profile fields
- diagnostics and summary calculations
- debug actions and product-specific export notes

The full contract is defined in `src/features/platform/platformAdapter.ts`. The registry in `src/features/platform/platformRegistry.ts` validates identifiers and provides deterministic adapter lookup. Runtime surfaces call platform runtimes rather than importing a product parser or scanner directly.

Lightweight identity, DOM, and diagnostics capabilities have separate registries. This prevents the popup, DevTools bootstrap, content script, and service worker from bundling the complete parameter catalog and panel UI merely to obtain a label, scan a script, or calculate a summary. The Infinity content script remains a small self-contained classic script under Manifest V3.

## Current adapter

`src/features/infinity/infinityPlatformAdapter.ts` registers `oracle-infinity`. It wraps the existing, independently tested Infinity URL patterns, CX Tag scanner, `dcs.gif` and DC API parsers, parameter catalog, commerce validation, diagnostics, library summaries, and support-traffic summaries.

Existing model names such as `OracleNetworkObservation` remain as compatibility aliases. New shared code should use `PlatformNetworkObservation`, `PlatformLoaderObservation`, `ParameterCatalogEntry`, and the other platform-neutral aliases.

## Adding a future adapter

1. Create a product directory such as `src/features/fusion-analytics/`.
2. Implement documented URL matching, network parsing, loader scanning, catalog data, diagnostics, and summaries without changing shared React or Chrome code.
3. Implement every `PlatformAdapter` member and give the adapter a stable lowercase identifier.
4. Register its full, identity, DOM, and diagnostics capabilities in the corresponding platform registries. Runtime-specific registrations must use the same stable platform ID.
5. Add synthetic HAR, DOM, payload, expected-profile, diagnostic, and export fixtures. Never commit client traffic.
6. Prove that its request matchers do not overlap another adapter unintentionally.
7. Run type checking, unit/component tests, production build verification, and the Edge smoke test.

The registry rejects duplicate identifiers and refuses unknown explicit platform identifiers. It does not silently treat an unknown future payload as Infinity.

## Extensible observations

Every loader and network observation can carry `platformId`. Loader configuration can add string-valued `platformConfig`, while network observations can add primitive `platformData`. Parameter origins and event/source names are strings so a future platform is not constrained to Infinity's DC API terminology. Common fields remain available for the existing UI and compatibility.

Expected domain profiles also carry `platformId`. An adapter supplies field definitions plus read/write functions, allowing different product generations to store profiles for the same domain without overwriting one another.

## Export compatibility

JSON QA reports use schema version 2 and include:

- adapter ID
- product family and display name
- platform generation
- adapter-specific report type and catalog version
- generic event/source strings and platform-specific event details

Consumers should check `schemaVersion`, `platform.id`, and `reportType` before interpreting product-specific fields. A future incompatible report change must increment the schema version.

## Static extension metadata

Browser manifest names and store identities are static at build time. The current package remains branded Oracle Infinity Inspector because Infinity is the only registered adapter. If the same package later supports both generations, the manifest and repository can adopt a neutral product name while the panel, popup, reports, and captured sessions continue to display the detected adapter identity.

## Visibility constraint

Adapters do not expand browser visibility. A future platform remains inspectable only to the extent that meaningful loader and event evidence is visible in the inspected tab's DOM or network traffic. Server-side collection, opaque encryption, and inaccessible frames require separate observability.
