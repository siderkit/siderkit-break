# Release guide

> Status: release candidate. Nothing in this guide has been published yet.

## Version

The release candidate keeps the manifest version identical in:

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

All three are `1.0.0-rc.1` while the updater and the website are finished. The public `1.0.0` release moves all three together. The app reads the Tauri version at runtime for the About panel.

## Artifact matrix

| Platform                  | Command                                                          | Artifacts                      |
| ------------------------- | ---------------------------------------------------------------- | ------------------------------ |
| Windows 10 1809+ / 11 x64 | `pnpm tauri build --bundles nsis`                                | `*-setup.exe`                  |
| macOS 10.15.7+ / 11.0+    | `pnpm tauri build --target universal-apple-darwin --bundles dmg` | one universal `*.dmg`          |
| Ubuntu 22.04+ (X11)       | `pnpm tauri build --bundles deb,rpm,appimage`                    | `*.deb`, `*.rpm`, `*.AppImage` |

`bundle.targets` in `src-tauri/tauri.conf.json` lists exactly these five formats; Tauri drops the ones that do not belong to the host platform. Windows therefore builds NSIS and nothing else, including a bare `pnpm tauri build`. The MSI was retired in `1.0.0-rc.1`: a managed Windows 11 machine rejected it with Windows Installer error 1625 while the NSIS package installed and uninstalled normally.

The build workflow in `.github/workflows/build.yml` runs the same commands and uploads the bundles as workflow artifacts. It does not create a GitHub release.

## Local build record (2026-11-23)

`1.0.0-rc.1` was rebuilt after the license, installer-language, and context-menu changes:

| Artifact                                                          | Size     | SHA-256                                                            |
| ----------------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| `Siderkit Break_1.0.0-rc.1_x64-setup.exe` (NSIS, 23 UI languages) | 5.29 MiB | `bd2c8783114f748b34cea19f32c3dbaa3d1a925da46246998cfefa15b4da97da` |

No MSI was produced. The build log listed six languages whose Tauri-specific installer strings are still English (Hindi, Indonesian, Thai, Malay, Polish, Romanian); the standard NSIS pages are localized. The installer language selector and the `/S`, `/P`, `/UPDATE` skip path still need a run on the Windows VM.

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

| System  | Database (settings and history)                                           | Logs                                                        |
| ------- | ------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Windows | `%APPDATA%\com.siderkit.break\siderkit-break.sqlite3`                     | `%LOCALAPPDATA%\com.siderkit.break\logs\Siderkit Break.log` |
| macOS   | `~/Library/Application Support/com.siderkit.break/siderkit-break.sqlite3` | `~/Library/Logs/com.siderkit.break/Siderkit Break.log`      |
| Linux   | `~/.local/share/com.siderkit.break/siderkit-break.sqlite3`                | `~/.local/share/com.siderkit.break/logs/Siderkit Break.log` |

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

Signing is not configured yet. Unsigned artifacts are suitable for internal testing only.

Windows, when a certificate is available:

```text
TAURI_SIGNING_PRIVATE_KEY          # only for the updater, not for Authenticode
```

Authenticode signing uses the certificate configured in the Windows certificate store or a signing service. Verify the result with `signtool verify /pa <installer>`.

macOS, when an Apple Developer account is available:

```text
APPLE_CERTIFICATE                  # base64 .p12
APPLE_CERTIFICATE_PASSWORD
APPLE_SIGNING_IDENTITY             # Developer ID Application: ...
APPLE_ID
APPLE_PASSWORD                     # app-specific password
APPLE_TEAM_ID
```

`tauri build` signs and notarizes automatically when those variables are present. Without them the DMG is unsigned and Gatekeeper blocks it until the user allows it manually.

## Verification checklist

Run on the target operating system before publishing:

- Install, launch, and confirm the first-run window.
- Run an interactive install and confirm the language selector appears with the OS language preselected; run `/S`, `/P`, and `/UPDATE` and confirm no selector appears.
- Start, pause, resume, skip, and reset a focus session.
- Confirm the overlay appears, stays on top, and is click-through outside the droplet.
- Confirm tray labels and the locate hint.
- Confirm a reminder card at focus, break, and countdown boundaries, and that no operating-system notification appears.
- Toggle launch at login, sign out, and sign back in.
- Resize or move the window across 100%, 150%, and 200% DPI displays.
- Sleep and resume; confirm the countdown catches up without drift.
- Quit, relaunch, and confirm history and settings persist.
- Uninstall and confirm the autostart entry and local data are removed or documented.
- Check installer size: target at most 10 MB.
- Check idle memory with the main window hidden and the overlay visible: target at most 120 MB.
- On macOS, check Spaces, full-screen apps, and Gatekeeper behavior.
- On Linux, check X11 first; record Wayland behavior separately.

Record the operating-system build, DPI, and result for each row in `docs/acceptance.md`.

## Publishing (manual, not executed)

1. Run the build workflow for the release commit and download every artifact.
2. Generate checksums: `sha256sum * > SHA256SUMS.txt` (or `Get-FileHash` on Windows).
3. Create a **draft** GitHub release tagged `v1.0.0`.
4. Attach the Windows, macOS, and Linux artifacts plus `SHA256SUMS.txt`.
5. Write release notes with the known limitations below.
6. Publish only after the verification checklist passes on every P0 platform.

Do not attach debug builds or the raw `target/` directory.

## Known limitations

- macOS transparency uses a private API, so the app cannot ship on the Mac App Store.
- Windows 10 1809–21H2 are supported but not yet verified on physical hardware.
- Idle private memory on the Windows 10 VM is 164.5 MB, above the original 120 MB target; the budget needs revision or later optimization.
- Linux Wayland cannot position the overlay or guarantee click-through and global shortcuts. Use X11.
- GNOME needs an AppIndicator extension for the tray icon.
- The app must be running to remind the user; quitting stops reminders. Reminders are in-app cards, not entries in the operating-system notification center.
- There is no auto-update in 1.0.
- Unsigned builds trigger SmartScreen on Windows and Gatekeeper on macOS.

## Rollback

If a release is defective, mark the GitHub release as a pre-release or delete the draft, keep the previous artifact available, and publish a patch version. Never reuse a version number.
