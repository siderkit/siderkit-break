# Release guide

> Status: `1.0.3` is published on GitHub Releases and served through `https://dl.siderkit.com`. `1.0.2` stays online as the previous tag.

## Update host

`dl.siderkit.com` is a Cloudflare Worker (`siderkit-dl`) that proxies GitHub Releases for every Siderkit product. The first path segment is always the product slug:

| Path                                        | Source                                                               |
| ------------------------------------------- | -------------------------------------------------------------------- |
| `/health`                                   | liveness probe                                                       |
| `/`                                         | redirects to `https://siderkit.com/`                                 |
| `/siderkit-break/`                          | redirects to the product page                                        |
| `/siderkit-break/latest.json`               | `releases/latest/download/latest-dl.json`, rewritten to branded URLs |
| `/siderkit-break/i`                         | install beacon, empty `204`                                          |
| `/siderkit-break/releases/<version>/<file>` | `releases/download/v<version>/<file>`, streamed with Range support   |

The Worker keeps a product registry; adding a product is one entry, not a new Worker.

### URL contract

Every download, update, and beacon URL must carry the product slug immediately after the host:

```text
https://dl.siderkit.com/<product>/...
https://dl.siderkit.com/<product>/latest.json
https://dl.siderkit.com/<product>/i
https://dl.siderkit.com/<product>/releases/<version>/<file>
```

Product-less paths are forbidden in new code. The only exceptions are the legacy aliases kept for builds shipped before the namespace existed: `/latest.json`, `/i`, and `/releases/<version>/<file>` answer with a redirect (or `204` for the beacon) and point at `siderkit-break`. Never link to them from the site, the app, or CI.

There is no object storage in the path. GitHub Releases is the only binary store, and publishing a release (not draft, not prerelease) flips `/siderkit-break/latest.json` on the next request. `.github/workflows/release.yml` builds a draft release; publishing it is the switch that ships the update, and `.github/workflows/promote.yml` verifies the live manifest afterwards.

The updater stays usable as long as the Worker and the GitHub release exist. Keep the `latest-dl.json` asset on every release: the Worker reads it by that exact name, then falls back to `latest-r2.json` and `latest.json`.

## Version

The release keeps the manifest version identical in:

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

All three are now `1.0.3`, which leads the Help panel with About and turns on launch-at-login for new installs. `1.0.2` remains the previous tag. The app reads the Tauri version at runtime for the About panel.

## Artifact matrix

| Platform                  | Command                                                          | Artifacts                      |
| ------------------------- | ---------------------------------------------------------------- | ------------------------------ |
| Windows 10 1809+ / 11 x64 | `pnpm tauri build --bundles nsis`                                | `*-setup.exe`                  |
| macOS 10.15.7+ / 11.0+    | `pnpm tauri build --target universal-apple-darwin --bundles dmg` | one universal `*.dmg`          |
| Ubuntu 22.04+ (X11)       | `pnpm tauri build --bundles deb,rpm,appimage`                    | `*.deb`, `*.rpm`, `*.AppImage` |

`bundle.targets` in `src-tauri/tauri.conf.json` lists exactly these five formats; Tauri drops the ones that do not belong to the host platform. Windows therefore builds NSIS and nothing else, including a bare `pnpm tauri build`. The MSI was retired in `1.0.0-rc.1`: a managed Windows 11 machine rejected it with Windows Installer error 1625 while the NSIS package installed and uninstalled normally.

A release build adds `--config src-tauri/tauri.release.conf.json` to Windows. That config sets `bundle.createUpdaterArtifacts` and makes Tauri emit the `.sig` file next to the NSIS installer; it requires `TAURI_SIGNING_PRIVATE_KEY`. Since `1.0.3` the repository secret holds the empty-passphrase key (the whole key file on one line), so `release.yml` signs Windows without a local build. Do not use the release config for a local smoke build unless the key is set.

The build workflow in `.github/workflows/build.yml` runs the same commands and uploads the bundles as workflow artifacts. It does not create a GitHub release.

## CI build record (2026-11-26)

`1.0.3` is the first release built and signed entirely by CI. The run was
`45731260940` on tag `v1.0.3`; all four jobs succeeded (macOS disk image,
Windows installer, Linux packages, draft release). The Windows signing step
worked because `TAURI_SIGNING_PRIVATE_KEY` is now a repository secret.

