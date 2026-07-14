# Changelog

All notable changes to Oracle Infinity Inspector are documented here.

## 0.3.0 - Unreleased

### Added

- A typed platform-adapter contract for product identity, request routing, DOM loader detection, diagnostics, summaries, catalogs, expected profiles, UI terminology, debugging actions, and exports.
- A validated platform registry that rejects duplicate and unknown adapter identifiers.
- Platform identifiers on loader, network, session, popup, and versioned QA export data.
- Extensible platform-specific loader configuration, network metadata, parameter origins, and source breakdowns.
- Adapter contract tests covering network routing, DOM routing, metadata, registry validation, and expected-profile fields.

### Changed

- The active Infinity implementation is now registered as an adapter instead of being imported directly by browser runtime surfaces.
- The overview, implementation, network-event, settings, popup, DevTools title, diagnostics, and export flows resolve their behavior and terminology from the active adapter.
- JSON QA exports use schema version 2 and include explicit platform identity and generation metadata.
- Settings migrate transparently from the original Infinity-specific storage key to a product-neutral key.

### Fixed

- Valid tag-generated `dcsdat` timestamps no longer trigger phone-number or payment-card privacy warnings; malformed values receive a format-specific QA warning.

## 0.2.0 - 2026-07-13

### Added

- Complete expected-profile validation for account GUID, tag ID, environment, load mode, and `_ora.config`.
- Separate summaries for Infinity collection events, support traffic, and loaded library variants.
- Missing, null, and empty parameter diagnostics plus phone, payment-card, and raw-email privacy checks.
- Bounded browser-session persistence so captured observations survive service-worker suspension.
- Explicit client-data acknowledgement before raw JSON or Markdown export.
- Edge extension smoke testing, distribution verification, CI, dependency updates, and weekly Oracle catalog drift checks.
- Redwood-inspired extension icon set and expanded installation, usage, QA, privacy, architecture, and troubleshooting documentation.

### Changed

- Collection request detection now enforces Oracle hostname boundaries and recognizes official `dcs.gif` account paths.
- Network observations use stable fingerprints to prevent duplicate events from DevTools HAR and completion callbacks.
- Oracle library and `304` support requests no longer inflate data-collection event counts or QA report detail.
- DOM inspection remains dormant until the DevTools panel is opened, and URL polling runs only while the panel is visible.
- Captured observations and background timeline entries are bounded to prevent unbounded memory growth.
- Custom parameter catalogs accept HTTPS sources only and apply field, size, and duplicate validation.

### Fixed

- Content scripts are now emitted as a self-contained classic script so Edge can inject them under Manifest V3.
- Markdown exports escape captured HTML and Markdown characters.
- Known Oracle identifiers such as `wt.co_f`, `ora.eloqua`, `ora.c_id`, and `ora.elq.vid` are not misclassified as secrets.

## 0.1.0 - 2026-07-13

- Initial documented public baseline.
