# Release guide

> Status: release candidate. Nothing in this guide has been published yet.

## Version

The 1.0.0 release keeps the manifest version identical in:

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

Change all three together. The app reads the Tauri version at runtime for the About panel.

## Artifact matrix

| Platform                  | Command                                                          | Artifacts                      |
| ------------------------- | ---------------------------------------------------------------- | ------------------------------ |
| Windows 10 1809+ / 11 x64 | `pnpm tauri build --bundles nsis,msi`                            | `*-setup.exe`, `*.msi`         |
| macOS 10.15.7+ / 11.0+    | `pnpm tauri build --target universal-apple-darwin --bundles dmg` | one universal `*.dmg`          |
| Ubuntu 22.04+ (X11)       | `pnpm tauri build --bundles deb,rpm,appimage`                    | `*.deb`, `*.rpm`, `*.AppImage` |

The build workflow in `.github/workflows/build.yml` runs the same commands and uploads the bundles as workflow artifacts. It does not create a GitHub release.

## Local build record (2026-11-21)

Artifacts produced from the 1.0.0 release binary:

| Artifact                                         | Size      | SHA-256                                                            |
| ------------------------------------------------ | --------- | ------------------------------------------------------------------ |
| `Siderkit Break_1.0.0_x64-setup.exe` (NSIS)      | 5.36 MiB  | `13855ccedd270a769375b898cfbf1af9b2818ae80ebc9f8ad42b2c933a7a3a39` |
| `Siderkit Break_1.0.0_x64_en-US.msi` (WiX)       | 7.00 MiB  | `e13d47b9a7eff4edef58f0afaff716ff8acc94a21c99e2106ae5f659116b37c1` |
| `Siderkit Break_1.0.0_amd64.deb` (Debian)        | 7.37 MiB  | `2d43364b926f1c834054dc581eee01b546921ce71e9abc219d77018b4ecbdc76` |
| `Siderkit Break_1.0.0_amd64.AppImage` (AppImage) | 83.52 MiB | `0a440ea7b787a81043b5fe4a5d7d12fe0dda7f5c6bac59e334b4e6ae51e8c1e0` |

These artifacts were rebuilt after the locate hint change: the hint is now a rounded frame around the droplet with a closer `I'm here` label and entry, glow, and echo motion. On X11 the hint window is override-redirect, so the window manager no longer pushes it away from a droplet that touches the screen edge. The AppImage was built with `APPIMAGE_EXTRACT_AND_RUN=1` because this build VM has no `libfuse2`; the AppImage itself still needs FUSE (or the same variable) on the target host. The RPM was not rebuilt this round because the build VM has no `rpmbuild` and no non-interactive sudo.

The Windows installers are below the 10 MB budget. The MSI build used the WiX 3.14 tool cache; the tools are not committed.

Verified on a Windows 10 Pro 22H2 (19045.2965) VM: NSIS install, launch, shortcuts, uninstall, autostart, reboot with `--minimized`, notification, countdown, break card, history, and the startup autostart self-heal. WebView2 157.0.4341.60 was installed by the NSIS bootstrapper. The MSI was verified with the wizard, per-user install, UAC, and maintenance-mode removal. Both installers were removed cleanly. The NSIS build keeps the 75×32 active countdown overlay and the droplet-to-label gap matching the design. This round rebuilt the Windows bundles from the same 1.0.0 source but did not repeat the installer pass.

Verified on an Ubuntu 22.04.5 X11 VM: deb install, launch, global shortcuts, one-minute countdown, native notification, focus-to-break transition, overlay `Break` prefix, and the tray locate hint. The locate hint was launch-tested from the release payload with the droplet in the screen center and on the bottom-left edge; the frame and label stayed on the droplet in both cases, and the X11 hint window is override-redirect so edge positions are not constrained. The Linux startup panic caused by setting click-through before the window was realized is fixed. The current Linux payload was launch-tested from the AppImage and from the extracted deb payload; the deb install itself was verified in an earlier round: idle 22×22, focus 90×32, break 136×32, break card 360×192.

Idle memory on the Windows VM with the main window hidden and the overlay visible: 164.5 MB private across the app and WebView2 processes (425.7 MB working set), 0% idle CPU over 10 seconds. The private total exceeds the original 120 MB budget; see `docs/acceptance.md`.

## Platform settings

- Windows: `bundle.windows.webviewInstallMode` is `embedBootstrapper`, so the installer carries the small WebView2 bootstrapper. A machine that has never installed WebView2 still needs network access for the runtime itself. The NSIS installer defaults to a per-user install.
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
- Start, pause, resume, skip, and reset a focus session.
- Confirm the overlay appears, stays on top, and is click-through outside the droplet.
- Confirm tray labels and the locate hint.
- Confirm a native notification after a phase ends.
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
- There is no auto-update in 1.0.
- Unsigned builds trigger SmartScreen on Windows and Gatekeeper on macOS.

## Rollback

If a release is defective, mark the GitHub release as a pre-release or delete the draft, keep the previous artifact available, and publish a patch version. Never reuse a version number.