The draft (`458819645`) carried nine assets with **unversioned names**, so the
Worker maps `/siderkit-break/releases/1.0.3/<file>` straight to the tag asset:

- `Siderkit-Break_windows_x64-setup.exe` and `.sig`
- `Siderkit-Break_macos_universal.dmg`
- `Siderkit-Break_linux_amd64.deb`, `Siderkit-Break_linux_x86_64.rpm`, `Siderkit-Break_linux_amd64.AppImage`
- `latest.json`, `latest-dl.json`, `SHA256SUMS.txt`

`release.yml` writes both manifests with an empty `notes` field and a
six-line `SHA256SUMS.txt`. Before publishing, the manifests were regenerated
with `scripts/make-latest-json.mjs` (release notes filled in) and
`SHA256SUMS.txt` was rebuilt with all eight files (binaries plus both
manifests). The three metadata assets were replaced over the REST API, then
the release was published with `PATCH {"draft": false}`. `promote.yml` run
`45732873941` verified the live manifest afterwards.

| Artifact                                      | Size      | SHA-256                                                            |
| --------------------------------------------- | --------- | ------------------------------------------------------------------ |
| `Siderkit-Break_windows_x64-setup.exe` (NSIS) | 6.81 MiB  | `8b7ea974ae3aa721ac1a4193207c6af98cec47cfe2e757542566efd707b2db18` |
| `Siderkit-Break_windows_x64-setup.exe.sig`    | 444 B     | —                                                                  |
| `Siderkit-Break_macos_universal.dmg`          | 14.50 MiB | `0ee8b2f1d29bbd16cfa1ced778d335727562db46312097683584a417c9c1b784` |
| `Siderkit-Break_linux_amd64.deb`              | 8.64 MiB  | `3a60f7fffdd8fd616ea4e980692a94ae51f19a4cb61280a74c93a97f13b4d71f` |
| `Siderkit-Break_linux_x86_64.rpm`             | 8.64 MiB  | `d8d38d5ce0c74e1d87e2779afdf7a72bfc7bddc4b2ce85d68413412f8639d327` |
| `Siderkit-Break_linux_amd64.AppImage`         | 83.06 MiB | `2f2bb9bd282ec4df0b7ddf10d67166e6b6f2fba7afd9ff95a7e63bce9f5fd276` |

## Local build record (2026-11-25)

`1.0.2` ships the shared-clock time fixes. The Windows installer was built
locally with `--config src-tauri/tauri.release.conf.json` and the minisign
private key; the macOS and Linux artifacts come from the `release.yml` run for
the tag, whose Windows signing step still failed because no repository secrets
were set (see §Signing). The draft release was created and verified over the
REST API and published with `PATCH {"draft": false}`; `promote.yml` confirmed
the live manifest afterwards.

| Artifact                                                     | Size     | SHA-256                                                            |
| ------------------------------------------------------------ | -------- | ------------------------------------------------------------------ |
| `Siderkit Break_1.0.2_x64-setup.exe` (NSIS, 23 UI languages) | 6.81 MiB | `86cb61aafbd2d6655a5d3e13beae8fa55d0782b432afdc2c2ce8d8e5dc65de12` |
| `Siderkit Break_1.0.2_x64-setup.exe.sig` (minisign)          | 444 B    | —                                                                  |

The release assets keep the versioned names the download host proxies:
`Siderkit-Break_1.0.2_windows_x64-setup.exe` and its `.sig`,
`Siderkit-Break_1.0.2_macos_universal.dmg`, `Siderkit-Break_1.0.2_linux_amd64.deb`,
`Siderkit-Break_1.0.2_linux_x86_64.rpm`, `Siderkit-Break_1.0.2_linux_amd64.AppImage`,
plus `latest-dl.json`, `latest.json`, and `SHA256SUMS.txt`.

## Local build record (2026-11-24)

`1.0.0` was built from the 2026-11-24 source tree with `--config src-tauri/tauri.release.conf.json`, so the installer carries an updater signature:

| Artifact                                                     | Size     | SHA-256                                                            |
| ------------------------------------------------------------ | -------- | ------------------------------------------------------------------ |
| `Siderkit Break_1.0.0_x64-setup.exe` (NSIS, 23 UI languages) | 6.81 MiB | `C8242E091A7F93C1D157FEB3DBFCFBBDFC1C4BFD76FEB666DF98271B11026A91` |
| `Siderkit Break_1.0.0_x64-setup.exe.sig` (minisign)          | 444 B    | —                                                                  |

