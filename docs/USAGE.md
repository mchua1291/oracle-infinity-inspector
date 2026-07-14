# Using Oracle Infinity Inspector

Use the inspector only on websites and environments you are authorized to test. The extension is passive, but captured request payloads and exported reports may contain client data.

## Start a complete capture

1. Open the target page in Edge.
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

### Network Events

Each verified browser-visible collection event appears as an individual row. Select an event to review:

- Request method, response status, account GUID, and `wt.dl` event code.
- The full observed request URL.
- Event-scoped QA findings.
- All captured parameters in one view, grouped into out-of-the-box, custom, and needs-review sections.
- Empty strings and explicit nulls highlighted as potential implementation gaps.

Use the source, event-type, search, and warning filters to narrow a long session.

### Event Timeline

The timeline places loader, library, request, and diagnostic evidence in observation order. Use it to understand whether collection happened before or after key implementation evidence.

### Warnings

Warnings are evidence-backed QA prompts ordered by severity. A warning is not automatically a confirmed defect; compare it with implementation requirements, consent behavior, and Oracle documentation.

High-severity findings include malformed requests and raw sensitive values such as email addresses or payment-card-like values. Documented identifiers such as `wt.co_f` are treated as identifiers rather than authentication secrets.

### Export

- **JSON** preserves structured event, payload, library, tag-manager, and diagnostic evidence for tooling or archival workflows.
- **Markdown** creates a readable QA report suitable for issue descriptions or review notes.
- **Copy readable QA report** places the Markdown version on the clipboard.

Exports contain raw values, request URLs, and identifiers. Review the file before sharing it, use an approved storage location, and follow the client's retention requirements.

### Settings

Settings are stored locally in extension storage.

- Toggle DOM mutation monitoring, optional `window.ORA` detection, and reload recommendations.
- Define the expected environment, account GUIDs, tag ID, `_ora.config`, and load mode for the current domain.
- Import or export locally verified Oracle parameter catalog entries.
- Reset the current in-memory session without deleting saved settings.

Imported catalog documentation links must point to trusted documentation. Do not import client payloads as catalog entries.

## Suggested QA checklist

1. Confirm the inspected URL and expected domain profile.
2. Confirm loader account GUID, tag ID, configuration, and load mode.
3. Confirm expected Infinity libraries loaded or were cache-validated without errors.
4. Trigger a single approved interaction at a time.
5. Match each interaction to its collection event and complete payload.
6. Review required parameters, empty/null values, formats, and commerce correlations.
7. Investigate raw sensitive values and unexpected custom or reserved parameters.
8. Export the report, record the test conditions, and remove client evidence when retention expires.

See [Known Limitations](LIMITATIONS.md) before reporting missing data and [QA Guide](QA_GUIDE.md) for sanitized fixture testing.
