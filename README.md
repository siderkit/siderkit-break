# Siderkit Break

A tiny, calm break reminder for desktop. It keeps a focus timer out of your way, shows a small always-on-top countdown, and reminds you to stand up and look away.

> Status: 1.0.0 release candidate. Windows NSIS/MSI and Linux deb/rpm/AppImage are built locally and verified on Windows 10 22H2 and Ubuntu 22.04.5 X11 virtual machines. macOS DMG is built by CI; signing and a real-machine check are pending. No public release has been published yet.

An experimental Siderkit project. The 1.0 release is intentionally small: a local-first focus timer with a tray presence and a transparent overlay. It does not require an account, a server, or a network connection.

## In 1.0 scope

- Focus, short break, and long break cycles.
- Start, pause, resume, skip, and reset.
- System tray controls and close-to-tray.
- A tiny transparent, always-on-top countdown that labels break phases and stays click-through until you point at it.
- Native notifications, a built-in reminder chime, and an optional break card.
- Local history of every focus, break, and countdown session, with a styled Excel export.
- 30 UI languages with system-language detection and true RTL.
- Light, dark, and system themes plus eight color styles.
- Global shortcuts and launch at login.

## Not in 1.0

- Todo lists.
- Accounts, sync, teams, or cloud services.
- Mobile releases or home-screen widgets.
- Plugins, AI features, or telemetry.
- True in-taskbar text embedding.

## Platform support

| Platform                             | Minimum                                 | Artifacts           | Status                                                 |
| ------------------------------------ | --------------------------------------- | ------------------- | ------------------------------------------------------ |
| Windows 10 / 11 x64                  | Windows 10 1809 (build 17763)           | NSIS installer, MSI | Windows 10 22H2 VM verified; Windows 11 built locally  |
| macOS Intel                          | macOS 10.15.7 with Safari 15.4 or newer | DMG (universal)     | CI build; signing pending                              |
| macOS Apple Silicon                  | macOS 11.0                              | DMG (universal)     | CI build; signing pending                              |
| Ubuntu 22.04+ and compatible distros | webkit2gtk 4.1, X11                     | deb, rpm, AppImage  | Ubuntu 22.04.5 X11 VM verified; Wayland is best-effort |

Windows 10 1809–21H2 are supported targets but have not yet been verified on physical hardware. Windows 10 reached end of support in October 2025; the app continues to run on it, but Microsoft no longer ships operating-system updates.

Linux notes: the overlay needs a compositor that lets the app position a top-level window. Wayland does not provide that capability, so positioning, click-through, and global shortcuts may not work. Run the X11 session for the full experience. GNOME also needs an AppIndicator extension for the tray icon.

## Install

No public binaries have been published yet. Build from source with the commands below.

## Build

Prerequisites: Node.js 22 or newer, pnpm 12, a Rust toolchain, and the platform build tools required by Tauri.

```bash
pnpm install
pnpm check
```

Windows (MSVC build tools and the WebView2 runtime):

```bash
pnpm tauri build --bundles nsis,msi
# src-tauri/target/release/bundle/nsis/*-setup.exe
# src-tauri/target/release/bundle/msi/*.msi
```

macOS (Xcode command line tools):

```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
pnpm tauri build --target universal-apple-darwin --bundles dmg
# src-tauri/target/universal-apple-darwin/release/bundle/dmg/*.dmg
```

Linux (Ubuntu 22.04 or newer):

```bash
sudo apt install libwebkit2gtk-4.1-dev libayatana-appindicator3-dev \
  librsvg2-dev libgtk-3-dev libxdo-dev libssl-dev patchelf rpm build-essential libasound2-dev
pnpm tauri build --bundles deb,rpm,appimage
```

CI builds every platform on demand without publishing a release. See [docs/release.md](docs/release.md) for signing, verification, and the release checklist.

## Known limitations

- macOS transparency uses a private API, so the app is distributed directly and cannot ship on the Mac App Store.
- Builds are unsigned until a Windows code-signing certificate and an Apple Developer ID are configured. Unsigned Windows installers trigger SmartScreen; unsigned macOS builds trigger Gatekeeper.
- There is no auto-update in 1.0. New versions are installed manually.
- The Linux Wayland session is degraded as described above.

## Technical direction

- Desktop shell: Tauri 2.
- Timer core: Rust, deadline-based, independent of the UI.
- UI: Svelte 5 with Vite multi-page entries.
- Storage: SQLite.
- i18n: Paraglide, English source plus 29 translations, including RTL locales.

The Rust core owns time. The UI only renders state and sends commands. This keeps the timer accurate when the main window is hidden or the system is under load.

## Documentation

- [Product brief](docs/product-brief.md)
- [Core flows](docs/core-flows.md)
- [Acceptance criteria](docs/acceptance.md)
- [Technical design](docs/tech-design.md)
- [Release guide](docs/release.md)
- [Code quality](docs/code-quality.md)
- [ADR-0001: stack](docs/adr/0001-stack.md)
- [ADR-0002: taskbar and overlay](docs/adr/0002-taskbar-overlay.md)
- [ADR-0003: bundled reminder sound](docs/adr/0003-reminder-sound.md)

## Development

```bash
pnpm install
pnpm tauri dev
pnpm check
```

The code quality gate is part of the definition of done. See [docs/code-quality.md](docs/code-quality.md).

## License

MIT OR Apache-2.0. See [LICENSE](LICENSE), [LICENSE-MIT](LICENSE-MIT), and [LICENSE-APACHE](LICENSE-APACHE).