The release assets use the versioned names the download host proxies: `Siderkit-Break_1.0.0_windows_x64-setup.exe` and its `.sig`, plus `latest-dl.json`, `latest.json`, and `SHA256SUMS.txt`.

## 1.0.0 implementation status (2026-11-24)

The 1.0.0 feature set is implemented and verified in source.

Source-level gates already pass:

- `pnpm check:web`: CSS ownership, 253 tokens, ESLint, 65 unit tests, `svelte-check` with 0 errors and 0 warnings, dependency boundaries, duplicate scan, TODO scan, file size, download URLs.
- `pnpm check:rust`: `cargo fmt --check`, `clippy -D warnings`, 100 tests.
- `pnpm check:i18n`: no missing keys; all 40 catalogs match `en.json` at 343 keys.
- Browser walkthrough at 360×560, 360×400, and 320×400: main view has no scrollbars, settings root and all seven detail pages render, Insights renders data and empty states, the finish card tag link expands and collapses, and the three floating-window size cards show real droplet previews.

The 1.0.0 installer measures 6.81 MiB, below the 10 MB budget. Not yet measured for 1.0.0: idle memory, cold start, and the on-VM matrix below. The rc.1 numbers stay in the records that follow until a 1.0.0 run replaces them.

## Local build record (2026-11-23)

`1.0.0-rc.1` was rebuilt after the updater, anonymous-count, license, installer-language, and context-menu changes:

| Artifact                                                          | Size     | SHA-256                                                            |
| ----------------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| `Siderkit Break_1.0.0-rc.1_x64-setup.exe` (NSIS, 23 UI languages) | 6.43 MiB | `08810660fe46c382264c8ba7577133390e3a0bf15f2c56343d1ef983df3dcc1c` |
| `Siderkit Break_1.0.0-rc.1_x64-setup.exe.sig` (minisign)          | 460 B    | —                                                                  |

The updater build used `--config src-tauri/tauri.release.conf.json` and the minisign private key. `scripts/make-latest-json.mjs` produced a valid `windows-x86_64` manifest from the installer and `.sig` file. The installer grew from 5.29 MiB to 6.43 MiB after adding reqwest/rustls, still below the 10 MB budget. This rebuild also carries the shared update-check block used by Settings → Updates, Settings → About, and Help → About, and the Help-icon badge for an available update.

No MSI was produced. The build log listed six languages whose Tauri-specific installer strings are still English (Hindi, Indonesian, Thai, Malay, Polish, Romanian); the standard NSIS pages are localized. The installer language selector and the `/P /UPDATE /R` skip path still need a run on the Windows VM.

## Local build record (2026-11-22)

Artifacts produced after the in-app reminder change: the operating-system
notification plugin is gone, every phase boundary opens a custom card, and the
Windows NSIS package keeps the per-user install folder.

| Artifact                                         | Size      | SHA-256                                                            |
| ------------------------------------------------ | --------- | ------------------------------------------------------------------ |
| `Siderkit Break_1.0.0_x64-setup.exe` (NSIS)      | 5.23 MiB  | `a9c135dc6fb0473e0dabcdb5006f24dc538f8fb2a42e9c44080f0a8842633363` |
| `Siderkit Break_1.0.0_x64_en-US.msi` (WiX)       | 6.80 MiB  | `9d13b55cb45b297a6b3bef1b29a4c3abd67d5e853abb71a52e95932da16b67d3` |
| `Siderkit Break_1.0.0_amd64.deb` (Debian)        | 6.55 MiB  | `f62968c2049acf3c02a54d7cd158745dcf2d4baefffa57cdb1e0bc95f26ddd13` |
| `Siderkit Break_1.0.0_amd64.AppImage` (AppImage) | 82.81 MiB | `de2b1046b1d5b59d287d1aa27452123f43d32730ad91eb674779cf5b50c03619` |

The MSI rows in the two build records below are kept as history. MSI is no longer built, signed, or published.

