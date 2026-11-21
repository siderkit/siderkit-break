use tauri::{AppHandle, Manager};

use crate::db::{History, HistoryRangeSummary, HistoryWindow, TodaySummary};
use crate::engine_host;
use crate::locate;
use crate::settings::Settings;
use crate::shell;
use crate::timer::TimerSnapshot;

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

#[tauri::command]
pub fn open_project_page() -> Result<(), String> {
    crate::shell::open_project_page()
}

#[tauri::command]
pub fn preview_notification_sound(app: AppHandle) -> Result<(), String> {
    crate::notifications::preview(&app)
}

#[tauri::command]
pub fn dismiss_countdown_notice(app: AppHandle) -> Result<(), String> {
    engine_host::dismiss_countdown_notice(&app)
}

#[tauri::command]
pub fn show_main_window(app: AppHandle) {
    shell::show_main_window(&app);
}

#[tauri::command]
pub fn hide_break_card(app: AppHandle) {
    shell::hide_break_card(&app);
}

/// Grows or shrinks the break card window to the measured card height.
#[tauri::command]
pub fn fit_break_card(app: AppHandle, height: f64) -> Result<(), String> {
    shell::resize_break_card(&app, height)
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
