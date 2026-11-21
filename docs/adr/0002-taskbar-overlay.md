# ADR-0002: Taskbar and overlay strategy

- Status: accepted
- Date: 2026-11-20
- Deciders: project owner

## Context

The product promise is “a tiny countdown that is always in front and does not get in the way.” Users often describe this as “taskbar support.”

There are three different ideas behind that phrase:

1. A tray icon that stays resident.
2. A small countdown docked visually next to the taskbar.
3. Text embedded inside the taskbar itself.

Windows 11 has no public API for third-party taskbar bands. The old deskband approach is deprecated, and macOS/Linux panels have no common equivalent. A true cross-platform in-taskbar text feature is not feasible.

## Decision

Ship three layers:

1. **Tray presence** on every platform: status, menu, tooltip, start/pause, skip, overlay toggle, settings, quit.
2. **Taskbar or Dock progress** as an optional setting where the platform supports it. It is not the primary surface.
3. **A docked overlay** positioned inside the monitor work area, above the taskbar or Dock. This is the visible countdown users perceive as “taskbar support.”

Do not implement true in-taskbar text embedding in 1.0.

The overlay has two modes:

- **Ghost:** click-through, no focus steal, no taskbar entry, low opacity.
- **Interactive:** receives clicks for moving and quick controls, entered deliberately from the tray or a shortcut.

## Alternatives considered

### Windows deskband or taskbar toolbar

Rejected. It is Windows-only, deprecated on Windows 11, fragile across Explorer updates, and impossible to match on macOS/Linux.

### Overlay a window directly on top of the taskbar

Rejected as a primary solution. It breaks with taskbar auto-hide, full-screen apps, DPI changes, and multiple monitors. The overlay is docked inside the work area instead of covering the taskbar.

### Tray-only countdown

Rejected as the only surface. A 16 px tray icon cannot legibly show `24:59`; users want a glanceable countdown. The tray remains the control surface.

### Always-interactive overlay

Rejected as the default. A small window that captures clicks can block work. Ghost mode is the default; interaction is a deliberate mode.

## Consequences

Positive:

- The same product model works on Windows, macOS, and Linux.
- The overlay is robust against taskbar changes and full-screen apps.
- The tray remains a reliable fallback when the overlay cannot work.
- No private Windows shell APIs.

Negative:

- The countdown is not literally inside the taskbar. The product must explain this.
- Wayland may refuse positioning or click-through; the app must degrade.
- The overlay may be hidden by some full-screen apps; auto-hide is best-effort.

## Follow-ups

- Measure tray icon legibility at 16 px and 32 px.
- Add a “move countdown” mode instead of making the overlay always interactive.
- Document platform-specific behavior in the settings page and README.
- Revisit taskbar progress after the core timer is stable.
