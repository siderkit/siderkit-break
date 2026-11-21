use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard};
use std::time::Duration;

use log::{error, warn};
use tauri::{AppHandle, Emitter, Manager};

use crate::db::{now_ms, Store, TodaySummary};
use crate::notifications;
use crate::settings::{OverlayPosition, Settings};
use crate::shell;
use crate::timer::{
    Phase, SessionKind, SessionOutcome, SessionRecord, TimerEngine, TimerError, TimerSnapshot,
    Transition,
};
use crate::tray;

pub struct AppState {
    pub engine: Mutex<TimerEngine>,
    pub store: Mutex<Store>,
    pub settings: Mutex<Settings>,
    pub break_due_at_ms: Mutex<Option<i64>>,
    /// Minutes of the countdown whose in-app card is still open.
    pub countdown_notice: Mutex<Option<u32>>,
}

impl AppState {
    pub fn initialize(app: &AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let path = database_path(app)?;
        let store = Store::open(&path)?;
        let settings = store.load_settings()?;
        let now = now_ms();
        let engine = match store.load_runtime()? {
            Some(snapshot) => TimerEngine::restore(settings.timer, snapshot, now),
            None => TimerEngine::new(settings.timer),
        };
        Ok(Self {
            engine: Mutex::new(engine),
            store: Mutex::new(store),
            settings: Mutex::new(settings),
            break_due_at_ms: Mutex::new(None),
            countdown_notice: Mutex::new(None),
        })
    }
}

fn database_path(app: &AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let directory = app.path().app_data_dir()?;
    Ok(directory.join("siderkit-break.sqlite3"))
}

pub fn get_state(app: &AppHandle) -> Result<TimerSnapshot, String> {
    let state = app.state::<AppState>();
    let engine = lock_engine(&state)?;
    Ok(engine.snapshot(now_ms()))
}

pub fn get_settings(app: &AppHandle) -> Result<Settings, String> {
    let state = app.state::<AppState>();
    let settings = lock_settings(&state)?;
    Ok(settings.clone())
}

pub fn get_today_summary(app: &AppHandle) -> Result<TodaySummary, String> {
    let state = app.state::<AppState>();
    let store = lock_store(&state)?;
    store.today_summary().map_err(|error| error.to_string())
}

pub fn get_history(app: &AppHandle) -> Result<crate::db::History, String> {
    let state = app.state::<AppState>();
    let store = lock_store(&state)?;
    store.history().map_err(|error| error.to_string())
}

pub fn export_data(app: &AppHandle) -> Result<String, String> {
    let state = app.state::<AppState>();
    let store = lock_store(&state)?;
    store.export_json().map_err(|error| error.to_string())
}

pub fn start(app: &AppHandle) -> Result<TimerSnapshot, String> {
    run(app, |engine, now| Ok(engine.start(now)))
}

pub fn start_countdown(app: &AppHandle, minutes: u32) -> Result<TimerSnapshot, String> {
    let now = now_ms();
    let state = app.state::<AppState>();
    let transition = {
        let mut engine = lock_engine(&state)?;
        let snapshot = engine.snapshot(now);
        if snapshot.phase != Phase::Idle {
            return Err("countdown.timerBusy".to_owned());
        }
        if snapshot.pending_break.is_some() {
            return Err("countdown.breakPending".to_owned());
        }
        engine.start_countdown(minutes, now)
    };
    commit(app, &state, transition)
}

pub fn interrupt(app: &AppHandle) -> Result<TimerSnapshot, String> {
    run(app, |engine, now| Ok(engine.interrupt(now)))
}

pub fn quit(app: &AppHandle) {
    crate::overlay::save_overlay_position(app);
    if let Err(error) = interrupt(app) {
        warn!("failed to record interruption on quit: {error}");
    }
    app.exit(0);
}

pub fn pause(app: &AppHandle) -> Result<TimerSnapshot, String> {
    run(app, |engine, now| engine.pause(now))
}

