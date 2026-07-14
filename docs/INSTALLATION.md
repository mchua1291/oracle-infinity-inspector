# Installation

Oracle Infinity Inspector is installed from its source code as an unpacked Microsoft Edge extension. No Edge Add-ons or Chrome Web Store package is provided.

## Requirements

- Microsoft Edge or another Chromium browser with Manifest V3 DevTools support and Chromium engine version 102 or newer.
- Node.js 20 or newer, including `npm`.
- Git, if cloning or updating from GitHub.

Check the local tools from PowerShell:

```powershell
node --version
npm --version
git --version
```

## Download and build

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
4. Browse to the generated `dist` directory and select it.
5. Confirm that **Oracle Infinity Inspector** appears and is enabled.
6. Open or return to the site you want to inspect.
7. Open DevTools with `F12` or `Ctrl+Shift+I`.
8. Select **Oracle Infinity** in the DevTools tab row. If it is not visible, select the `»` overflow menu.

Keep the repository in its installed location. Moving or deleting the directory invalidates the unpacked installation.

## Load in Google Chrome

The same build can be loaded from `chrome://extensions` using **Developer mode** and **Load unpacked**. Edge is the primary test browser for this project.

## Update an existing installation

From PowerShell in the repository:

```powershell
git pull --ff-only
npm install
npm run build
```

Then open `edge://extensions` and select the reload icon on Oracle Infinity Inspector. Close and reopen any DevTools windows that were already open.

Use `npm install` when following normal project updates because it reconciles package changes while preserving the lockfile. Contributors and automated builds should use `npm ci` for a clean, lockfile-exact installation.

## Remove the extension

1. Open `edge://extensions`.
2. Find **Oracle Infinity Inspector**.
3. Select **Remove** and confirm.
4. Delete the cloned repository separately if it is no longer needed.

No separate Edge installation or temporary browser is installed by this project. An earlier dedicated Edge profile used during development is independent from the extension and can be deleted separately if no longer needed.

## Verify the build before use

For a controlled QA environment, run the full local checks before loading a new revision:

```powershell
npm run typecheck
npm test
npm run lint
npm run build
```

See [Troubleshooting](TROUBLESHOOTING.md) if the panel is missing, blank, or does not update.
