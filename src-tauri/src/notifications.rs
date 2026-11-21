use log::warn;
use tauri::{AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;

use crate::engine_host::AppState;
use crate::i18n::{active_locale, translate};
use crate::settings::Settings;
use crate::timer::{SessionKind, SessionOutcome, SessionRecord, TimerSnapshot};

pub fn ensure_permission(app: &AppHandle) {
    let Ok(state) = app.try_state::<AppState>().ok_or(()) else {
        return;
    };
    let enabled = match state.settings.lock() {
        Ok(settings) => settings.notifications.enabled,
        Err(_) => return,
    };
    if !enabled {
        return;
    }
    let notification = app.notification();
    match notification.permission_state() {
        Ok(tauri::plugin::PermissionState::Granted) => {}
        Ok(_) => {
            if let Err(error) = notification.request_permission() {
                warn!("notification permission request failed: {error}");
            }
        }
        Err(error) => warn!("notification permission check failed: {error}"),
    }
}

/// Plays the built-in reminder chime on every platform. No notification is
/// sent, so the preview is only about the sound.
pub fn preview(app: &AppHandle) -> Result<(), String> {
    if !settings(app).notifications.enabled {
        return Err("notifications are turned off".to_owned());
    }
    crate::sound::play_notification()
}

pub fn announce(
    app: &AppHandle,
    snapshot: &TimerSnapshot,
    ended_session: Option<&SessionRecord>,
    missed_deadline: bool,
) {
    let settings = settings(app);
    if !settings.notifications.enabled {
        return;
    }
    let Some((title, body)) = message(&settings, ended_session, missed_deadline, snapshot) else {
        return;
    };
    if settings.notifications.sound {
        crate::sound::play_notification_in_background();
    }
    // The toast stays silent: the app owns the chime, so platforms do not
    // play a second, different sound on top of it.
    if let Err(error) = app.notification().builder().title(title).body(body).show() {
        warn!("failed to show notification: {error}");
    }
}

fn message(
    settings: &Settings,
    ended_session: Option<&SessionRecord>,
    missed_deadline: bool,
    snapshot: &TimerSnapshot,
) -> Option<(String, String)> {
    let locale = active_locale(settings.general.locale.as_deref());
    if missed_deadline {
        return Some((
            translate(&locale, "notification.welcome.title"),
            translate(&locale, "notification.welcome.body"),
        ));
    }
    let session = ended_session?;
    if session.outcome != SessionOutcome::Completed {
        return None;
    }
    match session.kind {
        SessionKind::Focus => Some((
            translate(&locale, "notification.focus.title"),
            translate(&locale, "notification.focus.body"),
        )),
        SessionKind::Countdown => Some((
            translate(&locale, "notification.countdown.title"),
            translate(&locale, "notification.countdown.body"),
        )),
        _ if snapshot.phase.is_break() => None,
        _ => Some((
            translate(&locale, "notification.break.title"),
            translate(&locale, "notification.break.body"),
        )),
    }
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

    fn settings(locale: Option<&str>) -> Settings {
        Settings {
            general: GeneralSettings {
                locale: locale.map(str::to_owned),
                ..GeneralSettings::default()
            },
            ..Settings::default()
        }
    }

    fn session(kind: SessionKind) -> SessionRecord {
        SessionRecord {
            id: "test".to_owned(),
            kind,
            started_at_ms: 0,
            ended_at_ms: 1,
            planned_ms: 1,
            actual_ms: 1,
            outcome: SessionOutcome::Completed,
            interruptions: 0,
        }
    }

    fn snapshot(phase: Phase) -> TimerSnapshot {
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
            pending_break: None,
        }
    }

    #[test]
    fn completed_focus_uses_the_focus_notification() {
        let (title, _) = message(
            &settings(Some("en")),
            Some(&session(SessionKind::Focus)),
            false,
            &snapshot(Phase::ShortBreak),
        )
        .expect("message");
        assert_eq!(title, "Time for a break");
    }

    #[test]
    fn a_completed_countdown_has_its_own_notification() {
        let (title, _) = message(
            &settings(Some("en")),
            Some(&session(SessionKind::Countdown)),
            false,
            &snapshot(Phase::Idle),
        )
        .expect("message");
        assert_eq!(title, "Countdown finished");
    }

    #[test]
    fn skipped_sessions_do_not_notify() {
        let mut skipped = session(SessionKind::Focus);
        skipped.outcome = SessionOutcome::Skipped;
        assert!(message(
            &settings(Some("en")),
            Some(&skipped),
            false,
            &snapshot(Phase::Idle)
        )
        .is_none());
    }

    #[test]
    fn missed_deadlines_use_the_welcome_notification() {
        let (title, _) =
            message(&settings(Some("zh-CN")), None, true, &snapshot(Phase::Idle)).expect("message");
        assert_eq!(title, "欢迎回来");
    }
}
