# Documentation

| Document                                 | Purpose                                                        |
| ---------------------------------------- | -------------------------------------------------------------- |
| [Product brief](product-brief.md)        | Problem, users, 1.0 scope, non-goals, success metrics          |
| [Core flows](core-flows.md)              | First run, focus, break, sleep, quit, platform degradation     |
| [Acceptance](acceptance.md)              | P0/P1 criteria, platform matrix, definition of done            |
| [Technical design](tech-design.md)       | Architecture, timer, windows, persistence, IPC, platform notes |
| [Code quality](code-quality.md)          | Clean-code rules, thresholds, gates, exceptions                |
| [Privacy](../PRIVACY.md)                 | Local data, update requests, anonymous install counts          |
| [Release guide](release.md)              | Updater signing, GitHub publishing, verification, rollback     |
| [ADR-0001](adr/0001-stack.md)            | Tauri + Rust timer + Svelte UI                                 |
| [ADR-0002](adr/0002-taskbar-overlay.md)  | Tray + docked overlay, no in-taskbar text                      |
| [ADR-0003](adr/0003-reminder-sound.md)   | Bundled reminder chime, one sound on every platform            |
| [ADR-0004](adr/0004-in-app-reminders.md) | In-app reminder cards instead of system notifications          |
| [Translations](i18n/README.md)           | 30 language READMEs and the shared language index              |
| [README assets](assets/README.md)        | Screenshot sources, sizes, and capture rules                   |

## Status

All product documents describe the `1.0.0-rc.1` implementation. The ADRs are accepted; ADR-0004 supersedes the notification surface in ADR-0003.

## Review order

1. Product brief: is the scope small enough?
2. Core flows: are the edge cases correct?
3. Acceptance: are the criteria observable and testable?
4. Technical design: are the platform trade-offs acceptable?
5. Code quality: are the thresholds practical?
