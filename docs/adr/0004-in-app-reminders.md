# ADR-0004: In-app reminder cards instead of system notifications

- Status: accepted
- Date: 2026-11-22
- Deciders: project owner

## Context

Phase boundaries used operating-system notifications in four places: focus end,
break end, countdown end, and a deadline missed during sleep. That surface had
four problems:

1. It needed a permission prompt that many users dismiss, and a denied
   permission silently removed the reminder.
2. It looked different on every platform and could not carry the product's
   visual language or its action buttons.
3. The break-end path had no card at all: `sync_windows` hid the break window as
   soon as the phase stopped being a break, so the user only saw a toast.
4. The settings toggle gated the toast and the chime, but not the cards, so the
   switch did not describe what the app actually did.

The app already had a transparent, always-on-top HUD window for the running
break. Reusing it keeps one reminder surface, one visual language, and one set of
translated strings.

## Decision

1. Remove `tauri-plugin-notification`, its permission requests, and every
   operating-system notification path. The app has no notification permission.
2. Use the existing break HUD as the only reminder surface, with four variants:
   a running break, `FocusDone`, `BreakDone`, and `CountdownDone`.
3. Show `FocusDone` only when focus ends with the break pending. When the break
   auto-starts, the running break card is the reminder and no second card
   appears.
4. Always show `BreakDone`. When focus auto-started, the card does not take
   keyboard focus and closes itself after 8 seconds; when the timer is idle, it
   offers Start focus and stays until the user acts.
5. Gate every card and the chime with `notifications.enabled`. Gate only the
   chime with `notifications.sound`. Turning reminders off hides an open card
   immediately and clears the stored notice.
6. Keep the existing main-window WelcomeDialog for a deadline missed during
   sleep. It is already an in-app surface and does not need a second window.
7. Reuse the existing i18n keys for the notification copy, the countdown copy,
   and the timer actions. No new keys are introduced for 1.0.

## Alternatives considered

### Keep native notifications and add a card for break end

Rejected. It fixes the missing case but keeps the permission prompt, the
platform-specific look, and the unclear relationship between the toggle and the
cards. The user asked for every system notification to be replaced.

### Add a separate popup library or a second notification window

Rejected. The HUD already exists, is positioned top-center, is focusable, and
fits its height to the measured card. A second window would duplicate placement,
theming, focus rules, and lifecycle handling.

### Use tray balloons only

Rejected. They are drawn by the operating system, may be suppressed by Do Not
Disturb, cannot show the product's buttons, and are not available on every Linux
desktop.

### Auto-close every card after a few seconds

Rejected. A card that asks the user to start a break or focus must wait for the
answer. Only `BreakDone` auto-closes, and only when focus is already running and
the card is informational.

## Consequences

Positive:

- One consistent, translated, keyboard-accessible reminder surface on Windows,
  macOS, and Linux.
- No permission prompt and no notification-center clutter.
- The reminders toggle now matches the real behavior, including the break end.
- Break end finally has an in-app card with an action.

Negative:

- The app must be running to remind the user; quitting still stops reminders.
- Reminders are not kept in an operating-system notification history.
- The app does not integrate with the platform's Do Not Disturb setting. Its own
  reminders toggle is the control, and the chime still follows system volume.
- A user who is away from the screen sees the card when they return, not a
  notification badge in another app.

## Follow-up

- A full-screen rest mode remains a separate opt-in surface.
- Card placement on multi-monitor desktops can follow the overlay's monitor
  selection in a later release.
- Mobile builds may use local notifications because they have no desktop HUD;
  that does not change the desktop decision.