The AppImage was packaged with a locally supplied `runtime-x86_64`: the
continuous `appimagetool` build downloads its runtime while packaging, and this
build VM cannot reach GitHub. Fetch the runtime on the host, then run
`appimagetool <AppDir> <output> --runtime-file runtime-x86_64` after Tauri has
populated the AppDir.

Verified on the Windows 10 VM with a seeded one-minute configuration:

- focus end with an automatic break shows the running break card;
- break end shows the break-complete card, and **Start focus** starts the next session;
- with auto-start focus on, the break-complete card closes itself after 8 seconds and does not take keyboard focus;
- focus end with the break waiting shows the focus-complete card, and **Start break** starts the break;
- with reminders off, neither boundary shows a card; turning reminders on in Settings applies to the next boundary without a restart;
- a completed countdown shows its length, **Got it** dismisses it, and **Run again** starts the same length again;
- Action Center lists no Siderkit Break entry, and after deleting the leftover sender registration from earlier builds, a full focus boundary did not recreate it.

## Earlier local build record (2026-11-21)

Artifacts produced from the previous 1.0.0 release binary:

| Artifact                                         | Size      | SHA-256                                                            |
| ------------------------------------------------ | --------- | ------------------------------------------------------------------ |
| `Siderkit Break_1.0.0_x64-setup.exe` (NSIS)      | 5.36 MiB  | `5db3942a873b8703b96f7b955800a7c9eeba0b273f831fbe3298609962df8f44` |
| `Siderkit Break_1.0.0_x64_en-US.msi` (WiX)       | 7.00 MiB  | `e13d47b9a7eff4edef58f0afaff716ff8acc94a21c99e2106ae5f659116b37c1` |
| `Siderkit Break_1.0.0_amd64.deb` (Debian)        | 7.37 MiB  | `2d43364b926f1c834054dc581eee01b546921ce71e9abc219d77018b4ecbdc76` |
| `Siderkit Break_1.0.0_amd64.AppImage` (AppImage) | 83.52 MiB | `0a440ea7b787a81043b5fe4a5d7d12fe0dda7f5c6bac59e334b4e6ae51e8c1e0` |

These artifacts were rebuilt after the locate hint change: the hint is now a rounded frame around the droplet with a closer `I'm here` label and entry, glow, and echo motion. On X11 the hint window is override-redirect, so the window manager no longer pushes it away from a droplet that touches the screen edge. The AppImage was built with `APPIMAGE_EXTRACT_AND_RUN=1` because this build VM has no `libfuse2`; the AppImage itself still needs FUSE (or the same variable) on the target host. The RPM was not rebuilt this round because the build VM has no `rpmbuild` and no non-interactive sudo. The NSIS installer was rebuilt again for the per-user default folder described below; the other artifacts did not change.

### Windows installer

The Windows build ships one installer:

| Installer            | Scope        | Default folder                           | Elevation |
| -------------------- | ------------ | ---------------------------------------- | --------- |
| `*-setup.exe` (NSIS) | Current user | `%LOCALAPPDATA%\Programs\Siderkit Break` | None      |

It never prompts for administrator rights, so every user gets a separate copy without a UAC prompt. An all-users MSI is not offered; a managed deployment can still install the NSIS package per user or repackage the binary with its own tooling.

The installer carries 23 NSIS languages and shows the language selector before the first page. The OS language is preselected; a language outside the list falls back to English. The selector never appears during a silent (`/S`), passive (`/P`), or silent update (`/UPDATE`) run, so updates keep the language already stored in `HKCU\Software\Siderkit\Siderkit Break` and cannot block on a dialog. The seven UI languages without an NSIS translation (Bengali, Urdu, Swahili, Marathi, Telugu, Tamil, Filipino) use the English installer while the app itself stays fully translated. Six of the 23 (Hindi, Indonesian, Thai, Malay, Polish, Romanian) have no Tauri-specific message translation yet, so only the installer's own custom strings (reinstall, downgrade, WebView2 errors) fall back to English; the standard NSIS pages stay localized.

The NSIS installer records its install folder in `HKCU\Software\Siderkit\Siderkit Break`. Reinstalling restores that folder, so an existing per-user install under `%LOCALAPPDATA%\Siderkit Break` is upgraded in place instead of creating a second copy. Remove the old version first if you want the new default folder.

### User data

The install scope does not change these paths. Every Windows user has a separate copy.

