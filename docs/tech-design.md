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
│  Notifier          native notification + sound     │
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

### 4.3 Break card

- About 360×120, always on top, centered near the top of the primary monitor.
- Focusable because it has buttons.
- Auto-hides after 30 seconds of inactivity; the overlay remains.
- Full-screen “deep rest” is a separate, opt-in window; it must always have an emergency exit.

### 4.4 Reminder sound

- The reminder uses a bundled original 1.25-second two-note bell chime (`src-tauri/assets/notification.wav`, generated by `scripts/generate-sound.mjs`) instead of an operating system sound. Every platform sounds the same and the settings preview matches a real reminder exactly.
- `rodio`/`cpal` plays the chime from the Rust core. System toasts are silent, so a platform cannot add a second, different sound.
- The `notifications.sound` setting controls the chime. System volume and mute still apply; Do Not Disturb does not silence it, because a break reminder is alarm-like and the app has its own sound toggle.
- The settings preview calls the same playback path and reports an inline error when no audio output is available.
- Linux builds need the ALSA development headers (`libasound2-dev`).

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
breakCard.enabled
breakCard.fullscreen
general.launchAtLogin
general.startMinimized
general.theme           system | light | dark
general.locale          en | zh-CN
shortcuts.startPause
shortcuts.skip
shortcuts.overlay
```

Validate on load; fall back to defaults and log the invalid key. Never crash on a bad setting.

## 9. Security

- Tauri capabilities: core window/event, tray, notification, global shortcut, autostart, log. No filesystem, shell, HTTP, or arbitrary URL opening.
- CSP: local assets only; no remote fonts or scripts.
- No telemetry.
- No secret storage.
- IPC validates all inputs; commands reject invalid phase transitions.
- The overlay window cannot execute privileged commands beyond the timer surface.

## 10. Platform behavior

| Capability           | Windows              | macOS            | Linux                           |
| -------------------- | -------------------- | ---------------- | ------------------------------- |
| Tray                 | Yes                  | Yes              | AppIndicator; GNOME extension   |
| Transparent window   | Yes                  | Yes, private API | Compositor-dependent            |
| Click-through        | Yes                  | Yes              | X11 usually; Wayland may refuse |
| Always on top        | Yes                  | Yes              | Window-manager dependent        |
| All workspaces       | Unsupported by Tauri | Yes              | Mostly                          |
| Tray text title      | No                   | Yes              | No                              |
| Taskbar progress     | Yes                  | Dock progress    | Unity only                      |
| Fullscreen detection | Yes                  | Best-effort      | Best-effort                     |

## 11. Mobile extension

- Same Tauri project can add Android and iOS targets after 1.0.
- Shared: Svelte UI, Rust state machine, session schema.
- Different: no tray or overlay; use local notifications and a foreground service or exact alarms where allowed.
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

- Tauri bundles: NSIS and MSI on Windows, a universal DMG on macOS, and deb/rpm/AppImage on Linux.
- `pnpm tauri build --bundles …` builds locally. `.github/workflows/build.yml` builds all three platforms on demand and uploads artifacts without creating a release.
- Windows uses the embedded WebView2 bootstrapper and a per-user NSIS install. The MSI remains available for managed deployments.
- macOS sets a 10.15.7 minimum system version. Transparency requires the private API, so distribution is direct only.
- Linux artifacts are built on Ubuntu 22.04 for a glibc 2.35 baseline.
- Signing is not configured yet. Unsigned Windows installers trigger SmartScreen and unsigned macOS builds trigger Gatekeeper. Signing is required before broad distribution.
- No auto-update in 1.0; users download releases manually.
- The updater can be added in 1.1 with signed manifests.

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
