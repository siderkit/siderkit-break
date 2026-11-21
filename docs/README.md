# Documentation

| Document                                | Purpose                                                        |
| --------------------------------------- | -------------------------------------------------------------- |
| [Product brief](product-brief.md)       | Problem, users, 1.0 scope, non-goals, success metrics          |
| [Core flows](core-flows.md)             | First run, focus, break, sleep, quit, platform degradation     |
| [Acceptance](acceptance.md)             | P0/P1 criteria, platform matrix, definition of done            |
| [Technical design](tech-design.md)      | Architecture, timer, windows, persistence, IPC, platform notes |
| [Code quality](code-quality.md)         | Clean-code rules, thresholds, gates, exceptions                |
| [ADR-0001](adr/0001-stack.md)           | Tauri + Rust timer + Svelte UI                                 |
| [ADR-0002](adr/0002-taskbar-overlay.md) | Tray + docked overlay, no in-taskbar text                      |

## Status

All product documents are drafts for review. The stack and taskbar ADRs are accepted.

## Review order

1. Product brief: is the scope small enough?
2. Core flows: are the edge cases correct?
3. Acceptance: are the criteria observable and testable?
4. Technical design: are the platform trade-offs acceptable?
5. Code quality: are the thresholds practical?
