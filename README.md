# Oracle Infinity Inspector

Oracle Infinity Inspector is a local-first Microsoft Edge and Chromium DevTools extension for inspecting and documenting Oracle Infinity implementations. It reports CX Tag loader evidence, browser-visible collection events, complete observed payloads, implementation warnings, and QA-ready reports.

The extension is distributed as source code and loaded as an unpacked extension. It is not published in the Microsoft Edge Add-ons or Chrome Web Store.

## What it does

- Detects Oracle CX Tag loaders and common tag-manager implementation clues.
- Separates Infinity libraries and support traffic from data collection events.
- Deduplicates overlapping HAR and live-network observations using deterministic request identities.
- Captures browser-visible `dcs.gif` and DC API v3 event payloads.
- Classifies parameters using Oracle's documented parameter reference.
- Highlights empty strings, explicit nulls, raw email addresses, and other QA concerns.
- Validates documented Oracle commerce events and value formats.
- Exports complete local QA reports as JSON or Markdown.
- Routes product-specific detection, validation, terminology, and export metadata through a typed platform adapter designed for future Oracle analytics generations.

The extension never calls Oracle tracking functions, changes page requests, uploads captured data, or sends telemetry.

## Install in Microsoft Edge

Requirements: [Node.js 20 or newer](https://nodejs.org/) and Microsoft Edge.

```powershell
git clone https://github.com/mchua1291/oracle-infinity-inspector.git
cd oracle-infinity-inspector
npm install
npm run build
```

Then:

1. Open `edge://extensions` in Edge.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Select the repository's generated `dist` folder.
5. Open a site you are authorized to test.
6. Open DevTools, then select the **Oracle Infinity** panel. Use the DevTools `»` overflow menu if the panel is hidden.
7. In the panel, select **Clear session and reload inspected page** before evaluating the implementation.

See [Installation](docs/INSTALLATION.md) for updating, removal, Chrome instructions, and common setup problems.

## Recommended QA workflow

1. Open DevTools on the target tab before reloading the page.
2. Clear the inspector session and reload.
3. Review **Overview** and **Implementation** for the loader, libraries, account configuration, load mode, and tag-manager clues.
4. Trigger only the approved interactions in the test plan.
5. Open **Network Events** and select each collection event to review its complete payload.
6. Review empty/null values, custom parameters, and **Warnings**.
7. Configure an expected domain profile in **Settings** when validating a known implementation.
8. Export JSON for machine-readable evidence or Markdown for a readable QA report.

The Export tab requires a local acknowledgement that the report contains raw client data before
download or clipboard actions are enabled.

Reports contain raw browser-visible values and may contain client identifiers or other client data. Store and delete them according to the client's approved QA evidence and retention process.

See [Usage](docs/USAGE.md) for a detailed walkthrough and [QA Guide](docs/QA_GUIDE.md) for safe fixture and real-site testing.

## Important limitations

- Only traffic visible to the inspected browser tab can be captured. Server-side, mobile, batch, and backend DC API traffic is outside the extension's visibility.
- DevTools is attached to one browser tab. Open DevTools separately on another tab.
- Opening DevTools after page load can miss earlier requests. Clear and reload before drawing conclusions.
- Loader and tag-manager detection is evidence-based and cannot always prove which rule, container, or consent decision produced a request.
- Firefox and Safari are not supported.

Read [Known Limitations](docs/LIMITATIONS.md) before using absence of evidence as a QA conclusion.

## Development

```powershell
npm install
npm run typecheck
npm test
npm run lint
npm run build
npm run smoke:edge
```

`smoke:edge` is an optional visible-browser test that requires Microsoft Edge. It builds the
extension, loads it into an isolated temporary Edge profile, blocks Oracle fixture traffic, verifies
panel-activated DOM capture, and renders the popup.

Generated output is written to `dist` and is intentionally not committed. After rebuilding, reload the unpacked extension from `edge://extensions` and reopen DevTools.

## Documentation

- [Installation and updates](docs/INSTALLATION.md)
- [Using the inspector](docs/USAGE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [QA and fixture guide](docs/QA_GUIDE.md)
- [Oracle Infinity detection rules](docs/ORACLE_INFINITY_DETECTION.md)
- [Privacy and security](docs/PRIVACY_AND_SECURITY.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Platform adapter architecture](docs/PLATFORM_ADAPTERS.md)
- [Known limitations](docs/LIMITATIONS.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

This project is an independent QA utility and is not an Oracle product. Oracle and Oracle Infinity are trademarks of Oracle and/or its affiliates.
