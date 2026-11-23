//! Update checks, downloads, and installation.
//!
//! The renderer only reads a status snapshot and sends intent. Every network
//! request, signature check, cache write, and installer launch stays in Rust,
//! so the WebView never receives the updater permission.

mod cache;
mod model;
mod scheduler;
#[cfg(test)]
mod tests;
mod tray_label;

pub use self::tray_label::label as tray_label;

use std::sync::atomic::Ordering;
use std::time::Duration;

use log::{info, warn};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_updater::{Update, UpdaterExt};

use self::model::{set_failed, should_prompt, supported, Pending, UpdaterState};
pub use self::model::{UpdatePhase, UpdateStatus};

use crate::db::now_ms;
use crate::engine_host;
use crate::metrics;
use crate::settings::UpdateSettings;
use crate::tray;

pub const STATUS_EVENT: &str = "update:status";

const CHECK_TIMEOUT_SECS: u64 = 30;
const PROGRESS_EMIT_MS: i64 = 150;
const DEFAULT_SNOOZE_HOURS: u32 = 24;

fn guard<T>(mutex: &std::sync::Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(|poison| poison.into_inner())
}

pub fn initialize(app: &AppHandle) {
    let state = UpdaterState::default();
    if supported() {
        cache::restore(app, &state);
    }
    let _ = app.manage(state);
}

pub fn spawn_scheduler(app: AppHandle) {
    scheduler::spawn(app);
}

/// Called after update settings are persisted so the scheduler and counters react.
pub fn settings_changed(app: &AppHandle, previous: &UpdateSettings, current: &UpdateSettings) {
    if previous.auto_check != current.auto_check {
        app.state::<UpdaterState>().wake.notify_waiters();
    }
    if !previous.metrics && current.metrics {
        metrics::report_install(app);
    }
    emit_status(app);
}

pub fn status(app: &AppHandle) -> UpdateStatus {
    let state = app.state::<UpdaterState>();
    let snapshot = state
        .snapshot
        .lock()
        .unwrap_or_else(|poison| poison.into_inner())
        .clone();
    let settings = engine_host::get_settings(app)
        .map(|settings| settings.update)
        .unwrap_or_default();
    let prompt = should_prompt(&snapshot, &settings, now_ms());
    UpdateStatus {
        supported: supported(),
        phase: snapshot.phase,
        version: snapshot.version,
        notes: snapshot.notes,
        pub_date: snapshot.pub_date,
        downloaded: snapshot.downloaded,
        total: snapshot.total,
        last_checked_ms: snapshot.last_checked_ms,
        last_error: snapshot.last_error,
        prompt,
        auto_check: settings.auto_check,
        skipped_version: settings.skipped_version,
        snooze_until_ms: settings.snooze_until_ms,
    }
}

/// Checks both endpoints unless a check or download is already running.
pub async fn check(app: &AppHandle, manual: bool) -> UpdateStatus {
    if !supported() {
        return status(app);
    }
    let state = app.state::<UpdaterState>();
    if state.downloading.load(Ordering::SeqCst) || state.checking.swap(true, Ordering::SeqCst) {
        return status(app);
    }
    info!("checking for updates (manual: {manual})");
    {
        let mut snapshot = guard(&state.snapshot);
        snapshot.phase = UpdatePhase::Checking;
        snapshot.last_error = None;
    }
    emit_status(app);
    let result = perform_check(app).await;
    state.checking.store(false, Ordering::SeqCst);
    apply_check_result(app, result);
    status(app)
}

async fn perform_check(app: &AppHandle) -> Result<Option<Update>, String> {
    let mut builder = app
        .updater_builder()
        .timeout(Duration::from_secs(CHECK_TIMEOUT_SECS));
    if let Some(install_id) = metrics::install_id(app) {
        builder = builder
            .header(metrics::INSTALL_HEADER, install_id)
            .map_err(|error| error.to_string())?;
    }
    let updater = builder.build().map_err(|error| error.to_string())?;
    updater.check().await.map_err(|error| error.to_string())
}

