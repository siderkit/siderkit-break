# Technical design

> Status: draft for review.
> Scope: desktop 1.0, with extension points for mobile.

## 1. Goals

- Keep the timer accurate when the main window is hidden, minimized, or the machine is under load.
- Keep the UI thin: it renders state, it does not own time.
- Keep the binary and installer small.
- Degrade explicitly on platforms that cannot support a behavior.
- Leave clean seams for a later todo module, local sync, and mobile widgets.

## 2. Architecture

```text
┌────────────────────────────────────────────────────┐
│ Svelte UI                                          │
│  main window · overlay · break card · settings      │
└───────────────┬────────────────────────────────────┘
                │ typed IPC (commands + events)
┌───────────────▼────────────────────────────────────┐
│ Tauri core (Rust)                                  │
│  TimerEngine       deadline, state machine         │
│  WindowManager     main / overlay / break          │
│  Tray              icon, menu, tooltip             │
│  Shortcuts         global hotkeys                  │
│  Reminder          in-app cards + optional chime   │
│  Store             SQLite + migrations             │
│  Platform          Windows / macOS / Linux         │
└────────────────────────────────────────────────────┘
```

Rules:

- `src-tauri/src/timer` is a pure Rust module. It does not import `tauri`, SQLite, or platform APIs.
- The UI never runs a `setInterval` as the source of truth. It may interpolate for smooth rendering between core events.
- All host access from the UI goes through `src/lib/ipc`.
- The desktop-only modules are compiled behind `#[cfg(desktop)]`; mobile builds reuse the timer core and UI, not the tray or overlay.

## 3. Timer engine

### 3.1 State

```rust
enum Phase { Idle, Focus, ShortBreak, LongBreak }
enum PauseState { Running, Paused { remaining_ms: u64 } }

struct TimerState {
    phase: Phase,
    pause: PauseState,
    ends_at_ms: Option<i64>,
    cycle_index: u32,
    completed_focus_count: u32,
    planned_ms: u64,
    started_at_ms: Option<i64>,
    interruptions: u32,
}
```

### 3.2 Events

| Event                  | Effect                                         |
| ---------------------- | ---------------------------------------------- |
| `Start`                | Start a focus session if idle                  |
| `Pause`                | Store remaining time, clear deadline           |
| `Resume`               | Recompute deadline from remaining time         |
| `Skip`                 | End current phase with `Skipped`               |
| `Reset`                | End current phase with `Reset`, return to idle |
| `PostponeBreak`        | Schedule a break five minutes from now         |
| `Tick(now)`            | Complete the phase if the deadline passed      |
| `ResumeFromSleep(now)` | Reconcile without replaying missed cycles      |

### 3.3 Time

- Store `ends_at` as Unix milliseconds for persistence.
- Use a monotonic clock for tick scheduling and the wall clock for the deadline.
- Compute `remaining = max(0, ends_at - now)`; never decrement a counter.
- On resume from sleep, if `now > ends_at`, do not emit every missed transition. Emit one `MissedDeadline` event and show the welcome-back state.
- If the clock moves backward, clamp the remaining time to the configured phase duration.
- Tick interval: 200 ms in the core; UI updates at 1 Hz. The tray tooltip and menu update at 1 Hz while a phase runs, and immediately on state changes.

### 3.4 Persistence points

Write to SQLite on:

- phase start;
- pause;
- resume;
- skip;
- reset;
- completion;
- postpone.

Do not write on every tick.

## 4. Windows

Window configs live in `src-tauri/tauri.conf.json` with `create: false`. Tauri would otherwise build them before the setup hook, and the webview's first IPC call could race `app.manage(state)`. The setup hook manages the engine state first, then builds every window from its config. Startup order is therefore: database and engine, state, windows, tray, shortcuts, ticker.

### 4.1 Main window

- About 360×520 logical pixels.
- Native decorations for 1.0.
- Hidden on close; the app stays in the tray.
- Recreated or shown on tray click. The implementation may keep it hidden for speed; measure memory in the spike.

### 4.2 Overlay

Configuration:

```json
{
  "label": "overlay",
  "transparent": true,
  "decorations": false,
  "alwaysOnTop": true,
  "skipTaskbar": true,
  "resizable": false,
  "focus": false,
  "shadow": false,
  "visible": false
}
```

Runtime:

- Two shapes: a 22×22 idle droplet and an active text window whose width hugs the measured label (48–240 logical px) at 32 px height.
- The droplet is pinned to a 2 px inset; the label starts after an 18 px droplet plus a 6 px gap, so the gap does not grow with the window.
- `set_ignore_cursor_events(true)` outside the overlay bounds.
- An 80 ms pointer poll flips click-through off while the cursor is over the overlay, so it can be dragged directly.
- `set_focusable(false)` outside the hover state where supported.
- Position is stored as a monitor identifier plus a relative offset inside the work area.
- Clamp to the work area after DPI or monitor changes.

