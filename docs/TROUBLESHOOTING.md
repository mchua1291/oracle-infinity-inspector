# Troubleshooting

## The Oracle Infinity panel is missing

- Confirm the extension is enabled at `edge://extensions`.
- Confirm Edge loaded the generated `dist` folder, not the repository root.
- Open the DevTools `»` overflow menu; narrow windows may hide the panel.
- Close and reopen DevTools after installing or reloading the extension.
- Rebuild if `dist` is missing: `npm run build`.

## The panel is blank or reports an initialization error

1. Open `edge://extensions` and select the extension's reload icon.
2. Close the affected DevTools window completely.
3. Reopen DevTools and the Oracle Infinity panel.
4. If the issue remains, rebuild with `npm run build`, reload the extension, and reopen DevTools.
5. Run `npm run typecheck`, `npm test`, and `npm run lint` before filing an issue.

Include the displayed error and extension version in a GitHub issue. Do not include real client payloads, account identifiers, email addresses, or private URLs.

## Edge reports `Extension context invalidated`

This can occur when an unpacked extension is reloaded while its DevTools panel is still open. The
reload retires the runtime used by that existing DevTools window.

1. Close the affected DevTools window completely.
2. Reopen DevTools and select the Oracle Infinity panel.

The inspector handles this lifecycle transition quietly, but an already-retired panel cannot attach
itself to the newly loaded extension runtime.

## The panel shows the wrong page or does not follow tab switching

A DevTools instance is attached to the tab where it was opened. It follows navigation within that tab, but it cannot reattach when you select a different browser tab. Open DevTools on the desired tab.

## No loader or collection event appears

- Open DevTools and the Oracle Infinity panel before reloading the page.
- Select **Clear session and reload inspected page**.
- Complete the site's approved consent flow if collection is consent-gated.
- Trigger the expected interaction again.
- Check Edge's Network panel for request blocking, offline mode, or failed requests.
- Confirm the page is not an Edge internal page or another restricted browser surface.
- Consider self-hosted or proxied libraries, inaccessible frames, and server-side collection.

Absence from the inspector is not proof of absence until capture timing and visibility limitations have been ruled out.

## Events appear more than once

Clear the session and reload once with DevTools open. If identical events still repeat, compare timestamps, request URLs, and payloads with Edge's Network panel. Some implementations legitimately fire duplicates; exact capture duplicates should be reported with sanitized evidence.

## The extension did not update after rebuilding

After `npm run build`:

1. Open `edge://extensions`.
2. Select the extension's reload icon.
3. Close and reopen DevTools.

The unpacked extension does not automatically reload when source files change.

## Exported reports contain sensitive client data

This is expected when the inspected analytics request contains that data: the tool preserves raw QA evidence. Stop sharing the report, move it to the approved client location, and follow the client's incident and retention procedures. Do not attach an unsanitized report to a public GitHub issue.

## Installation fails during `npm install`

- Confirm Node.js 20 or newer with `node --version`.
- Confirm the repository path is writable.
- Run `npm ci` for a clean installation when `package-lock.json` is unchanged.
- Avoid deleting or moving a folder that Edge is currently using as an unpacked extension.

If a dependency error persists, include the error text, Node version, and operating system in the issue—without environment secrets or client data.
