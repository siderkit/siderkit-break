# Changelog

All notable changes to Siderkit Break are recorded here. The project is at the 1.0 release-candidate stage; no public binaries have been published yet.

## [Unreleased]

### Added

- **Settings rebuilt as two levels.** A root screen with seven entries and a current-value summary, plus General, Rhythm & timer, Appearance, Floating window, Reminders & sound, Data & privacy, and About. Diagnostics is a sub-page of Data & privacy. Every change saves immediately; there is no save or cancel.
- **Insights.** Today, this week, this month, and this year, with focus time, completed rounds, streak days, a 53-week heatmap, and a per-tag breakdown. Loading, empty, and error states are separate. The home summary links straight into the week view.
- **Session tags.** Each finished focus round can carry a tag of up to 40 characters, with the last three tags offered as chips. Tags appear under the time in history, can be edited in place, and are written to the Excel export as a `Tag` column. The finish card keeps the tag link collapsed until it is used.
- **Sound options.** Three built-in timbres (Chime, Soft, Bell) with an independent preview button, a volume slider, and an optional focus-only tick. Custom audio can be imported (≤ 5 s, ≤ 2 MB) and is copied into app data.
- **Twelve color styles.** Moss, Ink, Dusk, and Clay join the existing eight. Existing `Plum` and `Aurora` values still load.
- **Compact mode and floating-window control.** A 320×200 compact view with a one-click collapse and expand, three floating-window sizes (S 96×32, M 136×40, L 180×52) with real droplet previews, a 40–100% opacity slider, a locate hint, and reset position.
- **Diagnostics.** Version, OS, architecture, WebView, language, theme, palette, window mode, tray status, and the last 50 warnings, with copy, open log folder, clear log, and reset anonymous ID.

### Changed

- Reminder copy now names a concrete act of care: step away from the screen, look into the distance, sip water, or roll your shoulders and neck. The break-over card welcomes people back gently instead of asking whether they are ready.
- The main window is now 360×560 by default and can shrink to 320×400. Below 520 px the header, timer ring, and summary compress in stages, so the main view keeps every control without a scrollbar.
- Excel exports use minute precision: the filename ends with a short local date-time stamp, and the session start column no longer shows seconds.
- Language and other list options now highlight as square, full-width rows. Language names sit vertically centered instead of clinging to the top of the hover band.
- The home timer ring is slightly smaller, and the phase label is a soft colored pill again instead of a dot plus text. Reminder cards use a larger, unframed icon aligned with the title.
- Excel summary metrics and numeric table columns now align to the right; labels, dates, and types stay left-aligned.
- The floating countdown is called "floating window" (悬浮窗) in the app, tray menu, and settings, replacing the earlier "floating ball" wording.
- Insight durations use a compact `6h 20m` / `45m` format so the three stats never truncate at 360 px.
- Language moves from Appearance to General and opens in its own searchable sheet.
- The settings file only gains fields; a 1.0.0-rc.1 client reading 1.0.0 settings ignores unknown keys and keeps working.

### Fixed

- The main window's right-click menu now offers "Locate floating window" while the floating window is enabled, matching the tray menu, so a window that drifted off-screen can be found from the window in hand.
- The droplet mark and the floating-window droplet now include their full rounded base; the 32×35 view box no longer clips the last few units of the logo.
- About no longer repeats the version twice.
- The `Tag` column stays empty instead of writing a placeholder when a session has no tag.

### Database

- Schema v3 adds one nullable `tag` column and a partial index on `sessions`. Opening a v1 or v2 database takes a backup first, then migrates inside a single transaction. A database missing optional columns is repaired on open.

### Notes

- Dynamic tray icons, custom theme files (`themes/*.json`), per-display size and opacity memory, and memory/startup measurements are deferred to a later version. This entry records what 1.0.0 does not include; none of it is ruled out permanently.

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
- A Cloudflare Worker download host (`dl.siderkit.com`) that proxies GitHub Releases under a per-product path, with branded and GitHub-fallback update manifests.
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