fn apply_check_result(app: &AppHandle, result: Result<Option<Update>, String>) {
    let state = app.state::<UpdaterState>();
    let checked = now_ms();
    match result {
        Ok(Some(update)) => {
            let version = update.version.clone();
            let notes = update.body.clone();
            let pub_date = update.date.map(|date| date.to_string());
            let keep_ready = {
                let snapshot = state
                    .snapshot
                    .lock()
                    .unwrap_or_else(|poison| poison.into_inner());
                snapshot.phase == UpdatePhase::Ready
                    && snapshot.version.as_deref() == Some(version.as_str())
            };
            {
                let mut pending = guard(&state.pending);
                if keep_ready {
                    if let Some(pending) = pending.as_mut() {
                        pending.update = update;
                    }
                } else {
                    *pending = Some(Pending {
                        update,
                        bytes: None,
                    });
                }
            }
            {
                let mut snapshot = guard(&state.snapshot);
                snapshot.version = Some(version);
                snapshot.notes = notes;
                snapshot.pub_date = pub_date;
                snapshot.last_checked_ms = Some(checked);
                snapshot.last_error = None;
                if !keep_ready {
                    snapshot.phase = UpdatePhase::Available;
                    snapshot.downloaded = 0;
                    snapshot.total = None;
                }
            }
            if !keep_ready {
                cache::clear(app);
            }
        }
        Ok(None) => {
            let keep_ready = {
                let snapshot = state
                    .snapshot
                    .lock()
                    .unwrap_or_else(|poison| poison.into_inner());
                snapshot.phase == UpdatePhase::Ready
            };
            if keep_ready {
                let mut snapshot = guard(&state.snapshot);
                snapshot.last_checked_ms = Some(checked);
                snapshot.last_error = None;
            } else {
                {
                    let mut snapshot = guard(&state.snapshot);
                    snapshot.phase = UpdatePhase::UpToDate;
                    snapshot.version = None;
                    snapshot.notes = None;
                    snapshot.pub_date = None;
                    snapshot.downloaded = 0;
                    snapshot.total = None;
                    snapshot.last_checked_ms = Some(checked);
                    snapshot.last_error = None;
                }
                *state
                    .pending
                    .lock()
                    .unwrap_or_else(|poison| poison.into_inner()) = None;
                cache::clear(app);
            }
        }
        Err(error) => {
            warn!("update check failed: {error}");
            let mut snapshot = guard(&state.snapshot);
            snapshot.last_checked_ms = Some(checked);
            snapshot.last_error = Some("check".to_owned());
            if snapshot.version.is_none() {
                snapshot.phase = UpdatePhase::Failed;
            }
        }
    }
    emit_status(app);
}

/// Starts the download in the background and returns the current snapshot.
pub fn start_download(app: &AppHandle) -> Result<UpdateStatus, String> {
    if !supported() {
        return Err("update.unsupported".to_owned());
    }
    let state = app.state::<UpdaterState>();
    if state.downloading.swap(true, Ordering::SeqCst) {
        return Ok(status(app));
    }
    let pending = {
        let pending = state
            .pending
            .lock()
            .unwrap_or_else(|poison| poison.into_inner());
        pending
            .as_ref()
            .map(|pending| (pending.update.clone(), pending.bytes.is_some()))
    };
    let Some((update, already_downloaded)) = pending else {
        state.downloading.store(false, Ordering::SeqCst);
        return Err("update.notAvailable".to_owned());
    };
    if already_downloaded {
        state.downloading.store(false, Ordering::SeqCst);
        return Ok(status(app));
    }
    let id = state.download_id.fetch_add(1, Ordering::SeqCst) + 1;
    {
        let mut snapshot = guard(&state.snapshot);
        snapshot.phase = UpdatePhase::Downloading;
        snapshot.downloaded = 0;
        snapshot.total = None;
        snapshot.last_error = None;
        snapshot.last_progress_emit_ms = 0;
    }
    cache::clear(app);
    emit_status(app);
    let handle = app.clone();
    let task = tauri::async_runtime::spawn(async move {
        let progress = handle.clone();
        let result = update
            .download(
                move |chunk, total| on_chunk(&progress, id, chunk, total),
                || {},
            )
            .await;
        finish_download(&handle, id, result);
    });
    *state
        .task
        .lock()
        .unwrap_or_else(|poison| poison.into_inner()) = Some(task);
    Ok(status(app))
}

pub fn cancel_download(app: &AppHandle) -> UpdateStatus {
    let state = app.state::<UpdaterState>();
    state.download_id.fetch_add(1, Ordering::SeqCst);
    if let Some(task) = state
        .task
        .lock()
        .unwrap_or_else(|poison| poison.into_inner())
        .take()
    {
        task.abort();
    }
    state.downloading.store(false, Ordering::SeqCst);
    {
        let mut snapshot = guard(&state.snapshot);
        if snapshot.phase == UpdatePhase::Downloading {
            snapshot.phase = if snapshot.version.is_some() {
                UpdatePhase::Available
            } else {
                UpdatePhase::Idle
            };
            snapshot.downloaded = 0;
            snapshot.total = None;
            snapshot.last_error = None;
        }
    }
    emit_status(app);
    status(app)
}

