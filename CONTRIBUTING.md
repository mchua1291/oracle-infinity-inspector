# Contributing

Contributions that improve Oracle Infinity QA accuracy, documentation coverage, accessibility, performance, or browser compatibility are welcome.

## Local development

Requirements: Node.js 20 or newer, npm, Git, and Microsoft Edge or another Chromium browser.

```powershell
git clone https://github.com/mchua1291/oracle-infinity-inspector.git
cd oracle-infinity-inspector
npm ci
npm run typecheck
npm run audit:dead-code
npm test
npm run lint
npm run build
npm run package:extension
npm run smoke:edge
```

Load the generated `dist` directory from `edge://extensions` with Developer mode enabled.

The Edge smoke test is optional on platforms without Microsoft Edge, but it should pass before a browser-facing release.

Run `npm run screenshots` after intentional user-interface changes. Documentation screenshots must continue to use only the synthetic `example.test` session in the capture script.

## Pull requests

- Keep parsing, classification, and diagnostic logic independent from React and Chrome APIs where practical.
- Add regression tests for changed behavior.
- Preserve raw empty-string and explicit-null observations.
- Use official Oracle documentation for bundled parameter or commerce rules and include the source URL.
- Do not introduce remote executable code, telemetry, request mutation, or a backend data path.
- Run type checking, the dead-code audit, tests, lint, formatting checks, and a production build before opening a pull request.
- Explain user-visible changes and any privacy or permission impact.
- Keep shared browser, storage, UI, and export code platform-neutral. New product-specific endpoints, schemas, terminology, profile fields, and diagnostics belong behind a `PlatformAdapter`.
- Add an adapter registration test and synthetic request/DOM fixtures for each supported platform generation.

## Commenting standard

Comments are part of the maintenance contract for code that crosses browser contexts or depends on
non-obvious ordering. Add or update a concise comment when a change introduces or modifies:

- Manifest V3 lifecycle, DevTools, service-worker, content-script, or storage behavior.
- Deduplication, retention limits, navigation persistence, asynchronous sequencing, or race guards.
- Security and privacy boundaries around inspected-page data or extension messaging.
- A heuristic, documentation-derived rule, browser limitation, or deliberately conservative fallback.
- Logic whose reason cannot be recovered reliably from its types, names, and focused tests.

Explain **why the invariant exists** and what could break if it is removed. Do not narrate obvious
syntax or duplicate the implementation in prose. Update stale comments in the same pull request,
and pair behavioral comments with a regression test whenever the invariant is testable.

## Test data safety

Never commit real client payloads, account GUIDs, email addresses, identifiers, secrets, private URLs, or exported QA reports. Fixtures must use clearly synthetic hosts and values. Block Oracle-shaped fixture requests during manual browser tests as described in [docs/QA_GUIDE.md](docs/QA_GUIDE.md).

## Documentation

Update the relevant guide whenever behavior, permissions, installation steps, supported traffic, or a limitation changes. Parameter catalog changes must retain a documentation verification date and an official source.

See [docs/PLATFORM_ADAPTERS.md](docs/PLATFORM_ADAPTERS.md) before changing request routing, loader detection, expected profiles, or export schemas.
