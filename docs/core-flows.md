# Core flows

> Status: draft for review.
> Scope: desktop 1.0.

The desktop app has one authoritative timer in Rust. The UI never owns time. Every flow below describes what the user does, what the core does, and what can go wrong.

## State model

```text
Idle ──start──▶ Focus ──complete──▶ ShortBreak / LongBreak ──complete──▶ Idle
                  │
                  ├── pause ──▶ Paused ──resume──▶ Focus
                  ├── skip ──▶ break or idle
                  └── reset ──▶ Idle
```

Paused is a substate of the current phase. It stores the phase, the remaining time, and the cycle index.

## F-01 First run

**Trigger:** the app starts with no saved settings.

**Main path:**

1. The app starts in the tray, with the main window visible.
2. Defaults: focus 25 minutes, short break 5 minutes, long break 15 minutes, long break every 4 focus rounds.
3. The onboarding card explains the tray, the overlay, and the shortcut.
4. The app never asks for operating-system notification permission; every reminder is an in-app card.
5. The user can start immediately with the default configuration.

**Exceptions:**

- Reminders are turned off: the app still shows the overlay and timer; settings explains how to turn reminder cards back on.
- Tray unavailable: the app keeps the main window available and shows a warning; the timer still works.
- Database cannot be created: show a blocking error with the data directory path and a retry action.

**Acceptance:** the user can start a focus session in under one minute.

## F-02 Start focus

**Trigger:** the user clicks Start in the main window, the tray menu, or the global shortcut.

**Main path:**

1. The core sets `phase = Focus`, `ends_at = now + focus_duration`, and persists runtime state.
2. The overlay and tray update within one second.
3. The main window shows the countdown and the current cycle position.
4. The session record is created when the session ends, not at start; the runtime state is enough to recover.

**Exceptions:**

- Another session is already running: the command is idempotent; the UI shows the current state.
- Clock jumps backward: the remaining time is clamped to the configured duration.
- Clock jumps forward: the session completes, but only one transition is emitted.

## F-03 Pause and resume

**Trigger:** the user clicks Pause or the start/pause shortcut.

**Main path:**

1. The core stores `paused_remaining_ms` and clears `ends_at`.
2. The overlay shows a paused indicator.
3. Resume sets `ends_at = now + paused_remaining_ms`.
4. Pause and resume are recorded as interruptions on the current session.

**Exceptions:**

- Pause while idle: no-op.
- Resume while running: no-op.
- Pause during a break: allowed; the break is paused, not skipped.

## F-04 Complete focus and enter a break

**Trigger:** `now >= ends_at` while in Focus.

**Main path:**

1. The core marks the focus session `Completed` and writes it to SQLite.
2. It selects ShortBreak or LongBreak using the completed focus count.
3. It starts the break automatically if `auto_start_breaks` is on; otherwise it enters Idle and waits with the break pending.
4. When reminders are on, it plays the built-in chime if sound is on and shows the reminder card: the running break card after an automatic start, or the focus-complete card with Start break when the break is waiting.
5. The overlay switches to the break color.

**Exceptions:**

- The machine slept through the deadline: see F-08.
- The user is in a fullscreen app and `quiet_in_fullscreen` is on: suppress the reminder card, keep the state transition, and show a quiet badge in the tray.
- The chime cannot start: the reminder card is still shown; the failure is logged locally.

## F-05 Complete a break

**Trigger:** `now >= ends_at` while in a break.

**Main path:**

1. The core marks the break `Completed`.
2. It enters Idle, or starts focus automatically when `auto_start_focus` is on.
3. When reminders are on, it shows the break-complete card: “Break over. Ready to focus?” with Start focus when idle. When focus already started, the card does not take keyboard focus and closes itself after 8 seconds.
4. It does not start the next focus automatically by default.
5. The overlay shows the idle state or hides, depending on settings.

**Exceptions:**

- The user skips the break: mark it `Skipped`, enter Idle, and do not auto-start focus.
- The user postpones the break: keep the current focus session completed, schedule a new break start in 5 minutes, and show a tray badge.
- The app is quit during the break: mark it `Interrupted` on the next launch.

## F-06 Skip, postpone, reset

- **Skip focus:** mark the current focus `Skipped`, then follow the configured behavior: enter a break or Idle.
- **Skip break:** mark the break `Skipped` and enter Idle.
- **Postpone break:** only available from the break card; schedules a new break in 5 minutes.
- **Reset:** mark the current session `Reset`, clear runtime state, and return to Idle. Reset is available from the main window and the tray menu.

All outcomes are persisted. A session is never silently discarded.

## F-07 Overlay modes

**Trigger:** the user enables the overlay or changes its mode in settings.

**Modes:**

1. **Ghost (default):** click-through outside its own bounds, 55–75% opacity, no focus steal, no taskbar entry.
2. **Interactive:** while the pointer is over the droplet or countdown, it receives clicks and can be dragged.
3. **Hidden:** no overlay; tray remains.

**Main path:**

