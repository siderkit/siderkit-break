use tauri::{AppHandle, Manager};

use crate::db::{History, HistoryRangeSummary, HistoryWindow, InsightsPayload, TodaySummary};
use crate::engine_host;
use crate::locate;
use crate::settings::Settings;
use crate::shell;
use crate::timer::TimerSnapshot;
use crate::updates::{self, UpdateStatus};

#[tauri::command]
pub fn get_state(app: AppHandle) -> Result<TimerSnapshot, String> {
    engine_host::get_state(&app)
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<Settings, String> {
    engine_host::get_settings(&app)
}

#[tauri::command]
pub fn update_settings(app: AppHandle, settings: Settings) -> Result<Settings, String> {
    engine_host::update_settings(&app, settings)
}

#[tauri::command]
pub fn get_update_status(app: AppHandle) -> UpdateStatus {
    updates::status(&app)
}

#[tauri::command]
pub async fn check_for_update(
    app: AppHandle,
    manual: Option<bool>,
) -> Result<UpdateStatus, String> {
    Ok(updates::check(&app, manual.unwrap_or(false)).await)
}

#[tauri::command]
pub fn download_update(app: AppHandle) -> Result<UpdateStatus, String> {
    updates::start_download(&app)
}

#[tauri::command]
pub fn cancel_update_download(app: AppHandle) -> UpdateStatus {
    updates::cancel_download(&app)
}

#[tauri::command]
pub fn install_update(app: AppHandle) -> Result<(), String> {
    updates::install(&app)
}

#[tauri::command]
pub fn skip_update_version(app: AppHandle, version: String) -> Result<UpdateStatus, String> {
    updates::skip_version(&app, Some(version))
}

#[tauri::command]
pub fn clear_skipped_update(app: AppHandle) -> Result<UpdateStatus, String> {
    updates::skip_version(&app, None)
}

#[tauri::command]
pub fn snooze_update(app: AppHandle, hours: Option<u32>) -> Result<UpdateStatus, String> {
    updates::snooze(&app, hours)
}

#[tauri::command]
pub fn reset_metrics_id(app: AppHandle) -> Result<(), String> {
    crate::metrics::reset(&app)
}

#[tauri::command]
pub fn start_focus(app: AppHandle) -> Result<TimerSnapshot, String> {
    engine_host::start(&app)
}

#[tauri::command]
pub fn start_countdown(app: AppHandle, minutes: u32) -> Result<TimerSnapshot, String> {
    engine_host::start_countdown(&app, minutes)
}

#[tauri::command]
pub fn pause(app: AppHandle) -> Result<TimerSnapshot, String> {
    engine_host::pause(&app)
}

#[tauri::command]
pub fn resume(app: AppHandle) -> Result<TimerSnapshot, String> {
    engine_host::resume(&app)
}

#[tauri::command]
pub fn skip(app: AppHandle) -> Result<TimerSnapshot, String> {
    engine_host::skip(&app)
}

#[tauri::command]
pub fn reset(app: AppHandle) -> Result<TimerSnapshot, String> {
    engine_host::reset(&app)
}

#[tauri::command]
pub fn postpone_break(app: AppHandle, minutes: Option<u32>) -> Result<TimerSnapshot, String> {
    engine_host::postpone_break(&app, minutes.unwrap_or(5))
}

#[tauri::command]
pub fn set_overlay_visible(app: AppHandle, visible: bool) -> Result<(), String> {
    engine_host::set_overlay_visible(&app, visible)
}

/// Flashes the "I'm here" hint around the floating ball.
#[tauri::command]
pub fn locate_overlay(app: AppHandle) -> Result<(), String> {
    locate::show(&app)
}

#[tauri::command]
pub fn save_overlay_position(app: AppHandle) {
    crate::overlay::save_overlay_position(&app);
}

#[tauri::command]
pub fn begin_overlay_drag(app: AppHandle) -> Result<(), String> {
    shell::begin_overlay_drag(&app)
}

#[tauri::command]
pub fn end_overlay_drag(app: AppHandle) {
    shell::end_overlay_drag(&app);
}

#[tauri::command]
pub fn show_overlay_menu(app: AppHandle) -> Result<(), String> {
    crate::tray::show_overlay_menu(&app)
}

/// Shows the app menu where the pointer is. `editable` adds the edit verbs
/// when the pointer is over a text field.
#[tauri::command]
pub fn show_context_menu(window: tauri::WebviewWindow, editable: bool) -> Result<(), String> {
    crate::context_menu::show(&window, editable)
}

#[tauri::command]
pub fn open_project_page() -> Result<(), String> {
    crate::links::open_project_page()
}

#[tauri::command]
pub fn open_privacy_page() -> Result<(), String> {
    crate::links::open_privacy_page()
}

#[tauri::command]
pub fn reset_overlay_position(app: AppHandle) -> Result<(), String> {
    crate::overlay::reset_overlay_position(&app)
}

#[tauri::command]
pub fn preview_notification_sound(app: AppHandle) -> Result<(), String> {
    crate::reminder::preview(&app, None, None)
}

/// Auditions one timbre from the sound list without changing the saved preset.
#[tauri::command]
pub fn preview_sound(
    app: AppHandle,
    preset: Option<crate::settings::SoundPreset>,
    volume: Option<u8>,
) -> Result<(), String> {
    crate::reminder::preview(&app, preset, volume)
}

#[tauri::command]
pub fn get_notice(app: AppHandle) -> Option<crate::reminder::TimerNotice> {
    engine_host::notice(&app)
}

#[tauri::command]
pub fn dismiss_notice(app: AppHandle) -> Result<(), String> {
    engine_host::dismiss_notice(&app)
}

#[tauri::command]
pub fn show_main_window(app: AppHandle) {
    shell::show_main_window(&app);
}

#[tauri::command]
pub fn hide_break_card(app: AppHandle) {
    shell::hide_break_card(&app);
}

/// Grows or shrinks the break card window to the measured card size.
#[tauri::command]
pub fn fit_break_card(app: AppHandle, width: f64, height: f64) -> Result<(), String> {
    shell::resize_break_card(&app, width, height)
}

/// Sizes the countdown window to the measured label width.
#[tauri::command]
pub fn fit_overlay(app: AppHandle, width: f64) -> Result<(), String> {
    shell::resize_overlay(&app, width)
}

#[tauri::command]
pub fn get_today_summary(app: AppHandle) -> Result<TodaySummary, String> {
    engine_host::get_today_summary(&app)
}

#[tauri::command]
pub fn get_history(app: AppHandle) -> Result<crate::db::History, String> {
    engine_host::get_history(&app)
}

/// Loads one continuous-scroll slice of history.
#[tauri::command]
pub fn get_history_window(
    app: AppHandle,
    from_ms: i64,
    to_ms: i64,
) -> Result<HistoryWindow, String> {
    let state = app.state::<engine_host::AppState>();
    let store = engine_host::lock_store(&state)?;
    store
        .history_window(from_ms, to_ms)
        .map_err(|error| error.to_string())
}

/// Loads the exact range selected for an Excel export.
#[tauri::command]
pub fn get_history_range(app: AppHandle, from_ms: i64, to_ms: i64) -> Result<History, String> {
    let state = app.state::<engine_host::AppState>();
    let store = engine_host::lock_store(&state)?;
    store
        .history_between(from_ms, to_ms)
        .map_err(|error| error.to_string())
}

/// Counts and totals a range without transferring its sessions.
#[tauri::command]
pub fn get_history_range_summary(
    app: AppHandle,
    from_ms: i64,
    to_ms: i64,
) -> Result<HistoryRangeSummary, String> {
    let state = app.state::<engine_host::AppState>();
    let store = engine_host::lock_store(&state)?;
    store
        .history_range_summary(from_ms, to_ms)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn export_data(app: AppHandle) -> Result<String, String> {
    engine_host::export_data(&app)
}

/// Aggregates one Insights range in Rust so the UI never receives raw rows.
#[tauri::command]
pub fn get_insights(app: AppHandle, range: String) -> Result<InsightsPayload, String> {
    let state = app.state::<engine_host::AppState>();
    let store = engine_host::lock_store(&state)?;
    store.insights(&range).map_err(|error| error.to_string())
}

/// Returns the most recently used tags, newest first.
#[tauri::command]
pub fn get_recent_tags(app: AppHandle, limit: Option<usize>) -> Result<Vec<String>, String> {
    let state = app.state::<engine_host::AppState>();
    let store = engine_host::lock_store(&state)?;
    store
        .recent_tags(limit.unwrap_or(3).clamp(1, 20))
        .map_err(|error| error.to_string())
}

/// Saves or clears a session tag; blank input clears it.
#[tauri::command]
pub fn set_session_tag(
    app: AppHandle,
    session_id: String,
    tag: Option<String>,
) -> Result<bool, String> {
    let state = app.state::<engine_host::AppState>();
    let store = engine_host::lock_store(&state)?;
    store
        .set_session_tag(&session_id, tag.as_deref())
        .map_err(|error| error.to_string())
}

/// Permanently deletes every session after the confirmation in Settings.
#[tauri::command]
pub fn clear_history(app: AppHandle) -> Result<u32, String> {
    let state = app.state::<engine_host::AppState>();
    let store = engine_host::lock_store(&state)?;
    store.clear_history().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_diagnostics(app: AppHandle) -> Result<crate::diagnostics::Diagnostics, String> {
    crate::diagnostics::collect(&app)
}

#[tauri::command]
pub fn clear_logs(app: AppHandle) -> Result<(), String> {
    crate::diagnostics::clear_logs(&app)
}

#[tauri::command]
pub fn open_log_dir(app: AppHandle) -> Result<(), String> {
    crate::diagnostics::open_log_dir(&app)
}

/// Validates and imports a custom reminder sound, returning its stored path.
#[tauri::command]
pub async fn choose_custom_sound(app: AppHandle) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        use tauri_plugin_dialog::DialogExt;
        let Some(file) = app
            .dialog()
            .file()
            .add_filter("Audio", &["wav", "mp3", "ogg", "flac", "m4a"])
            .blocking_pick_file()
        else {
            return Ok(None);
        };
        let path = file.into_path().map_err(|error| error.to_string())?;
        crate::sound::import_custom(&app, &path).map(Some)
    })
    .await
    .map_err(|error| error.to_string())?
}

/// Shows the save dialog before any workbook work starts.
#[tauri::command]
pub async fn choose_history_workbook_path(
    app: AppHandle,
    file_name: String,
    title: String,
    filter_name: String,
) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        crate::export::choose_path(&app, &file_name, &title, &filter_name)
    })
    .await
    .map_err(|error| error.to_string())?
}

/// Writes the renderer-built workbook to the path the user already chose.
#[tauri::command]
pub async fn write_history_workbook(path: String, payload: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || crate::export::write_workbook(&path, &payload))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn reveal_history_workbook(path: String) -> Result<(), String> {
    crate::export::reveal(&path)
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    engine_host::quit(&app);
}