| System  | Database (settings and history)                                           | Anonymous ID                                                    | Logs                                                        |
| ------- | ------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| Windows | `%APPDATA%\com.siderkit.break\siderkit-break.sqlite3`                     | `%APPDATA%\com.siderkit.break\metrics.json`                     | `%LOCALAPPDATA%\com.siderkit.break\logs\Siderkit Break.log` |
| macOS   | `~/Library/Application Support/com.siderkit.break/siderkit-break.sqlite3` | `~/Library/Application Support/com.siderkit.break/metrics.json` | `~/Library/Logs/com.siderkit.break/Siderkit Break.log`      |
| Linux   | `~/.local/share/com.siderkit.break/siderkit-break.sqlite3`                | `~/.local/share/com.siderkit.break/metrics.json`                | `~/.local/share/com.siderkit.break/logs/Siderkit Break.log` |

On Linux the data path follows `$XDG_DATA_HOME` when it is set. The webview cache lives beside the database (`%LOCALAPPDATA%\com.siderkit.break` on Windows, `~/.local/share/com.siderkit.break` on Linux, and normally `~/Library/WebKit/com.siderkit.break` on macOS); it can be deleted while the app is closed.

Uninstall keeps the database and logs by default. The uninstaller deletes both only when the **Delete app data** checkbox is selected. On Windows the autostart entry is removed from `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`.

The Windows installer is below the 10 MB budget.

Verified on a Windows 10 Pro 22H2 (19045.2965) VM: NSIS install, launch, shortcuts, uninstall, autostart, reboot with `--minimized`, reminder cards, countdown, break card, history, and the startup autostart self-heal. WebView2 157.0.4341.60 was installed by the NSIS bootstrapper. The NSIS build keeps the 75×32 active countdown overlay and the droplet-to-label gap matching the design. The final NSIS build was installed again after the Linux-only card-placement fix and showed the break-complete card with **Start focus**. An MSI was verified in the same round before it was retired; both installers were removed cleanly.

The current NSIS installer was re-verified on the same VM as a standard (non-administrator) user: no UAC prompt, default folder `%LOCALAPPDATA%\Programs\Siderkit Break`, install, launch, and uninstall. Uninstall removed the program files, shortcuts, and the uninstall entry; the database and logs stayed in place because **Delete app data** was left unchecked.

Verified on an Ubuntu 22.04.5 X11 VM: deb install, launch, global shortcuts, one-minute countdown, reminder card, focus-to-break transition, overlay `Break` prefix, and the tray locate hint. The locate hint was launch-tested from the release payload with the droplet in the screen center and on the bottom-left edge; the frame and label stayed on the droplet in both cases, and the X11 hint window is override-redirect so edge positions are not constrained. The Linux startup panic caused by setting click-through before the window was realized is fixed. For the in-app reminder round the deb and AppImage were launch-tested with a one-minute seed: the running break card and the break-complete card appeared, **Start focus** started the next session, a DBus monitor saw no `org.freedesktop.Notifications.Notify` call at the focus boundary, and the first card of a session is now centered because the position is applied again after the window is mapped. The deb and AppImage payloads were both launched; the deb install itself was verified in an earlier round: idle 22×22, focus 90×32, break 136×32, break card 360×192.

Idle memory on the Windows VM with the main window hidden and the overlay visible: 164.5 MB private across the app and WebView2 processes (425.7 MB working set), 0% idle CPU over 10 seconds. The private total exceeds the original 120 MB budget; see `docs/acceptance.md`.

## Platform settings

- Windows: `bundle.windows.webviewInstallMode` is `embedBootstrapper`, so the installer carries the small WebView2 bootstrapper. A machine that has never installed WebView2 still needs network access for the runtime itself. The NSIS installer uses `currentUser` and installs to `%LOCALAPPDATA%\Programs\Siderkit Break` without elevation; `src-tauri/nsis/installer.nsi` is a custom template derived from tauri-cli 2.12.6. Its changes are the default folder, the language selector guard for silent/passive/update runs, and nothing else, so refresh it when the Tauri CLI minor version changes. `bundle.targets` omits `msi`, so no MSI is produced.
- macOS: `bundle.macOS.minimumSystemVersion` is `10.15.7`. The frontend needs Safari 15.4 features (`<dialog>`, `structuredClone`), so a stock Catalina install with an old Safari shows an update message instead of the app.
- Linux: build on Ubuntu 22.04 to keep the glibc 2.35 baseline. AppImage does not bundle WebKitGTK; the host needs `libwebkit2gtk-4.1`. The AppImage also needs FUSE 2 or `APPIMAGE_EXTRACT_AND_RUN=1`; a build host without `libfuse2` must set that variable for `tauri build` too.

