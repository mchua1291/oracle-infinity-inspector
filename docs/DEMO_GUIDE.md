# Client and Product Demonstration Guide

This guide provides a safe, concise way to demonstrate Oracle Infinity Inspector to clients, implementation partners, and Oracle product stakeholders.

## Before the session

1. Use the latest tagged GitHub release and verify its SHA-256 checksum.
2. Install the unpacked extension in a dedicated demonstration browser profile when practical.
3. Use a synthetic fixture or a site you are explicitly authorized to inspect.
4. Confirm whether screenshots, recordings, exported reports, URLs, and account identifiers may be shared.
5. Clear prior sessions and remove earlier exported QA evidence.

The public screenshots in this repository use synthetic `example.test` URLs, fake identifiers, and invented payload values. Regenerate them with `npm run screenshots`; never replace them with client captures.

## Five-minute product walkthrough

1. **Toolbar companion:** Select the extension icon and choose **Scan current page**. Explain that this is a lightweight DOM/status check and not the complete capture surface.
2. **Start clean:** Open DevTools, select **Oracle Infinity**, then choose **Clear session and reload inspected page**.
3. **Implementation evidence:** Use Overview and Implementation to show the loader, account configuration, load mode, libraries, and tag-manager clues.
4. **Existing data discovery:** Open Discovery, show supported Google/Adobe/Tealium evidence, capture a synthetic baseline and comparison, and explain the difference between an exact Infinity match and a client-confirmed mapping candidate.
5. **Complete events:** Trigger one approved interaction. Open Network Events, select the matching event, and review all out-of-the-box, custom, unknown, empty, and null parameters together.
6. **Executable QA plan:** Open QA Plan and show how a saved scenario defines event counts, required or forbidden parameters, empty-value rules, and optional formats. Explain that the tester starts and completes one capture step around each approved interaction.
7. **Consent checkpoint:** Show the synthetic scorecard example for a before-choice, rejected, accepted, or withdrawn checkpoint. Emphasize that blocked, allowed, and required expectations come from the client's approved test plan and are not a universal legal determination.
8. **QA guidance:** Show how Warnings and the pass/warn/fail scorecard distinguish evidence from confirmed defects and retain the supporting events across a multi-page flow.
9. **Reporting:** Show the Export acknowledgement and explain that JSON and Markdown include discovery evidence, complete events, and the step scorecard. Do not export real client data unless the demonstration explicitly requires it and an approved retention location is available.

## Core talking points

- The extension is local-only: no backend, telemetry, or uploaded payloads.
- It observes browser-visible evidence and does not call tracking APIs or change page requests.
- Infinity libraries and support traffic are separated from collection events.
- Parameter classifications and descriptions come from bundled Oracle documentation references.
- Empty and null values remain visible because they are important QA evidence.
- Reusable QA plans turn approved scenarios and consent expectations into repeatable pass/warn/fail evidence.
- Discovery snapshots are explicit, bounded, read-only captures; candidate mappings still require client confirmation.
- Privacy warnings are heuristic prompts; documented identifiers and generated fields receive parameter-aware handling.
- Platform adapters isolate Infinity-specific behavior so a future Oracle analytics generation can reuse the inspection shell.

## Demonstration boundaries

Do not describe absence of browser-visible evidence as proof that server-side collection is missing. Do not present a consent checkpoint result as a legal-compliance verdict or proof of a CMP's internal state. Do not publicly share client URLs, account GUIDs, identifiers, payload values, or exported reports without explicit approval. This project is an independent QA utility and is not an Oracle product.