pub fn resume(app: &AppHandle) -> Result<TimerSnapshot, String> {
    run(app, |engine, now| engine.resume(now))
}

pub fn skip(app: &AppHandle) -> Result<TimerSnapshot, String> {
    run(app, |engine, now| Ok(engine.skip(now)))
}

pub fn reset(app: &AppHandle) -> Result<TimerSnapshot, String> {
    run(app, |engine, now| Ok(engine.reset(now)))
}

pub fn toggle_start_pause(app: &AppHandle) -> Result<TimerSnapshot, String> {
    run(app, |engine, now| {
        let snapshot = engine.snapshot(now);
        if snapshot.phase == Phase::Idle {
            return Ok(engine.start(now));
        }
        if snapshot.is_paused {
            return engine.resume(now);
        }
        engine.pause(now)
    })
}

pub fn postpone_break(app: &AppHandle, minutes: u32) -> Result<TimerSnapshot, String> {
    let now = now_ms();
    let state = app.state::<AppState>();
    let transition = {
        let mut engine = lock_engine(&state)?;
        if !engine.snapshot(now).phase.is_break() {
            return Ok(engine.snapshot(now));
        }
        engine.postpone(now)
    };
    let snapshot = commit(app, &state, transition)?;
    let due = now.saturating_add(i64::from(minutes.clamp(1, 30)) * 60_000);
    *lock_break_due(&state)? = Some(due);
    Ok(snapshot)
}

pub fn update_settings(app: &AppHandle, settings: Settings) -> Result<Settings, String> {
    let state = app.state::<AppState>();
    let mut settings = settings.normalized();
    let previous = lock_settings(&state)?.clone();
    // The overlay owns its position; a UI draft must not reset it.
    settings.overlay.position = previous.overlay.position;
    {
        let mut engine = lock_engine(&state)?;
        engine.set_config(settings.timer);
    }
    {
        let store = lock_store(&state)?;
        store
            .save_settings(&settings)
            .map_err(|error| error.to_string())?;
    }
    *lock_settings(&state)? = settings.clone();
    shell::apply_settings(app, &settings)?;
    apply_autostart(app, settings.general.launch_at_login)?;
    notifications::ensure_permission(app);
    if previous.general.locale != settings.general.locale {
        let _ = app.emit("locale:changed", settings.general.locale.clone());
    }
    if let Ok(snapshot) = get_state(app) {
        tray::update(app, &snapshot);
        shell::sync_windows(app, &snapshot, false);
    }
    Ok(settings)
}

pub fn set_overlay_visible(app: &AppHandle, visible: bool) -> Result<(), String> {
    let state = app.state::<AppState>();
    {
        let mut settings = lock_settings(&state)?;
        settings.overlay.enabled = visible;
        let store = lock_store(&state)?;
        store
            .save_settings(&settings)
            .map_err(|error| error.to_string())?;
    }
    let settings = lock_settings(&state)?.clone();
    shell::apply_settings(app, &settings)?;
    if !visible {
        if let Some(hint) = app.get_webview_window("locate") {
            let _ = hint.hide();
        }
    }
    if let Ok(snapshot) = get_state(app) {
        tray::update(app, &snapshot);
        shell::sync_windows(app, &snapshot, false);
    }
    Ok(())
}

pub fn remember_overlay_position(app: &AppHandle, position: OverlayPosition) -> Result<(), String> {
    let state = app.state::<AppState>();
    let mut settings = lock_settings(&state)?;
    if settings.overlay.position == Some(position) {
        return Ok(());
    }
    settings.overlay.position = Some(position);
    let store = lock_store(&state)?;
    store
        .save_settings(&settings)
        .map_err(|error| error.to_string())
}

/// Re-assert the persisted preference at startup so an OS entry removed outside
/// the app (reinstall, cleanup tools) heals without the user toggling it again.
pub fn apply_startup_autostart(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    let enabled = lock_settings(&state)?.general.launch_at_login;
    apply_autostart(app, enabled)
}