## Signing

Three separate systems are involved. They do not replace each other.

### Update signature (minisign)

Every NSIS installer is signed for the updater. The public key lives in
`src-tauri/tauri.conf.json` under `plugins.updater.pubkey`; the private key is
never committed.

Generate a key once and back it up offline in two places:

```text
pnpm tauri signer generate -w <external-path>/siderkit-break-updater.key
```

Set these repository secrets:

| Secret                               | Value                                                    |
| ------------------------------------ | -------------------------------------------------------- |
| `TAURI_SIGNING_PRIVATE_KEY`          | the private key file contents, or its path on the runner |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | the key passphrase, when one was set                     |

The key secret must carry the **full file contents, including the
`untrusted comment:` first line**. With no secret set the workflow passes an
empty value and the signing step fails with `failed to decode secret key:
... Missing comment in secret key`; that happened on every tag run through
`1.0.2`, whose Windows installers were built locally. The secret is now set
(empty passphrase; the whole key file on one line), and `1.0.3` was signed by
CI with no manual step.

Losing the private key ends the update path for existing installs; the only
recovery is a manual reinstall. Rotate only while there are no installed users,
or ship a build signed with the old key first.

### Download host (Worker)

No credential is needed for the download host. The release workflow talks to
GitHub only; `dl.siderkit.com` is a Worker that proxies GitHub Releases. Deploy
it once from `infra/metrics-worker` with `wrangler deploy`;
`infra/metrics-worker/README.md` covers the custom domain, Analytics Engine
dataset, routes, and local checks.

### Authenticode and Apple

Authenticode signing uses the certificate configured in the Windows certificate
store or a signing service. Verify with `signtool verify /pa <installer>`.

macOS, when an Apple Developer account is available:

```text
APPLE_CERTIFICATE                  # base64 .p12
APPLE_CERTIFICATE_PASSWORD
APPLE_SIGNING_IDENTITY             # Developer ID Application: ...
APPLE_ID
APPLE_PASSWORD                     # an app-specific password from the Apple account
APPLE_TEAM_ID
```

`tauri build` signs and notarizes automatically when those variables are present.
Without them the DMG is unsigned and Gatekeeper blocks it until the user allows
it manually.

## Verification checklist

Run on the target operating system before publishing:

- Install, launch, and confirm the first-run window.
- Run an interactive install and confirm the language selector appears with the OS language preselected; run `/S`, `/P`, and `/UPDATE` and confirm no selector appears.
- Start, pause, resume, skip, and reset a focus session.
- Confirm the overlay appears, stays on top, and is click-through outside the droplet.
- Confirm tray labels and the locate hint.
- Confirm a reminder card at focus, break, and countdown boundaries, and that no operating-system notification appears.
- Open settings and confirm the root screen shows seven entries with current values; enter each detail page, change one value, go back, and confirm the value persisted without a save step.
- Confirm the finish card shows the tag link collapsed, expands to "Cancel tag" in the same position, saves on Enter, and collapses on Esc without writing an empty tag.
- Confirm history shows the saved tag under the time, edits it in place, and the row updates without a reload.
- Confirm the floating-window page offers S/M/L with real droplet previews, the opacity slider changes the window live, locate flashes a frame, and reset returns it to the corner.
- Confirm Insights switches across all four ranges without layout jumps, shows the heatmap and tag bars with data, and shows the empty and error states without a stack trace.
- Import a custom sound (≤ 5 s, ≤ 2 MB), confirm it previews on selection, and confirm a rejected file keeps the previous selection and shows a readable error.
- Toggle launch at login, sign out, and sign back in.
- Resize or move the window across 100%, 150%, and 200% DPI displays.
- Sleep and resume; confirm the countdown catches up without drift.
- Quit, relaunch, and confirm history and settings persist.
- Uninstall and confirm the autostart entry and local data are removed or documented.
- Check installer size: target at most 10 MB.
- Check idle memory with the main window hidden and the overlay visible: target at most 120 MB.
- On macOS, check Spaces, full-screen apps, and Gatekeeper behavior.
- On Linux, check X11 first; record Wayland behavior separately.
- Install the previous version and point it at a test `latest.json`; confirm the banner, snooze, skip, download, cancel, and restart-to-install.
- Confirm `latest.json` returns `cache-control: public, max-age=60` and a binary under `<product>/releases/` returns a one-year immutable cache.
- With anonymous counts on, confirm one install event and one check event; turn counts off, check again, and confirm the Worker records nothing.
- Reset the anonymous ID and confirm the UUID changes and one new install event arrives.