Platform notes:

- Windows: add `WS_EX_NOACTIVATE` and `WS_EX_TOOLWINDOW` if Tauri's defaults do not prevent activation and Alt-Tab entry. `set_visible_on_all_workspaces` is unsupported on Windows.
- macOS: transparent windows require `macOSPrivateApi`; this prevents Mac App Store distribution. Use an accessory activation policy only when the main window is hidden, or a non-activating panel.
- Linux: X11 supports positioning and click-through in most window managers; Wayland may refuse both. Degrade to an interactive, compositor-placed window. Set `set_ignore_cursor_events` only after the window is shown: a hidden GTK window has no `GdkWindow`, and tao 0.37 unwraps it. GTK also forces a non-resizable window back to the webview's natural size, so the fitted windows are built GTK-resizable and pinned with min/max size hints; the hints remove user resize grips while keeping programmatic fits working.

### 4.3 Break and reminder card

- About 360 wide, always on top, centered near the top of the primary monitor.
- The window height follows the measured card so every locale and wrapped action row fits without clipping.
- One window hosts four cards: a running break, focus complete, break complete, and countdown complete.
- Focusable because it has buttons. It takes keyboard focus when the timer is waiting for the user; a break-complete card shown while focus already auto-started does not steal focus and closes itself after 8 seconds.
- With reminders off, the window stays hidden at every boundary.
- Full-screen “deep rest” is a separate, opt-in window; it must always have an emergency exit.

### 4.4 Reminder sound

- The reminder uses a bundled original 1.25-second two-note bell chime (`src-tauri/assets/notification.wav`, generated by `scripts/generate-sound.mjs`) instead of an operating system sound. Every platform sounds the same and the settings preview matches a real reminder exactly.
- `rodio`/`cpal` plays the chime from the Rust core. The app posts no operating-system notification, so the chime is the only reminder sound.
- The `notifications.sound` setting controls the chime. System volume and mute still apply; Do Not Disturb does not silence it, because a break reminder is alarm-like and the app has its own sound toggle.
- The settings preview calls the same playback path and reports an inline error when no audio output is available.
- Linux builds need the ALSA development headers (`libasound2-dev`).

### 4.5 Reminder pipeline

- The core selects a `TimerNotice` (`FocusDone`, `BreakDone`, or `CountdownDone`) when a completed session leaves the timer waiting. When the next phase auto-starts, its running card is the reminder and no extra card appears.
- `AppState` stores the open notice. The `timer:notice` event updates the card window, and `get_notice` covers a window that loads after the boundary.
- `notifications.enabled` gates every card and the chime; `notifications.sound` gates only the chime. Turning reminders off clears an open card immediately.
- A missed deadline keeps the existing main-window WelcomeDialog instead of opening a second surface.

## 5. Tray and shortcuts

Tray menu:

```text
Focus · 24:59
Pause / Resume
Skip
Postpone 5 minutes
Show countdown
Settings
Quit
```

- Tray icon: phase color and a progress ring. Do not render `24:59` in a 16 px icon; use the tooltip and overlay.
- macOS: use the tray title for a crisp `24:59` when enabled.
- Windows/Linux: use the icon and tooltip; taskbar progress is optional.
- Global shortcuts: `Ctrl+Alt+P` start/pause, `Ctrl+Alt+S` skip, `Ctrl+Alt+O` toggle overlay. On macOS, `Cmd+Option` equivalents. Shortcut conflicts are reported in settings.

### 5.1 Context menu

Every window replaces the WebView context menu with a native menu built by `src-tauri/src/context_menu.rs`. The WebView menu exposes reload, print, save as, and inspect, which do not belong in a desktop app.

```text
Focus · 24:59     (disabled status row)
──────────────
Start focus / Pause / Resume
End current phase          (hidden while idle)
Hide this reminder         (break card only)
──────────────
Open main window           (hidden on the main window)
Settings
Help
──────────────
Quit
```

When the pointer is over an `input`, `textarea`, or `contenteditable` element, the renderer marks the request as editable and the menu shows Undo, Redo, Cut, Copy, Paste, and Select all instead. Those rows are native predefined items, so the operating system runs them against the focused field. GTK needs the optional `libxdo` dependency for predefined edit rows, and the AppImage does not carry it, so on Linux an editable field keeps the WebView's own edit menu. Development builds keep the WebView menu for Inspect and Reload; Shift+right-click still opens the native menu.

