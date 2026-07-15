# QA Guide

## Local setup

Requirements: Node.js 20 or newer and Microsoft Edge 102+ for verified browser testing. Google Chrome 102+ is expected-compatible; other Chromium browsers are unverified.

```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd run audit:dead-code
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run smoke:edge
```

The test suite uses sanitized DOM and HAR fixtures and never contacts Oracle endpoints.

## Load the unpacked extension

1. Open the browser's extension-management page: `edge://extensions` for Microsoft Edge or `chrome://extensions` for Google Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the repository's `dist` directory.
5. Open DevTools on the target tab before loading or reloading the page.
6. Select the **Oracle Infinity** panel. If it is hidden, use the DevTools `»` overflow menu.

After rebuilding, select the extension's reload button on the browser's extension-management page and reopen DevTools.

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
11. Navigate through at least two authorized pages in the same inspected tab. Confirm earlier events remain visible, later tagged interactions appear automatically, pause excludes new events, resume captures future events, and clear removes only live history after confirmation.

## Existing technology and data-layer discovery

1. Reload once with DevTools open, then confirm standard Google, Adobe, or Tealium technology evidence agrees with the browser Network and Elements panels.
2. In Discovery, select **Capture baseline** immediately before one approved interaction. Confirm only supported data objects appear and that no client tracking call fires because of the capture.
3. Perform the interaction and select **Capture comparison**. Confirm new or changed fields appear in **Changes** without modifying the site's data-layer functions.
4. In **Infinity reuse**, confirm an exact same-name/same-value field is **already collected**, a populated unmatched field is **candidate to map**, a same-name/different-value field is highlighted, and empty/null values remain visible.
5. Confirm raw email-shaped values receive a sensitivity badge while timestamp-named 10/13-digit values do not receive a phone warning merely because of their length.
6. Review Google `dataLayer`, Adobe `adobeDataLayer`, Tealium `utag_data`, and `utag.data` only on synthetic or authorized pages. Never commit a real snapshot as a fixture or public screenshot.
7. Confirm **Clear snapshots** removes captured values while leaving passive technology evidence available.

## QA contracts and consent checkpoints

1. Translate the approved manual test plan into named **QA Plan** steps. Keep each step scoped to one interaction so unexpected or duplicate events remain attributable.
2. Set minimum and maximum event counts. Add required, optional, or forbidden parameter rules and leave **Allow empty** disabled when an empty string or null is a defect.
3. Use a value pattern only for a stable, agreed format. Invalid patterns fail the step rather than silently skipping validation.
4. Save the plan, start a run, and select **Start capture** immediately before the interaction. Complete the step only after the relevant browser-visible traffic settles.
5. For consent testing, create explicit checkpoints such as before choice, rejected, accepted, and withdrawn. Configure collection, loader, and identifier expectations from the client's approved requirements; do not assume one universal consent policy.
6. Confirm a blocked expectation fails when evidence is present and a required expectation fails when evidence is absent. An allowed expectation is informational and does not require presence.
7. Review all warn/fail findings before rerunning a step. A rerun replaces that step's previous captured evidence in the current scorecard.
8. Remember that loader presence does not prove execution and that browser-visible absence does not prove server-side suppression. The scorecard documents observed evidence, not legal compliance.

## Export QA

1. Open Export and confirm the collection-event, Infinity-library, parameter, empty/null, and diagnostic counts match the session.
2. Acknowledge that the report contains raw client data, then export the complete JSON report and the readable Markdown report.
3. Confirm every captured event contains request metadata, event-scoped QA findings, and all observed parameters grouped as out-of-the-box, custom, or needs review.
4. Confirm raw values, request URLs, and account GUIDs are preserved. Confirm empty strings and nulls are explicitly identified as potential issues.
5. When a QA run is present, confirm the scorecard includes the expected plan, step result counts, consent snapshots, expectation results, and findings. Confirm events captured on completed earlier steps remain in the report after navigation.
6. When Discovery snapshots exist, confirm JSON and Markdown include technology evidence, reuse assessments, and changed fields. Confirm only JSON contains the complete bounded flattened snapshot data.
7. Confirm JSON reports identify schema version 4 and the expected `platform.id`; adapter and discovery-provider tests and fixtures must never contain real client traffic.
8. Handle or delete exported client QA reports according to the approved retention process.

## Release checklist

- TypeScript, tests, lint, and production build pass.
- The local Edge smoke test passes on a workstation with Edge installed.
- `dist/manifest.json` is MV3 and points to fixed service-worker/content-script bundle names.
- No remote script, telemetry, broad `host_permissions`, or request-blocking permission is present.
- No real account GUID, customer data, email, token, or order data appears in source or fixtures.
- Tests use only sanitized fixtures.
- Manual synchronous, asynchronous, no-tag, blocked DC API, Discovery baseline/comparison, QA contract, consent checkpoint, scorecard export, complete-payload export, and empty/null checks pass.
- Documentation verification date and catalog version are current.
