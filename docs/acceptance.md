# Acceptance criteria

> Status: draft for review.
> Scope: desktop 1.0.
> A release candidate is acceptable only when every P0 criterion passes and every P1 criterion has a documented decision.

## Priority

- **P0:** release blocker.
- **P1:** required for 1.0 unless explicitly deferred with a written decision.
- **P2:** follow-up; does not block 1.0.

## Functional acceptance

### A-01 First run

**P0.** Given a fresh install with no data, when the app launches, then:

- it shows the main window with default durations (25 / 5 / 15, long break every 4);
- it explains the tray, overlay, and shortcut;
- it does not request notification permission until the first session starts;
- it creates a local database and writes a schema version;
- it does not make a network request.

### A-02 Start, pause, resume

**P0.** Given the app is idle, when the user starts focus, then the overlay and tray show a running countdown within 1 second. When the user pauses, the remaining time stops changing. When the user resumes, the countdown continues from the stored remaining time, with less than 1 second of drift.

### A-03 Focus completion

**P0.** Given a focus session reaches zero, then:

- the session is written as `Completed` exactly once;
- the app enters the configured break phase;
- a native notification is emitted if permission is granted;
- the break card is shown unless quiet mode is active;
- the break card fits its text and action buttons in every supported locale, with no clipped or overlapping lines;
- the overlay changes to the break color.

### A-04 Long break cadence

**P0.** Given `long_break_every = 4`, when the fourth focus session completes, then the app enters a long break. After the long break completes, the focus counter resets. Skipped or reset focus sessions do not count toward the long break.

### A-05 Skip, postpone, reset

**P0.** Given an active focus or break, when the user skips, postpones, or resets, then the session outcome is persisted as `Skipped` or `Reset`, the runtime state matches the chosen next phase, and no duplicate session is written.

### A-06 Overlay

**P0.** Given the overlay is enabled in Ghost mode, then:

- it is always on top of normal windows;
- it does not appear in the taskbar or Alt-Tab;
- it does not take focus;
- clicks outside the overlay pass through to the window underneath;
- the idle state is a tiny transparent droplet that does not hide content below;
- an active focus, break, or countdown replaces the droplet with a readable timer;
- the first run places the droplet in the bottom-left corner of the work area;
- hovering the overlay makes it interactive, and a drag moves it without any mode toggle or extra click;
- its position survives an app restart and a DPI change;
- it falls back to the primary monitor if the saved monitor is missing.

**P1.** Given a fullscreen app is active and `hide_in_fullscreen` is on, the overlay hides and returns when the fullscreen app exits (Windows first; other platforms best-effort).

### A-07 Tray and taskbar

**P0.** Given the app is running, then:

- a tray icon is present on Windows and macOS;
- the tray menu and tooltip show the current phase and exact remaining time;
- left-click toggles the main window;
- closing the main window keeps the app and timer running in the tray;
- a second launch focuses the existing window instead of starting a second timer.

**P1.** On Windows and macOS, taskbar or Dock progress is available as an optional setting; it is off by default.

### A-08 Notifications

**P0.** Given notification permission is granted, when a phase ends, then a native notification appears within 1 second. When "Play a sound" is on, the built-in reminder chime plays at the same time. Given permission is denied, the in-app break card still appears and the timer continues.

**P1.** Given the user opens Settings → Reminders and chooses Preview, then the built-in reminder chime plays so it can be judged before the "Play a sound" toggle is enabled. The preview uses the same chime and playback path as a real reminder and sends no notification. When the audio output is unavailable, the settings row shows an inline explanation instead.

### A-09 Sleep and resume

**P0.** Given the machine sleeps for 10 minutes during focus, when it resumes, then:

- the app does not emit a burst of notifications;
- the timer state is correct;
- a “welcome back” card is shown if the deadline passed;
- no duplicate session is written.

### A-10 Quit and restart

**P0.** Given the app quits during a session, when it restarts, then the previous session is `Interrupted` with the actual elapsed time, the runtime state is restored, and no duplicate is written.

### A-11 Single instance and autostart

**P0.** Given the app is already running, a second launch focuses the existing window and exits. Given autostart is enabled, the next login starts the app minimized to the tray without starting a focus session.

### A-12 Local data

**P0.** Given the user completes, skips, and resets focus, break, and countdown sessions, then each outcome is stored in SQLite with a UUIDv7 id, timestamps, planned and actual durations, and device id. History exposes a styled Excel (`.xlsx`) export with a summary sheet and a session sheet. Every date in the report includes the year, and every session start time includes hours, minutes, and seconds.

**P0.** Given the history dialog is open, then exporting:

- shows a preparing state on the export button before any dialog appears;
- opens the native save dialog with a date-stamped `.xlsx` file name and an Excel filter;
- does nothing and reports no error when the user cancels;
- writes the workbook to the chosen path and confirms with the file name;
- offers "Show in folder" for the saved file;
- shows an inline error and leaves the dialog usable when writing fails.

### A-13 No network