1. The overlay opens on the selected monitor at its remembered position, or in the bottom-left corner on first run.
2. Clicks outside the overlay pass through to the app underneath.
3. Hovering the overlay makes it interactive; press and drag to move it, with no mode toggle or extra click.
4. A click without dragging opens the main window, and a right-click opens the overlay menu.
5. The position is saved relative to the monitor work area.
6. On startup, the app finds the saved monitor; if it is missing, it falls back to the primary monitor.

**Exceptions:**

- Wayland does not allow absolute positioning: place the overlay at a compositor-chosen position and explain the limitation in settings.
- Click-through is refused by the compositor: keep the overlay interactive and show a one-time notice.
- The selected monitor is disconnected: fall back to the primary monitor and keep the old position for when it returns.
- Fullscreen app detected: hide the overlay if `hide_in_fullscreen` is on; restore it when the fullscreen app exits.

## F-08 Sleep and resume

**Trigger:** the system resumes from sleep or hibernation.

**Main path:**

1. The core compares the wall-clock deadline with the current time.
2. If the deadline has not passed, it continues normally.
3. If the deadline passed during sleep, it does **not** open a burst of reminder cards.
4. It shows a “Welcome back” card: “Focus ended while you were away.”
5. The user can start the break or reset, which discards the queued break.

**Exceptions:**

- The app was closed during sleep: on the next launch, mark the previous session `Interrupted` and show the same welcome-back card.
- The system clock was changed: clamp the remaining time to the configured duration; log the event locally.
- The app resumes after multiple cycles: only the current phase is evaluated; missed cycles are not replayed.

## F-09 Quit and restart

**Trigger:** the user quits from the tray or the app is terminated.

**Main path:**

1. A graceful quit marks the current session `Interrupted` with the actual elapsed time.
2. Runtime state is persisted before exit.
3. On restart, the app restores the last phase.
4. If the deadline passed while the app was closed, the welcome-back flow applies.
5. If the previous session was already completed, no duplicate is written.

**Exceptions:**

- A crash prevents the graceful path: on startup, detect a stale runtime state and close the open session as `Interrupted`.
- The database is locked: retry once, then show an error and keep the app in memory-only mode for the current run.

## F-10 Single instance and autostart

- A second launch focuses the existing main window and exits.
- Autostart launches the app minimized to the tray.
- Autostart never starts a focus session automatically.
- Disabling autostart removes the OS login item; it does not delete user data.

## F-11 Reminders turned off

- “Show reminder cards” gates every phase boundary card and the chime.
- With reminders off, the overlay, tray, timer, and main window keep working; no card opens and no chime plays.
- The Preview button is disabled while reminders are off, because a preview would be the only sound the app makes.
- Turning reminders back on affects the next boundary; a card that was open is hidden immediately when the toggle goes off.
- The app never blocks the timer because reminders are unavailable.

## F-12 Platform degradation

| Situation                                  | Behavior                                                     |
| ------------------------------------------ | ------------------------------------------------------------ |
| Tray unavailable (Linux)                   | Keep the main window; show a warning; timer works            |
| Click-through unavailable (Wayland)        | Keep the overlay interactive; explain the limitation         |
| Absolute positioning unavailable (Wayland) | Use compositor placement; do not fight the compositor        |
| Transparency unavailable                   | Fall back to a solid compact countdown; keep the same layout |
| Chime output unavailable                   | Show the reminder card silently; log the failure             |
| Fullscreen detection unavailable           | Rely on the manual quiet mode and shortcut                   |

## F-13 Independent countdown

**Trigger:** the user starts a countdown from the main window while the pomodoro timer is idle.

**Main path:**

1. The core enters `Countdown` with the chosen length and persists the runtime state.
2. The overlay, main window, and tray show the remaining time.
3. At zero the session is written as `Completed` and the phase returns to idle.
4. The in-app completion card opens above other windows with the length, a dismiss action, and a repeat action; no operating-system notification is posted.
5. Dismissing hides the card; repeating starts the same length again.

**Exceptions:**

- The user skips or resets the countdown: no completion card and no completion chime.
- The deadline passed while the machine slept: the welcome-back dialog replaces the completion card.
- Another phase starts while the card is open: the card closes and stays closed.

## F-14 Reminder preview

- Settings → Reminders → Preview plays the built-in reminder chime and sends no notification.
- The preview uses the same chime and playback path as a session-end reminder, so the user hears exactly what a reminder will sound like.
- The preview plays the sound even while "Play a sound" is off, so the sound can be auditioned before enabling it.
- When the audio output is unavailable, the row shows an inline explanation instead of a silent failure.

## Error and empty states

- **No sessions yet:** “Start your first focus session.”
- **No history permission:** not applicable; all data is local.
- **Database error:** blocking card with retry and “open data folder”.
- **Overlay cannot open:** keep the tray; show a one-time error with a link to logs.
- **Reminders off:** non-blocking note in settings explaining what is paused.
- **Unsupported platform:** explicit unsupported screen; do not pretend the app works.
