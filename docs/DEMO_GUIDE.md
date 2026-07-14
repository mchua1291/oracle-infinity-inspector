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
4. **Complete events:** Trigger one approved interaction. Open Network Events, select the matching event, and review all out-of-the-box, custom, unknown, empty, and null parameters together.
5. **QA guidance:** Show how Warnings distinguishes evidence from confirmed defects and links documented implementation guidance where available.
6. **Reporting:** Show the Export acknowledgement and explain the JSON and Markdown formats. Do not export real client data unless the demonstration explicitly requires it and an approved retention location is available.

## Core talking points

- The extension is local-only: no backend, telemetry, or uploaded payloads.
- It observes browser-visible evidence and does not call tracking APIs or change page requests.
- Infinity libraries and support traffic are separated from collection events.
- Parameter classifications and descriptions come from bundled Oracle documentation references.
- Empty and null values remain visible because they are important QA evidence.
- Privacy warnings are heuristic prompts; documented identifiers and generated fields receive parameter-aware handling.
- Platform adapters isolate Infinity-specific behavior so a future Oracle analytics generation can reuse the inspection shell.

## Demonstration boundaries

Do not describe absence of browser-visible evidence as proof that server-side collection is missing. Do not publicly share client URLs, account GUIDs, identifiers, payload values, or exported reports without explicit approval. This project is an independent QA utility and is not an Oracle product.
