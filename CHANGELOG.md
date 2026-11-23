# Changelog

All notable changes to Siderkit Break are recorded here. The project is at the 1.0 release-candidate stage; no public binaries have been published yet.

## [1.0.0-rc.1] - 2026-11-22

### Added

- Focus, short-break, and long-break cycles with pause, resume, skip, reset, and editable lengths.
- A transparent floating countdown that stays on top, labels break phases, and remains click-through until pointed at.
- In-app reminder cards at every phase boundary, with postpone, skip, close, and a bundled reminder chime.
- Local session history with a styled spreadsheet (`.xlsx`) export.
- Thirty UI languages with system-language detection and right-to-left layouts for Arabic, Persian, and Urdu.
- Light, dark, and system themes with eight color styles.
- Global shortcuts, launch at login, start minimized, and close-to-tray.
- Windows NSIS (per-user) installer with a language selector; Linux deb, rpm, and AppImage bundles; a universal macOS DMG build.
- Product documentation, acceptance criteria, technical design, ADRs, and a release guide.

### Changed

- The right-click menu is now a native app menu on every window instead of the WebView menu, with the standard edit verbs kept in text fields.
- The project is licensed under Apache-2.0 only; the previous MIT/Apache-2.0 dual license and its two license files are gone, and the attribution moved to `NOTICE`.
- Windows ships only the per-user NSIS installer; the all-users MSI was retired after a managed Windows 11 machine rejected it with Windows Installer error 1625.
- The NSIS installer ships 23 languages, preselects the OS language, and offers a language selector that never appears during silent, passive, or update runs.
- Manifests are at `1.0.0-rc.1`; the public `1.0.0` version follows the updater and the website.
- Phase boundaries now use in-app cards instead of operating-system notifications, so reminders work without a notification permission.
- The Windows NSIS installer defaults to a per-user folder and remembers a custom install location across upgrades.
- The overlay ignores input until the pointer is over it, so it does not block work underneath.

### Fixed

- The timer keeps its deadline in the Rust core when the main window is hidden.
- The overlay no longer steals focus or captures clicks outside its bounds.
- The Linux locate hint is override-redirect, so a window manager cannot push it away from a droplet at the screen edge.
- Locale changes reload every open window instead of leaving stale text in the tray or overlay.

### Security

- Local-first by default: no account, no server, no network requests, no telemetry, and no remote content.
- Reminder cards do not require an operating-system notification permission.

### Known limitations

- macOS builds are unsigned until a Developer ID is configured; Gatekeeper will warn on first launch.
- Windows installers are unsigned until a code-signing certificate is configured; SmartScreen may warn.
- Linux Wayland sessions cannot position a top-level window reliably, so the floating countdown and global shortcuts are best-effort there.
- There is no auto-update in 1.0.
- True in-taskbar text embedding is not implemented; the floating countdown is a separate window.
