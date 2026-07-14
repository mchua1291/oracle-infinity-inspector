# Changelog

All notable changes to Oracle Infinity Inspector are documented here.

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
