# QA Guide

## Local setup

Requirements: Node.js 20 or newer and a Chromium browser.

```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run smoke:edge
```

The test suite uses sanitized DOM and HAR fixtures and never contacts Oracle endpoints.

## Load the unpacked extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the repository's `dist` directory. Microsoft Edge is supported at Chromium engine version 102 or newer.
5. Open DevTools on the target tab before loading or reloading the page.
6. Select the **Oracle Infinity** panel. If it is hidden, use the DevTools `»` overflow menu.

After rebuilding, click the extension's reload button on `chrome://extensions` and reopen DevTools.

## Safe DOM fixtures

The files in `tests/fixtures/dom` contain sanitized Oracle-shaped URLs. Prevent all network transmission while using them:

1. In DevTools, open the Command Menu and choose **Show Network request blocking**.
2. Add `*oracleinfinity.io/*` and enable request blocking.
3. Serve the fixture directory locally, for example: `python -m http.server 4173 --directory tests/fixtures/dom`.
4. Open `http://127.0.0.1:4173/synchronous-cx-tag.html` with DevTools already open. Confirm one head loader, synchronous inference, and a blocked loader network request.
5. Open `asynchronous-cx-tag.html`. Confirm direct async evidence.
6. Open `tag-manager-cx-tag.html`. Confirm inline loader evidence and tag-manager inference evidence.
7. Open a blank local page. Confirm the no-tag and reload caveats, without treating absence as proof of a broken implementation.

Keep request blocking enabled for every sanitized Oracle-shaped fixture. The extension itself never blocks requests.

## Browser-visible DC API fixture

Use DevTools request blocking so the browser creates observable request metadata without contacting Oracle:

1. Keep `*oracleinfinity.io/*` enabled under Network request blocking.
2. Open a local blank page with DevTools and the Oracle Infinity panel open.
3. In the DevTools Console, manually run the sanitized request below:

```js
fetch('https://dc.oracleinfinity.io/v3/example-account-guid', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    static: { dcssip: 'example.test', 'site.channel': 'qa' },
    events: [
      { 'wt.dl': '0', 'wt.ets': '1767225601000', dcsuri: '/home' },
      { 'wt.dl': '1', 'wt.ets': '1767225602000', 'site.action': 'open' },
    ],
  }),
});
```

4. Confirm the request is marked blocked in Chrome's Network panel.
5. Confirm Oracle Infinity Inspector reports two logical browser-visible DC API events, static inheritance, event origins, and a non-success response state. If Chrome omits the body for a blocked request in a particular version, validate parsing through the automated HAR fixture test instead.

Never run this fixture with Oracle request blocking disabled.

## Real non-production implementation QA

1. Use an authorized test page and test account only.
2. Open DevTools first, then clear and reload from the Overview banner.
3. Compare DOM loader account, tag ID, `_ora.config`, and sync/async inference evidence with the expected profile.
4. In Implementation, review tag-manager evidence as a possible deployment clue. Do not treat manager presence as proof that it deployed Infinity.
5. Confirm Infinity libraries are summarized separately. HTTP 200/304 libraries are healthy; investigate failed library states.
6. Trigger the page view and approved test interactions. Confirm `wt.dl=0`, `wt.dl=1`, and any other codes without assigning undocumented meanings.
7. In Network Events, select each event and verify the out-of-the-box, custom, and needs-review groups together in the payload detail.
8. Confirm empty strings and explicit nulls remain visible and are highlighted as potential issues.
9. Review duplicate, full expected-profile, request failure, empty-value, raw-email, payment-card, phone, token, and catalog warnings. Long values in documented identifier fields should remain identifiers, but a raw email is still a high-severity finding regardless of field name.
10. For commerce interactions, confirm the displayed reserved event name and transaction code, then review line-item alignment, subtotal math, and format findings. Low-severity companion/event-type findings are prompts for implementation-specific review where Oracle's examples are inconsistent.

## Export QA

1. Open Export and confirm the collection-event, Infinity-library, parameter, empty/null, and diagnostic counts match the session.
2. Acknowledge that the report contains raw client data, then export the complete JSON report and the readable Markdown report.
3. Confirm every captured event contains request metadata, event-scoped QA findings, and all observed parameters grouped as out-of-the-box, custom, or needs review.
4. Confirm raw values, request URLs, and account GUIDs are preserved. Confirm empty strings and nulls are explicitly identified as potential issues.
5. Handle or delete exported client QA reports according to the approved retention process.

## Release checklist

- TypeScript, tests, lint, and production build pass.
- The local Edge smoke test passes on a workstation with Edge installed.
- `dist/manifest.json` is MV3 and points to fixed service-worker/content-script bundle names.
- No remote script, telemetry, broad `host_permissions`, or request-blocking permission is present.
- No real account GUID, customer data, email, token, or order data appears in source or fixtures.
- Tests use only sanitized fixtures.
- Manual synchronous, asynchronous, no-tag, blocked DC API, complete-payload export, and empty/null checks pass.
- Documentation verification date and catalog version are current.
