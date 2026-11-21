# ADR-0003: Bundled reminder sound

- Status: accepted
- Date: 2026-11-21
- Deciders: project owner

## Context

The reminder used the operating system notification sound. That sound is not a
product asset: it differs per platform and per machine, can be set to “None”,
and is muted by Do Not Disturb. The settings preview therefore could not
promise what the user would actually hear, and on Windows the preview needed a
real toast just to make a sound.

Operating system sounds also cannot be bundled. The Windows, macOS, and Linux
notification sounds are not licensed for redistribution in an MIT/Apache
project, and copying one would make the app’s audio depend on another vendor’s
assets.

## Decision

1. Ship one original, short two-note bell chime inside the binary:
   `src-tauri/assets/notification.wav`, generated reproducibly by
   `scripts/generate-sound.mjs`.
2. Play it from the Rust core with `rodio`/`cpal` on Windows, macOS, and Linux.
   The sound therefore does not depend on notification permission, the OS sound
   scheme, or a visible webview.
3. Keep system toasts silent and let the chime be the only reminder sound, so a
   platform cannot add a second, different sound.
4. Use the same playback path for the settings preview and for session-end
   reminders, so previewing is exact.
5. Keep the existing `notifications.sound` toggle as the single control.

## Alternatives considered

### Keep the operating system notification sound

Rejected. It is inconsistent across platforms, can be silent without the app
knowing, requires a toast on some platforms, and cannot be shipped as a
cross-platform product asset.

### Bundle a copy of the Windows notification sound

Rejected. The file is not licensed for redistribution. The chime is original
work instead.

### Play audio in the webview

Rejected. The main window can be hidden at session end, background webviews can
be throttled, and autoplay policies vary. The Rust core is the reliable owner of
timer events.

### Native playback code per platform

Rejected. Three implementations would drift and none would guarantee the same
sound. `rodio` wraps the platform audio APIs behind one playback path.

## Consequences

Positive:

- One recognizable sound on every platform.
- Preview and reminder are the same code path and the same file.
- No notification permission is needed to audition or play the chime.
- The chime keeps working when notifications are suppressed, which matches the
  alarm-like role of a break reminder.

Negative:

- Adds `rodio`/`cpal` and a roughly 130 KB asset to the binary.
- Linux builds now need the ALSA development headers (`libasound2-dev`).
- The chime is not silenced by Do Not Disturb. The app’s own “Play a sound”
  toggle is the control; system volume and mute still apply.

## Follow-up

A sound picker can be added later without changing the playback architecture.