Menu IDs use the `ctx-` prefix. The global `on_menu_event` handler routes that prefix to the context-menu module and everything else to the overlay menu handler, so the tray rows keep their existing path.

## 6. Persistence

SQLite, WAL mode, migrations forward-only.

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  rev INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  planned_ms INTEGER NOT NULL,
  actual_ms INTEGER,
  outcome TEXT NOT NULL,
  interruptions INTEGER NOT NULL DEFAULT 0,
  device_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  rev INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE runtime_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  phase TEXT NOT NULL,
  ends_at INTEGER,
  paused_remaining_ms INTEGER,
  cycle_index INTEGER NOT NULL,
  completed_focus_count INTEGER NOT NULL,
  started_at INTEGER,
  planned_ms INTEGER NOT NULL,
  interruptions INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

Indexes:

- `sessions(started_at)`;
- `sessions(outcome, started_at)`;
- `sessions(updated_at)` for future sync.

Today's summary counts sessions whose start is at or after local midnight. That boundary is computed as `strftime('%s', 'now', 'localtime', 'start of day', 'utc')`; the trailing `utc` step is required, otherwise the day starts at the UTC offset instead of 00:00 local.

Future sync: sessions are append-only; settings use last-write-wins. No sync tables in 1.0.

## 7. IPC

Commands:

```text
get_state() -> TimerSnapshot
start_focus()
pause()
resume()
skip()
reset()
postpone_break(minutes)
update_settings(patch)
get_today_summary()
export_data()
get_log_path()
```

Events:

```text
timer:state        full snapshot on every transition
timer:tick         remaining_ms, phase, paused
timer:phase        phase change with outcome
timer:error        recoverable error
```

Payloads are typed with `specta` or generated manually into `src/lib/ipc/types.ts`. The UI does not construct raw event names; it uses a typed wrapper.

## 8. Settings

```text
timer.focusMinutes
timer.shortBreakMinutes
timer.longBreakMinutes
timer.longBreakEvery
timer.autoStartBreaks
timer.autoStartFocus
overlay.enabled
overlay.mode            ghost | interactive
overlay.size            pill | compact
overlay.opacity         55-90
overlay.monitor
overlay.offsetX
overlay.offsetY
overlay.hideInFullscreen
notifications.enabled
notifications.sound
general.launchAtLogin
general.startMinimized
general.theme           system | light | dark
general.locale          en | zh-CN
update.autoCheck        bool
update.metrics          bool
update.skippedVersion   app-managed
update.snoozeUntilMs    app-managed
shortcuts.startPause
shortcuts.skip
shortcuts.overlay
```

Validate on load; fall back to defaults and log the invalid key. Never crash on a bad setting. `notifications.enabled` gates every reminder card and the chime; `notifications.sound` gates only the chime.

## 9. Security

- Tauri capabilities: core window/event, tray, global shortcut, autostart, log. No filesystem, shell, HTTP, or arbitrary URL opening, and no notification permission.
- CSP: local assets only; no remote fonts or scripts.
- No secret storage.
- IPC validates all inputs; commands reject invalid phase transitions.
- The overlay window cannot execute privileged commands beyond the timer surface.

### 9.1 Updater

- `tauri-plugin-updater` runs behind Rust. The WebView has no `updater:default` permission and only reads a status snapshot.
- `src-tauri/src/updates.rs` owns the state machine, the 30-second startup delay, the 6-hour scheduler, download cancellation, disk cache, and the tray label.
- Endpoints are ordered: `https://dl.siderkit.com/latest.json`, then the GitHub release mirror. Each endpoint returns a manifest whose binary URL points at the same host.
- The manifest carries a minisign signature over the NSIS installer. The plugin verifies the signature before returning downloaded bytes and again before install.
- On Windows, `Update::install` launches the installer with `/P /UPDATE /R` and exits the app. The NSIS template skips the language selector, reinstall page, and finish-page interaction for `/S`, `/P`, and `/UPDATE`.
- The first failed check sets `lastError` but no modal; the next scheduled check retries.

### 9.2 Anonymous counts

- `src-tauri/src/metrics.rs` creates a random UUID v4 once and stores it in `metrics.json` beside the database.
- The first enabled start sends `GET https://dl.siderkit.com/i` with `X-Siderkit-Install`; a success flag prevents repeats.
- Every update check sends the same header. Turning the setting off omits the header and the beacon; resetting issues a new UUID.
- The Worker accepts only valid UUIDs, writes `event / UUID / version / target / arch / bundle` to Analytics Engine, and never writes the client IP.
- No timer activity, history, window title, or usage event leaves the device. See `PRIVACY.md`.

