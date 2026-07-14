# Oracle Infinity Inspector

Oracle Infinity Inspector is a local-first Microsoft Edge and Chromium DevTools extension for inspecting and documenting Oracle Infinity implementations. It reports CX Tag loader evidence, browser-visible collection events, complete observed payloads, implementation warnings, and QA-ready reports.

The extension is distributed as a ready-built GitHub release package and as source code. It is loaded as an unpacked extension and is not published in the Microsoft Edge Add-ons or Chrome Web Store.

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
- Provides a lightweight toolbar companion for page scans and payload-free status sharing.

The extension never calls Oracle tracking functions, changes page requests, uploads captured data, or sends telemetry.

## Product tour

The Overview combines implementation evidence, event counts, parameter classifications, and QA findings in one DevTools workspace.

![Sanitized Oracle Infinity Inspector overview using synthetic example.test data](docs/images/overview.png)

Network Events keeps each complete event and its payload together, including out-of-the-box, custom, unknown, empty, and null values.

![Sanitized complete network event and payload details using synthetic example.test data](docs/images/network-event-details.png)

The toolbar companion can scan the current page, show cached evidence, surface priority findings, and copy a summary that excludes payload values.

<img src="docs/images/popup-companion.png" alt="Sanitized Oracle Infinity Inspector toolbar companion using synthetic example.test data" width="384">

All public screenshots are generated from synthetic `example.test` evidence. They contain no client URLs, identifiers, or payloads.

## Install in Microsoft Edge

### Recommended: ready-built release package

1. Open the [latest GitHub release](https://github.com/mchua1291/oracle-infinity-inspector/releases/latest).
2. Download the `oracle-infinity-inspector-vX.Y.Z-edge.zip` asset and extract it to a permanent folder.
3. Open `edge://extensions` in Edge.
4. Enable **Developer mode** and select **Load unpacked**.
5. Select the extracted folder containing `manifest.json`.

The accompanying `.sha256` file can be used to verify the downloaded ZIP. Unpacked extensions do not update automatically; replace the extracted files and reload the extension when a new version is published.

### Build from source

Requirements: [Node.js 20 or newer](https://nodejs.org/), Git, and Microsoft Edge.

```powershell
git clone https://github.com/mchua1291/oracle-infinity-inspector.git
cd oracle-infinity-inspector
npm install
npm run build
```

After building:

1. Open `edge://extensions`, enable **Developer mode**, and select **Load unpacked**.
2. Select the repository's generated `dist` folder.
3. Open a site you are authorized to test.
4. Open DevTools, then select the **Oracle Infinity** panel. Use the DevTools `»` overflow menu if the panel is hidden.
5. In the panel, select **Clear session and reload inspected page** before evaluating the implementation.

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

The toolbar popup is useful for a quick loader/status check, but complete network capture and reports require the DevTools panel.

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
- [Client and product demonstration guide](docs/DEMO_GUIDE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [QA and fixture guide](docs/QA_GUIDE.md)
- [Oracle Infinity detection rules](docs/ORACLE_INFINITY_DETECTION.md)
- [Privacy and security](docs/PRIVACY_AND_SECURITY.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Platform adapter architecture](docs/PLATFORM_ADAPTERS.md)
- [Known limitations](docs/LIMITATIONS.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## License status

No open-source license is currently granted for this project. Public availability of the source
does not grant permission to use, modify, or redistribute it. Contact the repository owner for
permission before using the source or packaged extension outside an authorized evaluation.

This project is an independent QA utility and is not an Oracle product. Oracle and Oracle Infinity are trademarks of Oracle and/or its affiliates.
