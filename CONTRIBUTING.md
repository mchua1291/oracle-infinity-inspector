# Contributing

Contributions that improve Oracle Infinity QA accuracy, documentation coverage, accessibility, performance, or browser compatibility are welcome.

## Local development

Requirements: Node.js 20 or newer, npm, Git, and Microsoft Edge or another Chromium browser.

```powershell
git clone https://github.com/mchua1291/oracle-infinity-inspector.git
cd oracle-infinity-inspector
npm ci
npm run typecheck
npm test
npm run lint
npm run build
npm run smoke:edge
```

Load the generated `dist` directory from `edge://extensions` with Developer mode enabled.

The Edge smoke test is optional on platforms without Microsoft Edge, but it should pass before a browser-facing release.

## Pull requests

- Keep parsing, classification, and diagnostic logic independent from React and Chrome APIs where practical.
- Add regression tests for changed behavior.
- Preserve raw empty-string and explicit-null observations.
- Use official Oracle documentation for bundled parameter or commerce rules and include the source URL.
- Do not introduce remote executable code, telemetry, request mutation, or a backend data path.
- Run type checking, tests, lint, formatting checks, and a production build before opening a pull request.
- Explain user-visible changes and any privacy or permission impact.
- Keep shared browser, storage, UI, and export code platform-neutral. New product-specific endpoints, schemas, terminology, profile fields, and diagnostics belong behind a `PlatformAdapter`.
- Add an adapter registration test and synthetic request/DOM fixtures for each supported platform generation.

## Test data safety

Never commit real client payloads, account GUIDs, email addresses, identifiers, secrets, private URLs, or exported QA reports. Fixtures must use clearly synthetic hosts and values. Block Oracle-shaped fixture requests during manual browser tests as described in [docs/QA_GUIDE.md](docs/QA_GUIDE.md).

## Documentation

Update the relevant guide whenever behavior, permissions, installation steps, supported traffic, or a limitation changes. Parameter catalog changes must retain a documentation verification date and an official source.

See [docs/PLATFORM_ADAPTERS.md](docs/PLATFORM_ADAPTERS.md) before changing request routing, loader detection, expected profiles, or export schemas.
