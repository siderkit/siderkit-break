//! In-app reminder cards. The app never posts operating-system notifications;
//! every phase boundary is announced by the custom card window instead.

use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::engine_host::AppState;
use crate::settings::Settings;
use crate::timer::{Phase, SessionKind, SessionOutcome, SessionRecord, TimerSnapshot};

/// A completed boundary that should be shown in the reminder card.
///
/// The shared `Done` suffix is the product wording and is mirrored by the
/// TypeScript union, so keep it instead of shortening the variants.
#[allow(clippy::enum_variant_names)]
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(tag = "kind")]
pub enum TimerNotice {
    /// Focus ended without an automatic break, so the card offers one.
    /// The id lets the card attach a tag to the session it just saved, and the
    /// length keeps the card's "25 min · Focus" summary honest.
    FocusDone {
        session_id: String,
        minutes: u32,
    },
    /// A break ended; the card offers the next focus.
    BreakDone,
    CountdownDone {
        minutes: u32,
    },
}

/// Picks the card for a transition. A completed focus only opens a notice while
/// the break waits for the user; an auto-started break is announced by the
/// running break card itself. A completed break and a completed countdown always
/// open their cards, even when the next phase already started.
pub fn notice_for(
    settings: &Settings,
    snapshot: &TimerSnapshot,
    ended_session: Option<&SessionRecord>,
    missed_deadline: bool,
) -> Option<TimerNotice> {
    if !settings.notifications.enabled || missed_deadline {
        return None;
    }
    let session = ended_session?;
    if session.outcome != SessionOutcome::Completed {
        return None;
    }
    match session.kind {
        SessionKind::Focus => {
            // With an automatic break the break card is already the reminder.
            (snapshot.phase == Phase::Idle && snapshot.pending_break.is_some()).then(|| {
                TimerNotice::FocusDone {
                    session_id: session.id.clone(),
                    minutes: (session.planned_ms / 60_000).max(1) as u32,
                }
            })
        }
        SessionKind::ShortBreak | SessionKind::LongBreak => Some(TimerNotice::BreakDone),
        SessionKind::Countdown => Some(TimerNotice::CountdownDone {
            minutes: (session.planned_ms / 60_000).max(1) as u32,
        }),
    }
}

/// The bundled chime follows the same boundaries the old notifications did:
/// a completed focus, break, or countdown, and a missed deadline.
pub fn should_chime(
    settings: &Settings,
    ended_session: Option<&SessionRecord>,
    missed_deadline: bool,
) -> bool {
    if !settings.notifications.enabled || !settings.notifications.sound {
        return false;
    }
    if missed_deadline {
        return true;
    }
    ended_session.is_some_and(|session| session.outcome == SessionOutcome::Completed)
}

/// Plays one reminder timbre for the settings preview. The row's own preview
/// button can audition another timbre without changing the saved choice, so
/// both the preset and the volume are optional overrides. Nothing is posted to
/// the operating system, so the preview cannot leak a toast.
pub fn preview(
    app: &AppHandle,
    preset: Option<crate::settings::SoundPreset>,
    volume: Option<u8>,
) -> Result<(), String> {
    let settings = settings(app);
    if !settings.notifications.enabled {
        return Err("reminders are turned off".to_owned());
    }
    crate::sound::play(
        preset.unwrap_or(settings.notifications.preset),
        volume.unwrap_or(settings.notifications.volume),
        settings.notifications.custom_path.as_deref(),
    )
}