**P0.** Given a normal 1.0 run, then the app makes no outbound network requests. The desktop capability set does not include HTTP or shell access.

### A-14 Performance and size

**P0.** On the reference Windows machine:

- installer ≤ 10 MB;
- idle memory with main window hidden and overlay visible ≤ 120 MB;
- idle CPU < 0.5% over 5 minutes;
- cold start to tray < 2 seconds;
- timer display updates once per second without visible stutter.

If the memory budget is missed, the team must either reduce the overlay to a native window or document a revised budget before release.

**2026-11-21 measurement (Windows 10 22H2 VM, 1024×768, DPI 100%):** with the main window hidden and the overlay visible, the app plus eight WebView2 processes use 164.5 MB private memory (425.7 MB working set) and 0% idle CPU over 10 seconds. The 120 MB private-memory target is not met. A revised budget or a WebView-lifecycle optimization is required before release.

### A-15 Accessibility

**P0.** The main window and settings are keyboard reachable, focus is visible, icon buttons have labels, color contrast meets WCAG AA, and reduced-motion preference disables pulsing and fades. The overlay is decorative and does not trap focus.

### A-16 Internationalization

**P0.** English is the source locale and 29 translations keep the same message paths and placeholders. No user-facing string is hardcoded in a component. Arabic, Persian, and Urdu switch the document to RTL and mirror the layout. Dates and durations use the platform locale. Dates in the main summary and in history always include the year.

### A-17 Platform matrix

**P0.** The following matrix passes:

| Platform                                   | Level | Checks                                                                         |
| ------------------------------------------ | ----- | ------------------------------------------------------------------------------ |
| Windows 10 1809+ x64                       | P0    | tray, overlay, click-through, notification, autostart, sleep, DPI 100/150/200% |
| Windows 11 x64                             | P0    | same as Windows 10, plus virtual desktop behavior documented                   |
| macOS 10.15.7+ Intel / 11.0+ Apple Silicon | P1    | tray, overlay, notification, autostart, Spaces, signed build                   |
| Ubuntu 22.04+ X11                          | P1    | tray with AppIndicator, overlay, notification, autostart                       |
| Linux Wayland                              | P1    | documented degradation for positioning, click-through, and shortcuts           |
| Android / iOS                              | P2    | technical spike only; no 1.0 release                                           |

**Verification status (2026-11-21):**

- Windows 10 Pro 22H2 (19045.2965) VM: NSIS and MSI install/uninstall, shortcuts, autostart, reboot with `--minimized`, startup autostart self-heal, notification, one-minute countdown, break card, history, and overlay `Break` prefix passed. The current NSIS build was installed again and the active overlay measured 75×32 with the droplet-to-label gap matching the design. DPI 100% / 1024×768 only; transparency, always-on-top, and multi-monitor still need physical hardware.
- Windows 11 x64: release executable built locally; NSIS and MSI packaged; installation on Windows 11 hardware is still pending.
- macOS: universal DMG built in CI with a 10.15.7 deployment target; signing, notarization, and a real-machine smoke test are pending.
- Ubuntu 22.04.5 X11: deb install, launch, global shortcuts, countdown, native notification, focus-to-break, overlay prefix, and tray locate hint passed. The current payload was launch-tested from the deb and the AppImage: idle 22×22, focus 90×32, break 136×32, break card 360×192, with a 6px layout gap between droplet and label. rpm is built but not installed.
- Linux Wayland: documented as degraded; not verified.

### A-18 Code quality

**P0.** Given a pull request, when CI runs, then `pnpm check` passes, including format, lint, types, boundaries, duplication, TODO, file-size, Rust format, Clippy, and tests. There are no new lint suppressions.

### A-19 Independent countdown

**P0.** Given an independent countdown reaches zero, then:

- the session is written as `Completed` exactly once and the phase returns to idle;
- a native notification is emitted if permission is granted;
- the in-app completion card opens above other windows and shows the countdown length;
- the card offers dismiss and repeat; dismiss hides it, repeat starts the same length again;
- skipping or resetting the countdown shows neither the card nor a completion notification;
- the card disappears if another phase starts while it is open.

## Data integrity acceptance

- A session id is unique and never reused.
- `ended_at >= started_at`.
- `planned_ms > 0`; `actual_ms >= 0`.
- A completed session has an outcome other than `Interrupted`.
- Restarting the app never duplicates a session.
- The runtime state is written on every state transition, not every tick.
- A schema migration is forward-only and tested on a copy of the previous schema.

## Security and privacy acceptance

- No network permission in the Tauri capability set.
- CSP allows only local assets.
- No remote fonts, scripts, or images.
- No secrets or tokens are stored.
- Logs do not contain personal data beyond local file paths.
- The app does not request accessibility or screen-recording permissions.

## Definition of done

- Every P0 acceptance criterion passes.
- The platform matrix is recorded with version and DPI details.
- The code quality gate passes in CI.
- The README, product brief, flows, and tech design match the implementation.
- The release notes list known limitations, especially platform-specific ones.
- No Git commit is created without explicit user authorization.