fn on_chunk(app: &AppHandle, id: u64, chunk: usize, total: Option<u64>) {
    let state = app.state::<UpdaterState>();
    if state.download_id.load(Ordering::SeqCst) != id {
        return;
    }
    let emit_now = {
        let mut snapshot = guard(&state.snapshot);
        if snapshot.phase != UpdatePhase::Downloading {
            return;
        }
        snapshot.downloaded += chunk as u64;
        if let Some(total) = total {
            snapshot.total = Some(total);
        }
        let now = now_ms();
        let emit = now - snapshot.last_progress_emit_ms >= PROGRESS_EMIT_MS;
        if emit {
            snapshot.last_progress_emit_ms = now;
        }
        emit
    };
    if emit_now {
        emit_status(app);
    }
}

fn finish_download(app: &AppHandle, id: u64, result: Result<Vec<u8>, tauri_plugin_updater::Error>) {
    let state = app.state::<UpdaterState>();
    if state.download_id.load(Ordering::SeqCst) != id {
        return;
    }
    state.downloading.store(false, Ordering::SeqCst);
    *state
        .task
        .lock()
        .unwrap_or_else(|poison| poison.into_inner()) = None;
    match result {
        Ok(bytes) => {
            let size = bytes.len() as u64;
            let version = {
                let mut pending = guard(&state.pending);
                pending.as_mut().map(|pending| {
                    pending.bytes = Some(bytes);
                    pending.update.version.clone()
                })
            };
            {
                let mut snapshot = guard(&state.snapshot);
                snapshot.phase = UpdatePhase::Ready;
                snapshot.downloaded = size;
                snapshot.total = Some(size);
                snapshot.last_error = None;
            }
            if let Some(version) = version {
                cache::save(app, &version);
                info!("update downloaded and verified");
            } else {
                set_failed(app, "download");
            }
        }
        Err(error) => {
            warn!("update download failed: {error}");
            set_failed(app, "download");
        }
    }
    emit_status(app);
}

pub fn install(app: &AppHandle) -> Result<(), String> {
    if !supported() {
        return Err("update.unsupported".to_owned());
    }
    let state = app.state::<UpdaterState>();
    let Some(Pending { update, bytes }) = state
        .pending
        .lock()
        .unwrap_or_else(|poison| poison.into_inner())
        .take()
    else {
        return Err("update.notReady".to_owned());
    };
    let Some(bytes) = bytes else {
        let mut slot = guard(&state.pending);
        *slot = Some(Pending {
            update,
            bytes: None,
        });
        return Err("update.notReady".to_owned());
    };
    {
        let mut snapshot = guard(&state.snapshot);
        snapshot.phase = UpdatePhase::Installing;
        snapshot.last_error = None;
    }
    emit_status(app);
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        let result = update.install(&bytes);
        match result {
            Ok(()) => {
                if let Some(state) = handle.try_state::<UpdaterState>() {
                    let mut snapshot = guard(&state.snapshot);
                    snapshot.phase = UpdatePhase::Idle;
                    snapshot.version = None;
                    snapshot.notes = None;
                    snapshot.downloaded = 0;
                    snapshot.total = None;
                }
                emit_status(&handle);
            }
            Err(error) => {
                warn!("update install failed: {error}");
                if let Some(state) = handle.try_state::<UpdaterState>() {
                    *state
                        .pending
                        .lock()
                        .unwrap_or_else(|poison| poison.into_inner()) = Some(Pending {
                        update,
                        bytes: Some(bytes),
                    });
                }
                set_failed(&handle, "install");
                emit_status(&handle);
            }
        }
    });
    Ok(())
}

pub fn skip_version(app: &AppHandle, version: Option<String>) -> Result<UpdateStatus, String> {
    let mut update = engine_host::get_settings(app)?.update;
    update.skipped_version = version;
    engine_host::set_update_settings(app, update)?;
    emit_status(app);
    Ok(status(app))
}

pub fn snooze(app: &AppHandle, hours: Option<u32>) -> Result<UpdateStatus, String> {
    let hours = hours.unwrap_or(DEFAULT_SNOOZE_HOURS).clamp(1, 24 * 7);
    let until = now_ms() + i64::from(hours) * 60 * 60 * 1000;
    let mut update = engine_host::get_settings(app)?.update;
    update.snooze_until_ms = Some(until);
    engine_host::set_update_settings(app, update)?;
    schedule_snooze_wake(app, until);
    emit_status(app);
    Ok(status(app))
}

fn schedule_snooze_wake(app: &AppHandle, until_ms: i64) {
    let delay_ms = (until_ms - now_ms()).max(0) as u64;
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_millis(delay_ms)).await;
        emit_status(&handle);
    });
}

/// Label for the tray, or `None` when no update row should be shown.
pub fn emit_status(app: &AppHandle) {
    let status = status(app);
    if let Err(error) = app.emit(STATUS_EVENT, &status) {
        warn!("failed to emit update status: {error}");
    }
    tray::refresh(app);
}
