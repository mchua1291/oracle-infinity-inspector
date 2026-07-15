# Using Oracle Infinity Inspector

Use the inspector only on websites and environments you are authorized to test. The extension is passive, but captured request payloads and exported reports may contain client data.

## Use the toolbar companion

Select the Oracle Infinity Inspector toolbar icon for a lightweight page check.

- **Scan current page** performs an explicit one-time DOM scan for loader and tag-manager evidence without enabling continuous monitoring.
- The status view shows cached loader, event, library, tag-manager, parameter, and warning counts.
- Up to three high-priority finding titles appear without exposing their captured values.
- **Copy status summary without payload values** copies only the page URL and aggregate counts.
- The popup updates while it remains open when the background session changes.

The popup cannot open a particular DevTools panel or capture complete network payloads by itself. Press `F12`, select **Oracle Infinity**, and reload the page for a complete QA session.

## Start a complete capture

1. Open the target page in Microsoft Edge 102+ (verified) or a compatible Chromium 102+ browser.
2. Open DevTools on that tab.
3. Select the **Oracle Infinity** panel.
4. Select **Clear session and reload inspected page** in Overview.
5. Wait for the page, consent tooling, and Infinity libraries to finish loading.
6. Perform only the interactions in the approved QA test plan.

Opening the panel after page load can produce an incomplete session. A missing loader or request is not a valid defect until the page has been reloaded with DevTools open.

DevTools stays attached to one browser tab. Navigating within that tab is supported; switching to another tab requires opening DevTools on the other tab.

## Understand the sections

### Overview

Overview summarizes the current page, detected CX Tag loaders, browser-visible collection calls, Infinity libraries, tag managers, parameter classifications, and warnings.

- **CX Tag** reports DOM-visible loader evidence.
- **Observed calls** counts verified collection events visible to the browser.
- **Libraries** summarizes Infinity resources separately from data collection.
- **Standard**, **Custom**, and **Needs review** classify observed parameter rows.
- **Warnings** shows the number of diagnostic findings.

The Oracle debug URL button copies the current URL with `_ora.debug=vvvv`; it does not navigate or reload the page.

### Implementation

Implementation displays:

- Tag-manager evidence from supported Google Tag Manager, Tealium iQ, and Adobe Tags signatures.
- CX Tag loader account GUID, tag ID, `_ora.config`, DOM location, and inferred load mode.
- Infinity library health, HTTP status, and cache-validation state.

Tag-manager presence is an implementation clue, not proof that a particular container deployed Infinity.

### Discovery

Discovery inventories supported Google, Adobe, and Tealium evidence and reads bounded snapshots of known page-context data objects. It does not invoke `gtag`, `_satellite`, `alloy`, `utag`, or any Infinity collection API.

1. Reload once with DevTools open so recognizable tag-manager and analytics requests can be observed.
2. Select **Capture baseline** immediately before an approved interaction. The first snapshot becomes the comparison baseline.
3. Perform one approved interaction, then select **Capture comparison**.
4. Review **Infinity reuse** for exact name/value matches, populated candidates, different values, and empty/null sources.
5. Review **Changes** to see fields added, removed, or changed since the selected baseline.
6. Use **Data layers** to inspect every safely flattened field retained in the bounded snapshot.

The initial providers recognize standard Google Tag Manager, Google tag/Google Analytics, Adobe Tags, Adobe Analytics AppMeasurement, Adobe Web SDK/Edge Network, Tealium iQ, and Tealium Collect evidence. Supported page objects include standard or discoverable custom Google data layers, `adobeDataLayer`, Adobe-associated `digitalData`, `utag_data`, and `utag.data`.

An **already collected** assessment requires an observed Infinity parameter with the same normalized name and value. A **candidate to map** means only that a populated browser-visible source exists and no observed Infinity parameter has the same name. It is not an approved semantic mapping. Confirm meaning, ownership, format, consent treatment, and the intended Infinity parameter name with the client.

Raw values stay visible. Empty/null sources and sensitive shapes such as email addresses remain highlighted. Snapshots are held in the active DevTools panel, retain up to 10 captures, and are cleared when the panel context ends or when you select **Clear snapshots**.

### Network Events

Each verified browser-visible collection event appears as an individual row. Select an event to review:

- Request method, response status, account GUID, and `wt.dl` event code.
- The full observed request URL.
- Event-scoped QA findings.
- All captured parameters in one view, grouped into out-of-the-box, custom, and needs-review sections.
- Empty strings and explicit nulls highlighted as potential implementation gaps.

Use the source, event-type, search, and warning filters to narrow a long session.

### QA Plan

QA Plan converts an approved manual test plan into an executable local contract:

1. Select **New QA plan**, name the plan, and confirm the optional domain.
2. Add scenario steps and, where relevant, consent checkpoints. Plans are saved locally and can be reused on later sessions.
3. For each expected event, configure any known `wt.ev`, `wt.dl`, event kind, source, minimum/maximum count, and parameter rules. A parameter can be required, optional, or forbidden; non-empty values are required by default, and an optional regular expression can validate format.
4. For a consent checkpoint, record the state being tested and whether collection calls, loader evidence, and identifier parameters must be blocked, are allowed, or are required. These expectations are client-configurable because consent implementations and approved requirements differ.
5. Save the plan and start a new QA run.
6. Select **Start capture** immediately before performing one approved interaction or consent action. Wait for traffic to settle, then select **Complete step**.
7. Review the pass, warn, or fail result and its evidence. Use **Run again** to replace a step result after a controlled retest.

Only one step captures at a time. Completed-step events remain attached to the current scorecard across navigation and session clears, so a multi-page flow can be exported as one report. Clearing the QA run removes that in-browser scorecard evidence but does not delete the saved plan.

A consent checkpoint is an evidence comparison, not a legal conclusion. The inspector does not read a CMP's internal consent record, cookies, server-side activity, or vendor enforcement state.

### Event Timeline

The timeline places loader, library, request, and diagnostic evidence in observation order. Use it to understand whether collection happened before or after key implementation evidence.

### Warnings

Warnings are evidence-backed QA prompts ordered by severity. A warning is not automatically a confirmed defect; compare it with implementation requirements, consent behavior, and Oracle documentation.

High-severity findings include malformed requests and raw sensitive values such as email addresses or payment-card-like values. Documented identifiers such as `wt.co_f` are treated as identifiers rather than authentication secrets.

### Export

- **JSON** preserves structured event, payload, library, tag-manager, discovery snapshot, reuse-assessment, diagnostic, and QA scorecard evidence for tooling or archival workflows.
- **Markdown** creates a readable QA report with existing technology evidence, reuse candidates, changed fields, and the step-by-step pass/warn/fail scorecard.
- **Copy readable QA report** places the Markdown version on the clipboard.

Exports contain raw values, request URLs, and identifiers. Download and copy actions remain disabled until you acknowledge the raw client-data notice. Review the file before sharing it, use an approved storage location, and follow the client's retention requirements.

JSON reports use schema version 4 and include a platform adapter identity plus optional `discovery` and `qaScorecard` sections. Integrations should check `schemaVersion`, `platform.id`, and `reportType` before interpreting platform-specific details.

### Settings

Settings are stored locally in extension storage.

- Toggle DOM mutation monitoring, optional `window.ORA` detection, and reload recommendations.
- Define the expected environment, account GUIDs, tag ID, `_ora.config`, and load mode for the current domain.
- Import or export locally verified Oracle parameter catalog entries.
- Saved QA plans are also retained in local extension storage and can be deleted from QA Plan.
- Reset the current in-memory session without deleting saved settings.

Imported catalog documentation links must point to trusted documentation. Do not import client payloads as catalog entries.

## Suggested QA checklist

1. Confirm the inspected URL and expected domain profile.
2. Confirm loader account GUID, tag ID, configuration, and load mode.
3. Confirm expected Infinity libraries loaded or were cache-validated without errors.
4. Capture a Discovery baseline, perform one approved interaction, capture a comparison, and review candidate reusable fields.
5. Start the corresponding QA Plan step, trigger one approved interaction, and complete the step after traffic settles.
6. Match each interaction to its collection event and complete payload.
7. Run configured consent checkpoints at the exact before/after states defined by the client test plan.
8. Review required parameters, empty/null values, formats, commerce correlations, discovery candidates, and scorecard findings.
9. Investigate raw sensitive values and unexpected custom or reserved parameters.
10. Export the report, record the test conditions, and remove client evidence when retention expires.

See [Known Limitations](LIMITATIONS.md) before reporting missing data and [QA Guide](QA_GUIDE.md) for sanitized fixture testing.
