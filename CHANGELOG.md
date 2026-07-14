# Changelog

All notable changes to Oracle Infinity Inspector are documented here.

## Unreleased

## 0.5.0 - 2026-07-14

### Added

- Reusable local QA plans with ordered scenario steps, explicit capture windows, event matchers, count limits, required/optional/forbidden parameter rules, non-empty validation, and optional value patterns.
- Client-configurable consent checkpoints for before-choice, rejected, accepted, and withdrawn states, with blocked/allowed/required expectations for collection calls, loader evidence, and identifier parameters.
- Per-tab pass/warn/fail scorecards that survive navigation and service-worker suspension, retain completed-step event evidence, and appear in JSON and Markdown exports.
- Focused contract, consent, export, settings-migration, persistence, QA-plan component, and complete multi-step acceptance coverage.

### Changed

- JSON QA exports now use schema version 3 and can include a platform-neutral `qaScorecard`.
- Browser documentation now distinguishes verified Microsoft Edge support, expected Google Chrome compatibility, best-effort support for other Chromium browsers, and unsupported Firefox/Safari architectures.
- Removed obsolete standalone parameter-tab components and test-only compatibility exports superseded by the unified event-payload view and platform adapter runtime.
- CI now rejects unreachable production source files and exported declarations with no production references; TypeScript also enforces unused local and parameter checks.

## 0.4.0 - 2026-07-14

### Added

- An actionable toolbar companion that can scan the current page, update automatically, surface priority findings, and copy a payload-free status summary.
- Sanitized documentation screenshots generated from synthetic `example.test` evidence.
- A dependency-free release packager that creates a ready-to-load Edge ZIP and SHA-256 checksum.
- Automatic attachment of the unpacked Edge package to published GitHub releases.

### Changed

- Client installation guidance now leads with the prebuilt release package while retaining source-build instructions for contributors.
- Public documentation now includes a visual product tour and a sanitized demonstration workflow.
- Repository documentation now states explicitly that no open-source license is granted.

### Fixed

- Initial DevTools network capture now consumes Edge's HAR-log callback shape correctly and safely handles malformed responses.
- The Oracle Infinity DevTools tab now displays the extension mark when the tab strip is crowded.
- DevTools lifecycle operations now settle cleanly when Edge invalidates an open panel during an unpacked-extension reload.

## 0.3.0 - 2026-07-13

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