## 10. Platform behavior

| Capability           | Windows              | macOS            | Linux                           |
| -------------------- | -------------------- | ---------------- | ------------------------------- |
| Tray                 | Yes                  | Yes              | AppIndicator; GNOME extension   |
| Transparent window   | Yes                  | Yes, private API | Compositor-dependent            |
| Click-through        | Yes                  | Yes              | X11 usually; Wayland may refuse |
| Always on top        | Yes                  | Yes              | Window-manager dependent        |
| All workspaces       | Unsupported by Tauri | Yes              | Mostly                          |
| Tray text title      | No                   | Yes              | No                              |
| Auto-update          | Signed NSIS          | Manual download  | Manual download                 |
| Taskbar progress     | Yes                  | Dock progress    | Unity only                      |
| Fullscreen detection | Yes                  | Best-effort      | Best-effort                     |

## 11. Mobile extension

- Same Tauri project can add Android and iOS targets after 1.0.
- Shared: Svelte UI, Rust state machine, session schema.
- Different: no tray or desktop overlay; mobile reminders use local notifications plus a foreground service or exact alarms where allowed. The desktop build does not use system notifications.
- Widgets are native:
  - iOS: WidgetKit, App Group, `Text(timerInterval:)`, optional Live Activity.
  - Android: Glance/RemoteViews with `Chronometer`, plus notification channels.
- Do not claim 100% shared code. The widget layer is platform-specific.
- Community widget plugins are not a 1.0 dependency; write a thin native module when the mobile spike starts.

## 12. Testing

- Rust unit tests for the timer state machine.
- Property tests for invariants: remaining never negative, one transition per deadline, no duplicate session.
- SQLite migration tests.
- Vitest for formatting and view models.
- Component tests for the main window and settings.
- Manual matrix: Windows 10/11 at 100/150/200% DPI, dual monitor, sleep/resume, lock/unlock, fullscreen video, taskbar auto-hide, virtual desktops.
- macOS Spaces and menu bar; Linux X11 and Wayland smoke tests.

## 13. Build and release

- Tauri bundles: NSIS on Windows, a universal DMG on macOS, and deb/rpm/AppImage on Linux. `bundle.targets` lists these five formats, so a bare `pnpm tauri build` never produces an MSI.
- `pnpm tauri build --bundles …` builds locally. `.github/workflows/build.yml` builds all three platforms on demand and uploads artifacts without creating a release.
- Windows uses the embedded WebView2 bootstrapper and a per-user NSIS install to `%LOCALAPPDATA%\Programs\Siderkit Break` without elevation; the custom template in `src-tauri/nsis/installer.nsi` sets that folder, adds the installer language selector, and skips the selector during silent, passive, and `/UPDATE` runs. The MSI was retired in 1.0.0-rc.1 because a managed Windows 11 machine refused it with Windows Installer 1625 while the NSIS package installed normally.
- macOS sets a 10.15.7 minimum system version. Transparency requires the private API, so distribution is direct only.
- Linux artifacts are built on Ubuntu 22.04 for a glibc 2.35 baseline.
- Windows auto-updates use minisign-signed NSIS installers and a static `latest.json`. The public key lives in `tauri.conf.json`; the private key is a CI secret. The release workflow builds a draft GitHub release and uploads versioned binaries to R2; publishing the release promotes the R2 manifest. macOS and Linux remain manual downloads.
- Windows Authenticode and Apple Developer signing are not configured yet. Unsigned Windows installers trigger SmartScreen and unsigned macOS builds trigger Gatekeeper. Signing is required before broad distribution.

## 14. Risks

| Risk                                      | Mitigation                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| Overlay click-through differs by platform | Spike first; document degradation; keep an interactive fallback                      |
| macOS transparency requires private API   | Direct distribution only; document Mac App Store limitation                          |
| Wayland rejects positioning               | Do not fight the compositor; offer a tray-first mode                                 |
| Two webviews increase memory              | Measure in the spike; consider a native overlay or destroying the hidden main window |
| Timer drift after sleep                   | Deadline-based core; resume reconciliation; tests                                    |
| Tauri system webview differences          | Simple CSS; test WebKitGTK; no exotic features                                       |
| Rust toolchain missing on the dev machine | Install Rust and platform build tools before implementation; record in CONTRIBUTING  |

## 15. Open questions

1. Native overlay versus second webview: decide after measuring memory in the spike.
2. Whether to destroy the main webview when closed to tray: measure open latency and idle memory.
3. Windows virtual desktop behavior: document the limitation; do not use undocumented COM APIs in 1.0.
4. Linux support tier: best-effort or first-class? The current plan is best-effort.
