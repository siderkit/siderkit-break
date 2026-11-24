# Product brief

> Status: draft for review.
> Product: Siderkit Break.
> Scope: first public release, desktop only.

## One-liner

A tiny, calm break reminder that stays out of the way.

## Problem

People who work at a computer for long stretches forget to stop. Existing timers are often intrusive: full-screen popups, noisy dashboards, accounts, or heavy desktop runtimes. A break reminder should be easy to ignore visually and hard to miss when it matters.

## Target user

An individual desktop user who wants a small, dependable focus timer:

- developers, designers, writers, and analysts;
- people who work on one screen for 45–120 minute stretches;
- users who value local-first tools and do not want an account;
- users on Windows first, with macOS and Linux as secondary platforms.

The 1.0 product is not for teams, managers, or people who need cross-device sync.

## Jobs to be done

1. Start a focus session without opening a large app.
2. See the remaining time at a glance without it covering work.
3. Be reminded to stand up, look away, and rest.
4. Return to focus without negotiating with a complex UI.
5. Trust that the timer is still accurate after the window is hidden or the machine sleeps.

## Product principles

| Principle   | Meaning                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| Calm        | No flashing, no guilt, no streak pressure.                                                                          |
| Unobtrusive | The overlay is small, quiet, and optionally click-through.                                                          |
| Local-first | No account; session data never leaves the device. Only update checks and optional anonymous counts use the network. |
| Dependable  | The Rust timer is authoritative and deadline-based.                                                                 |
| Small       | Few dependencies, small installer, fast startup.                                                                    |
| Honest      | If a platform cannot support a behavior, say so and degrade.                                                        |

## 1.0 scope

### Must have

- Focus / short break / long break cycles with configurable durations.
- Long break after a configurable number of focus rounds.
- Start, pause, resume, skip, and reset.
- Auto-start breaks; manual start for the next focus by default.
- System tray: status, start/pause, skip, pause for 30 minutes, overlay toggle, settings, quit.
- Close-to-tray and single instance.
- Launch at login, starting minimized.
- Main window: timer, phase, today's completed rounds and focus minutes, settings.
- Transparent always-on-top overlay: 128×32 countdown and a tiny 22×22 idle droplet, click-through by default.
- Overlay starts in the bottom-left corner, then remembers its position per monitor; hide in fullscreen where the platform allows.
- In-app reminder cards at every phase boundary and a built-in reminder chime; no operating-system notifications.
- A break card with postpone, skip, and hide, plus focus-complete and break-complete cards.
- Defaults follow the classic 25/5/15 focus rhythm: 25-minute focus, 5-minute break, and a 15-minute long break every 4 rounds. Every length stays editable, and Settings → Restore defaults returns to this baseline.
- Local SQLite persistence for every focus, break, and countdown session.
- 40 UI languages with system-language detection and true RTL; light, dark, and system themes; twelve color styles that repaint the whole window.
- Global shortcuts for start/pause, skip, and overlay toggle.
- Windows auto-update with signed NSIS installers; macOS and Linux get manual downloads.
- Optional anonymous install and update counts, off-switch and reset included. No session data leaves the device.

### Should have

- Full-screen “deep rest” mode, off by default.
- Taskbar progress on platforms that support it.

## Success metrics

The first release is successful when:

- the author uses it for 10 working days without disabling it;
- timer drift stays under 1 second across pause, resume, and a 10-minute sleep;
- an 8-hour workday produces no crash and no duplicate session records;
- install size is at most 10 MB on Windows;
- idle memory with the overlay is at most 120 MB;
- idle CPU is below 0.5%;
- a new user can start the first focus session in under one minute;
- session data never leaves the device; the only outbound requests are update checks and the optional install beacon;
- the code quality gate passes on every pull request.

There is no behavioral telemetry. Anonymous install and update counts can be disabled in Settings; see [PRIVACY.md](../PRIVACY.md). The metrics above are verified locally and through manual dogfooding.

## Constraints

- Tauri uses the system webview; rendering differs across Windows, macOS, and Linux.
- macOS transparent windows require a private API; the app can be distributed directly but not through the Mac App Store.
- Linux Wayland may not allow absolute window positioning or click-through; the app must degrade gracefully.
- Windows 11 has no public API for third-party taskbar text. The product keeps the exact remaining time in the tray tooltip and menu, alongside the docked overlay.
- Code signing and notarization cost money; unsigned builds show platform warnings.

## Open questions

1. Should the default break experience be a reminder card, or a full-screen rest screen? The current plan defaults to the gentle option.
2. Should the overlay be click-through by default, or interactive by default? The current plan defaults to click-through with a hotkey to interact.
3. Is Linux a first-class 1.0 target or best-effort? The current plan is best-effort.
4. Should the first public release include automatic updates, or wait for 1.1? The current plan waits.
