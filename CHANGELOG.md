# Changelog

All notable changes to Siderkit Break are recorded here. The project is at the 1.0 release-candidate stage; no public binaries have been published yet.

## [1.0.0-rc.1] - 2026-11-23

### Added

- Focus, short-break, and long-break cycles with pause, resume, skip, reset, and editable lengths.
- A transparent floating countdown that stays on top, labels break phases, and remains click-through until pointed at.
- In-app reminder cards at every phase boundary, with postpone, skip, close, and a bundled reminder chime.
- Local session history with a styled spreadsheet (`.xlsx`) export.
- Thirty UI languages with system-language detection and right-to-left layouts for Arabic, Persian, and Urdu.
- Light, dark, and system themes with eight color styles.
- Global shortcuts, launch at login, start minimized, and close-to-tray.
- Windows NSIS (per-user) installer with a language selector; Linux deb, rpm, and AppImage bundles; a universal macOS DMG build.
- Signed Windows auto-updates: a 6-hour background check, a non-modal update banner, manual download with progress and cancel, restart-to-install, skip-this-version, and a 24-hour snooze. Settings and About share one version/status block, and the Help icon shows a badge while an update is ready to act on. macOS and Linux remain manual downloads.
- Optional anonymous install and update counts: a random local ID, one install beacon, and a header on update checks. The setting can be turned off, and the ID can be reset.
- A Cloudflare Worker download host (`dl.siderkit.com`) that proxies GitHub Releases, with branded and GitHub-fallback update manifests.
- Product documentation, acceptance criteria, technical design, ADRs, a privacy notice, and a release guide.

### Changed

- The right-click menu is now a native app menu on every window instead of the WebView menu, with the standard edit verbs kept in text fields.
- The project is licensed under Apache-2.0 only; the previous MIT/Apache-2.0 dual license and its two license files are gone, and the attribution moved to `NOTICE`.
- Windows ships only the per-user NSIS installer; the all-users MSI was retired after a managed Windows 11 machine rejected it with Windows Installer error 1625.
- The NSIS installer ships 23 languages, preselects the OS language, and offers a language selector that never appears during silent, passive, or update runs.
- Manifests are at `1.0.0-rc.1`; the public `1.0.0` version follows the updater and the website.
- The updater plugin is driven from Rust; the WebView has no updater permission and never receives an installer byte.
- Phase boundaries now use in-app cards instead of operating-system notifications, so reminders work without a notification permission.
- The Windows NSIS installer defaults to a per-user folder and remembers a custom install location across upgrades.
- The overlay ignores input until the pointer is over it, so it does not block work underneath.

### Fixed

- The timer keeps its deadline in the Rust core when the main window is hidden.
- The overlay no longer steals focus or captures clicks outside its bounds.
- The Linux locate hint is override-redirect, so a window manager cannot push it away from a droplet at the screen edge.
- Locale changes reload every open window instead of leaving stale text in the tray or overlay.

### Security

- Local-first by default: no account, no sync, and no server for session data. The only outbound requests are signed update checks and the optional anonymous install beacon.
- Reminder cards do not require an operating-system notification permission.

### Known limitations

- macOS builds are unsigned until a Developer ID is configured; Gatekeeper will warn on first launch.
- Windows installers are unsigned until a code-signing certificate is configured; SmartScreen may warn.
- Linux Wayland sessions cannot position a top-level window reliably, so the floating countdown and global shortcuts are best-effort there.
- Auto-update is Windows-only. macOS and Linux users download new builds manually.
- Update checks count anonymous installs by default; the setting can be turned off or reset.
- True in-taskbar text embedding is not implemented; the floating countdown is a separate window.