fn settings(app: &AppHandle) -> Settings {
    app.state::<AppState>()
        .settings
        .lock()
        .map(|settings| settings.clone())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings::GeneralSettings;
    use crate::timer::{Phase, SessionKind, SessionOutcome, SessionRecord};

    fn settings(enabled: bool) -> Settings {
        Settings {
            general: GeneralSettings {
                locale: Some("en".to_owned()),
                ..GeneralSettings::default()
            },
            notifications: crate::settings::NotificationSettings {
                enabled,
                sound: true,
                ..crate::settings::NotificationSettings::default()
            },
            ..Settings::default()
        }
    }

    fn session(kind: SessionKind, outcome: SessionOutcome) -> SessionRecord {
        SessionRecord {
            id: "test".to_owned(),
            kind,
            started_at_ms: 0,
            ended_at_ms: 25 * 60_000,
            planned_ms: 25 * 60_000,
            actual_ms: 25 * 60_000,
            outcome,
            interruptions: 0,
        }
    }

    fn snapshot(phase: Phase, pending_break: Option<Phase>) -> TimerSnapshot {
        TimerSnapshot {
            phase,
            is_paused: false,
            remaining_ms: 0,
            planned_ms: 0,
            ends_at_ms: None,
            cycle_index: 0,
            completed_focus_count: 0,
            started_at_ms: None,
            interruptions: 0,
            pending_break,
        }
    }

    #[test]
    fn a_focus_that_waits_for_a_break_opens_the_focus_card() {
        let notice = notice_for(
            &settings(true),
            &snapshot(Phase::Idle, Some(Phase::ShortBreak)),
            Some(&session(SessionKind::Focus, SessionOutcome::Completed)),
            false,
        );
        assert_eq!(
            notice,
            Some(TimerNotice::FocusDone {
                session_id: "test".to_owned(),
                minutes: 25
            })
        );
    }

    #[test]
    fn a_focus_with_an_automatic_break_keeps_the_break_card_only() {
        assert_eq!(
            notice_for(
                &settings(true),
                &snapshot(Phase::ShortBreak, None),
                Some(&session(SessionKind::Focus, SessionOutcome::Completed)),
                false,
            ),
            None
        );
    }

    #[test]
    fn a_completed_break_always_opens_the_break_card() {
        assert_eq!(
            notice_for(
                &settings(true),
                &snapshot(Phase::Idle, None),
                Some(&session(SessionKind::ShortBreak, SessionOutcome::Completed)),
                false,
            ),
            Some(TimerNotice::BreakDone)
        );
    }

    #[test]
    fn a_completed_countdown_reports_its_length() {
        assert_eq!(
            notice_for(
                &settings(true),
                &snapshot(Phase::Idle, None),
                Some(&session(SessionKind::Countdown, SessionOutcome::Completed)),
                false,
            ),
            Some(TimerNotice::CountdownDone { minutes: 25 })
        );
    }

    #[test]
    fn skipped_sessions_and_missed_deadlines_stay_quiet() {
        assert_eq!(
            notice_for(
                &settings(true),
                &snapshot(Phase::Idle, None),
                Some(&session(SessionKind::Focus, SessionOutcome::Skipped)),
                false,
            ),
            None
        );
        assert_eq!(
            notice_for(
                &settings(true),
                &snapshot(Phase::Idle, None),
                Some(&session(SessionKind::Focus, SessionOutcome::Completed)),
                true,
            ),
            None
        );
    }

    #[test]
    fn turning_reminders_off_silences_cards_and_the_chime() {
        let disabled = settings(false);
        assert_eq!(
            notice_for(
                &disabled,
                &snapshot(Phase::Idle, None),
                Some(&session(SessionKind::ShortBreak, SessionOutcome::Completed)),
                false,
            ),
            None
        );
        assert!(!should_chime(
            &disabled,
            Some(&session(SessionKind::Focus, SessionOutcome::Completed)),
            false
        ));
    }

    #[test]
    fn the_chime_follows_completions_and_missed_deadlines() {
        let enabled = settings(true);
        assert!(should_chime(
            &enabled,
            Some(&session(SessionKind::Focus, SessionOutcome::Completed)),
            false
        ));
        assert!(!should_chime(
            &enabled,
            Some(&session(SessionKind::Focus, SessionOutcome::Skipped)),
            false
        ));
        assert!(should_chime(&enabled, None, true));
    }
}