fn apply_autostart(app: &AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let manager = app.autolaunch();
    let result = if enabled {
        manager.enable()
    } else {
        manager.disable()
    };
    result.map_err(|error| format!("failed to update autostart: {error}"))
}

fn run(
    app: &AppHandle,
    action: impl FnOnce(&mut TimerEngine, i64) -> Result<Transition, TimerError>,
) -> Result<TimerSnapshot, String> {
    let state = app.state::<AppState>();
    let now = now_ms();
    let transition = {
        let mut engine = lock_engine(&state)?;
        action(&mut engine, now).map_err(|error| error.to_string())?
    };
    let snapshot = commit(app, &state, transition)?;
    if snapshot.phase.is_active() {
        notifications::ensure_permission(app);
    }
    Ok(snapshot)
}

fn commit(
    app: &AppHandle,
    state: &AppState,
    transition: Transition,
) -> Result<TimerSnapshot, String> {
    if let Some(session) = &transition.ended_session {
        let store = lock_store(state)?;
        store
            .insert_session(session)
            .map_err(|error| error.to_string())?;
    }
    {
        let store = lock_store(state)?;
        store
            .save_runtime(&transition.snapshot)
            .map_err(|error| error.to_string())?;
    }
    if transition.snapshot.phase.is_active() || transition.snapshot.pending_break.is_none() {
        *lock_break_due(state)? = None;
    }
    let snapshot = transition.snapshot.clone();
    let _ = app.emit("timer:state", snapshot.clone());
    let _ = app.emit("timer:tick", snapshot.clone());
    if transition.phase_changed {
        let _ = app.emit("timer:phase", snapshot.clone());
    }
    if transition.missed_deadline {
        let _ = app.emit("timer:missed", snapshot.clone());
    }
    let finished_countdown = finished_countdown_minutes(
        transition.ended_session.as_ref(),
        transition.missed_deadline,
    );
    if let Ok(mut notice) = lock_notice(state) {
        if finished_countdown.is_some() {
            *notice = finished_countdown;
        } else if snapshot.phase.is_active() || transition.missed_deadline {
            *notice = None;
        }
    }
    if let Some(minutes) = finished_countdown {
        let _ = app.emit("countdown:finished", minutes);
    }
    tray::update(app, &snapshot);
    notifications::announce(
        app,
        &snapshot,
        transition.ended_session.as_ref(),
        transition.missed_deadline,
    );
    shell::sync_windows(app, &snapshot, transition.missed_deadline);
    Ok(snapshot)
}

/// Minutes of the countdown whose completion card is open, if any.
pub fn countdown_notice(app: &AppHandle) -> Option<u32> {
    app.state::<AppState>()
        .countdown_notice
        .lock()
        .map(|notice| *notice)
        .unwrap_or(None)
}

pub fn dismiss_countdown_notice(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    *lock_notice(&state)? = None;
    let snapshot = get_state(app)?;
    shell::sync_windows(app, &snapshot, false);
    Ok(())
}

/// Only a live completed countdown earns the in-app card; skipped, reset, or
/// sleep-missed countdowns keep the system notification alone.
fn finished_countdown_minutes(
    ended_session: Option<&SessionRecord>,
    missed_deadline: bool,
) -> Option<u32> {
    if missed_deadline {
        return None;
    }
    let session = ended_session?;
    if session.kind != SessionKind::Countdown || session.outcome != SessionOutcome::Completed {
        return None;
    }
    Some((session.planned_ms / 60_000).max(1) as u32)
}

pub fn spawn_ticker(app: AppHandle) {
    let _ = std::thread::Builder::new()
        .name("siderkit-break-timer".to_owned())
        .spawn(move || tick_loop(&app));
}

