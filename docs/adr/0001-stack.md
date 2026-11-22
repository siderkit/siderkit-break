# ADR-0001: Desktop stack (Tauri, Rust timer, Svelte UI)

- Status: accepted; the native-notification part of the stack was superseded by [ADR-0004](0004-in-app-reminders.md).
- Date: 2026-11-20
- Deciders: project owner

## Context

Siderkit Break needs to be a small, cross-platform desktop app with:

- a system tray;
- a transparent, always-on-top, click-through overlay;
- native notifications and autostart;
- an accurate timer that survives hidden windows and sleep;
- a path to experiment with Android and iOS later;
- a small installer and a maintainable codebase.

It is also a technology trial for a future desktop client, so the native capabilities matter more than reusing a large web application shell.

## Decision

Use:

- **Tauri 2** for the desktop shell and native integrations.
- **Rust** for the authoritative timer and session state.
- **Svelte 5 + Vite multi-page entries** for the three UI surfaces: main window, overlay, break card.
- **SQLite** for settings and session history.
- **Paraglide** for i18n, with English as the source locale.

The UI is thin. It renders a snapshot and sends commands. It never owns time.

## Alternatives considered

### Electron

Rejected. The installer and runtime are much larger, and the app does not need Node in the renderer. Tauri provides the native tray, window, and packaging APIs this app needs with a smaller footprint.

### Native toolkit (for example, a Rust-first UI toolkit)

Rejected for 1.0. It could produce a smaller runtime, but it gives up web UI reuse, slows down the two-week UI work, and still requires native widget code on mobile. The project is also a trial for a web-based desktop shell.

### Flutter

Rejected. It is a strong cross-platform toolkit, but it does not reuse the TypeScript/Svelte design system, and the desktop tray/overlay ecosystem is less aligned with the planned desktop direction.

### Capacitor

Rejected for the desktop shell. It is a mobile-oriented wrapper; the desktop shell still needs a native tray and transparent overlay. Tauri is the better fit for this app's Rust timer and desktop-first scope.

### A single webview with a native overlay

Deferred, not rejected. A native overlay could reduce memory, but it triples the platform-specific rendering work. The first release uses a second webview and measures the cost; if memory exceeds the budget, a native overlay becomes a follow-up.

## Consequences

Positive:

- Small installer and a native tray/overlay story.
- One Rust timer core that can be reused by a later mobile target.
- Svelte UI and TypeScript tooling are fast to iterate.
- The shell is a useful trial for the future desktop client.

Negative:

- Tauri uses system webviews; rendering and behavior vary across platforms.
- macOS transparency requires a private API, so the app cannot ship on the Mac App Store.
- Linux Wayland may not support absolute positioning or click-through.
- The team must maintain Rust and platform-specific code.
- A second webview adds memory; the spike must measure it.

## Follow-ups

- Spike the overlay and tray before building the full UI.
- Record memory and installer size in the spike.
- Decide whether to keep the main webview alive or destroy it when closed to tray.
- Revisit the native overlay if the memory budget is missed.
