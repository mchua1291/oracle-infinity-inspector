# Installation

Oracle Infinity Inspector is installed as an unpacked Chromium extension. Microsoft Edge is the verified release target, so tagged GitHub releases use an `-edge.zip` filename. The package uses standard Chromium Manifest V3 APIs and can also be loaded in compatible browsers; contributors can build the same package from source. No Edge Add-ons or Chrome Web Store listing is provided.

## Browser support

| Browser                                                 | Support level           | Notes                                                                                                               |
| ------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Microsoft Edge 102+                                     | Verified and supported  | Primary development target with automated smoke testing and authorized real-site QA.                                |
| Google Chrome 102+                                      | Expected compatible     | Uses the required Chromium APIs, but is not yet in the automated browser test matrix.                               |
| Brave, Vivaldi, Opera, and other Chromium 102+ browsers | Expected but unverified | Installation and DevTools behavior may differ. Do not assume client-QA parity without testing the selected browser. |
| Firefox and Safari                                      | Unsupported             | A separate extension and DevTools port would be required.                                                           |

Version 102 is the minimum because the extension uses `chrome.storage.session`. Browser or enterprise extension policies can still prevent unpacked installation even on a technically compatible Chromium version.

## Requirements

- Microsoft Edge or another Chromium browser with Manifest V3 DevTools support and Chromium engine version 102 or newer.
- A permanent local folder for the unpacked extension.
- Node.js 20 or newer and Git only when building from source.

## Install the ready-built package

1. Open the [latest GitHub release](https://github.com/mchua1291/oracle-infinity-inspector/releases/latest).
2. Download `oracle-infinity-inspector-vX.Y.Z-edge.zip` and its `.sha256` file.
3. Extract the ZIP to a permanent folder. Confirm `manifest.json` is directly inside that folder.
4. Continue with the browser-specific loading instructions below.

To verify the package in PowerShell, replace the filename as needed and compare the result with the downloaded `.sha256` file:

```powershell
Get-FileHash .\oracle-infinity-inspector-vX.Y.Z-edge.zip -Algorithm SHA256
```

## Build from source

Check the development tools from PowerShell:

```powershell
node --version
npm --version
git --version
```

Clone the public repository:

```powershell
git clone https://github.com/mchua1291/oracle-infinity-inspector.git
cd oracle-infinity-inspector
npm install
npm run build
```

`npm run build` creates a local `dist` directory. Edge loads that generated directory, not the repository root.

If Git is unavailable, download the repository source ZIP from GitHub, extract it to a permanent folder, open PowerShell in that folder, then run `npm install` and `npm run build`.

## Load in Microsoft Edge

1. Enter `edge://extensions` in the address bar.
2. Turn on **Developer mode**.
3. Select **Load unpacked**.
4. Select the extracted release folder containing `manifest.json`, or the generated `dist` directory when building from source.
5. Confirm that **Oracle Infinity Inspector** appears and is enabled.
6. Open or return to the site you want to inspect.
7. Open DevTools with `F12` or `Ctrl+Shift+I`.
8. Select **Oracle Infinity** in the DevTools tab row. If it is not visible, select the `»` overflow menu.

Keep the installed folder in its current location. Moving or deleting it invalidates the unpacked installation.

## Load in Google Chrome

1. Enter `chrome://extensions` in the address bar.
2. Turn on **Developer mode**.
3. Select **Load unpacked**.
4. Select the extracted release folder containing `manifest.json`, or the generated `dist` directory when building from source.
5. Confirm that **Oracle Infinity Inspector** appears and is enabled.
6. Open or return to the site you want to inspect.
7. Open DevTools with `F12` or `Ctrl+Shift+I`.
8. Select **Oracle Infinity** in the DevTools tab row. If it is not visible, use the DevTools overflow menu.

Chrome 102+ is expected-compatible because it exposes the Chromium APIs used by the extension, but Edge remains the project's verified browser target.

## Load in another Chromium browser

Use the browser's extension-management page to enable developer mode and load the extracted folder containing `manifest.json`. Brave, Vivaldi, Opera, and other Chromium 102+ browsers are best-effort, unverified targets. Confirm that the Oracle Infinity panel captures and exports a controlled test session before using one of these browsers for client QA.

## Update an existing installation

For a ready-built installation:

1. Download the newer release ZIP and checksum.
2. Verify and extract the package.
3. Replace the contents of the existing installed folder while keeping its path unchanged.
4. Open the browser's extension-management page (`edge://extensions` or `chrome://extensions`) and select **Reload** on Oracle Infinity Inspector.
5. Close and reopen DevTools windows that were already open.

For a source installation, run from PowerShell in the repository:

```powershell
git pull --ff-only
npm install
npm run build
```

Then open the browser's extension-management page and select the reload icon on Oracle Infinity Inspector. Close and reopen any DevTools windows that were already open.

Use `npm install` when following normal project updates because it reconciles package changes while preserving the lockfile. Contributors and automated builds should use `npm ci` for a clean, lockfile-exact installation.

## Remove the extension

1. Open the browser's extension-management page (`edge://extensions` or `chrome://extensions`).
2. Find **Oracle Infinity Inspector**.
3. Select **Remove** and confirm.
4. Delete the cloned repository separately if it is no longer needed.

No separate Edge installation or temporary browser is installed by this project. An earlier dedicated Edge profile used during development is independent from the extension and can be deleted separately if no longer needed.

## Verify the build before use

For a controlled QA environment, run the full local checks before loading a new revision:

```powershell
npm run typecheck
npm run audit:dead-code
npm test
npm run lint
npm run build
npm run smoke:edge
```

See [Troubleshooting](TROUBLESHOOTING.md) if the panel is missing, blank, or does not update.