fn tick_loop(app: &AppHandle) {
    let mut last_second = -1_i64;
    loop {
        std::thread::sleep(Duration::from_millis(200));
        let now = now_ms();
        start_due_break(app, now);
        let state = app.state::<AppState>();
        let transition = match state.engine.lock() {
            Ok(mut engine) => engine.tick(now),
            Err(_) => {
                error!("timer state lock is poisoned");
                return;
            }
        };
        if transition.phase_changed {
            if let Err(error) = commit(app, &state, transition) {
                error!("failed to persist timer transition: {error}");
            }
            last_second = now / 1000;
            continue;
        }
        if now / 1000 != last_second {
            last_second = now / 1000;
            let snapshot = transition.snapshot;
            let _ = app.emit("timer:tick", snapshot.clone());
            tray::update(app, &snapshot);
        }
    }
}

fn start_due_break(app: &AppHandle, now: i64) {
    let state = app.state::<AppState>();
    let due = match lock_break_due(&state) {
        Ok(due) => *due,
        Err(error) => {
            warn!("failed to read postponed break: {error}");
            return;
        }
    };
    let Some(due) = due else {
        return;
    };
    if now < due {
        return;
    }
    let transition = match state.engine.lock() {
        Ok(mut engine) => {
            let snapshot = engine.snapshot(now);
            if snapshot.phase != Phase::Idle || snapshot.pending_break.is_none() {
                None
            } else {
                Some(engine.start(now))
            }
        }
        Err(_) => {
            error!("timer state lock is poisoned");
            return;
        }
    };
    if let Ok(mut due) = lock_break_due(&state) {
        *due = None;
    }
    if let Some(transition) = transition {
        if let Err(error) = commit(app, &state, transition) {
            error!("failed to start postponed break: {error}");
        }
    }
}

fn lock_engine(state: &AppState) -> Result<MutexGuard<'_, TimerEngine>, String> {
    state
        .engine
        .lock()
        .map_err(|_| "timer state is unavailable".to_owned())
}

pub(crate) fn lock_store(state: &AppState) -> Result<MutexGuard<'_, Store>, String> {
    state
        .store
        .lock()
        .map_err(|_| "local storage is unavailable".to_owned())
}

fn lock_settings(state: &AppState) -> Result<MutexGuard<'_, Settings>, String> {
    state
        .settings
        .lock()
        .map_err(|_| "settings are unavailable".to_owned())
}

fn lock_notice(state: &AppState) -> Result<MutexGuard<'_, Option<u32>>, String> {
    state
        .countdown_notice
        .lock()
        .map_err(|_| "countdown notice is unavailable".to_owned())
}

fn lock_break_due(state: &AppState) -> Result<MutexGuard<'_, Option<i64>>, String> {
    state
        .break_due_at_ms
        .lock()
        .map_err(|_| "break schedule is unavailable".to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::timer::{SessionKind, SessionOutcome, SessionRecord};

    fn session(kind: SessionKind, outcome: SessionOutcome, planned_ms: u64) -> SessionRecord {
        SessionRecord {
            id: "test".to_owned(),
            kind,
            started_at_ms: 0,
            ended_at_ms: planned_ms as i64,
            planned_ms,
            actual_ms: planned_ms,
            outcome,
            interruptions: 0,
        }
    }

    #[test]
    fn a_completed_countdown_opens_the_card_with_its_length() {
        let record = session(
            SessionKind::Countdown,
            SessionOutcome::Completed,
            25 * 60_000,
        );
        assert_eq!(finished_countdown_minutes(Some(&record), false), Some(25));
    }

    #[test]
    fn other_outcomes_and_kinds_keep_only_the_notification() {
        let skipped = session(SessionKind::Countdown, SessionOutcome::Skipped, 60_000);
        assert_eq!(finished_countdown_minutes(Some(&skipped), false), None);
        let completed = session(SessionKind::Countdown, SessionOutcome::Completed, 60_000);
        assert_eq!(finished_countdown_minutes(Some(&completed), true), None);
        let focus = session(SessionKind::Focus, SessionOutcome::Completed, 25 * 60_000);
        assert_eq!(finished_countdown_minutes(Some(&focus), false), None);
        assert_eq!(finished_countdown_minutes(None, false), None);
    }
}