Record the operating-system build, DPI, and result for each row in `docs/acceptance.md`.

## Testing the update flow without publishing

A local endpoint plus a config override exercises the whole flow — dialog, download, signature
verification, and the installer — without touching production:

1. Serve a copy of the live `latest.json` from `http://127.0.0.1:8787/latest.json` (any static file
   server).
2. Start the app with the repository's dev-only override, which repoints the updater at the local
   server: `pnpm tauri dev --config src-tauri/tauri.update-test.json`. There is no leading `--`;
   with one, the argument is forwarded to `cargo` and fails with a TOML parse error.
3. Run Help → About → Check now. The dialog, download progress, and restart-to-install path run
   against the real installer, which can be cancelled.

Release builds refuse `http` endpoints; dev builds only warn. Keep the override out of any shipped
configuration.

**Signature-version cross-check.** The updater compares the version inside the signature's trusted
comment with the version announced by the manifest. Raising only the manifest version while reusing
an old signature fails at download time ("The update was signed for version X but the update
endpoint announced version Y"). To test the update prompt against the real production manifest,
lower the app's own version instead: add `"version": "0.9.9"` at the top level of the override
config so the app sees the real release as an update, and the real signature verifies untouched.

## Publishing

1. Update the version in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`; update `CHANGELOG.md`.
2. Commit and tag `vX.Y.Z`; push the tag. `release.yml` builds Windows, macOS, and Linux.
3. The workflow normalizes names, writes `latest-dl.json`, `latest.json`, and `SHA256SUMS.txt`, and creates a **draft** GitHub release with every installer attached. There is no object storage to upload to.
4. Verify the draft assets, checksums, signatures, and the verification checklist.
5. Publish the GitHub release. `/siderkit-break/latest.json` starts serving the new manifest immediately, because the Worker reads `releases/latest/download/latest-dl.json`; `promote.yml` verifies the live version and installer afterwards.
6. Run an update from the previous version against `https://dl.siderkit.com/siderkit-break/latest.json` and the GitHub fallback endpoint.
7. If Actions is unavailable, run the same build and `scripts/make-latest-json.mjs` locally and create the release with `gh release create`.
8. Without the `gh` CLI, drive the draft from the REST API: obtain a token (for example through `git credential fill` for `github.com`), then `PATCH /repos/<owner>/<repo>/releases/{id}` with `{"draft": false}` publishes it, and `GET /actions/runs` plus `GET /releases` cover the status checks the CLI would do.

Do not attach debug builds or the raw `target/` directory. Do not hand-edit
`latest.json`; regenerate it from the installer and `.sig` file.

## Known limitations

- Auto-update is Windows-only. macOS and Linux users download new builds manually.
- macOS transparency uses a private API, so the app cannot ship on the Mac App Store.
- Windows 10 1809–21H2 are supported but not yet verified on physical hardware.
- Idle private memory on the Windows 10 VM is 164.5 MB, above the original 120 MB target; the budget needs revision or later optimization.
- Linux Wayland cannot position the overlay or guarantee click-through and global shortcuts. Use X11.
- GNOME needs an AppIndicator extension for the tray icon.
- The app must be running to remind the user; quitting stops reminders. Reminders are in-app cards, not entries in the operating-system notification center.
- Anonymous counts cannot measure uninstalls; reinstalling or resetting the ID counts as a new install.
- Unsigned builds trigger SmartScreen on Windows and Gatekeeper on macOS.

## Rollback

If a release is defective, mark it as a pre-release on GitHub so
`releases/latest` falls back to the previous release, or publish a higher patch
version. The previous binaries stay online because every release keeps its own
tag. Do not delete release assets and never reuse a version number.
