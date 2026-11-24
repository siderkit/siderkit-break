//! Read-only support data for the Data & Privacy screen. Nothing here is sent
//! anywhere; the user copies it themselves.

use std::fs;
use std::path::{Path, PathBuf};

use log::warn;
use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::engine_host::AppState;
use crate::settings::{Palette, Theme, WindowMode};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Diagnostics {
    pub version: String,
    pub os: String,
    pub arch: String,
    pub webview: String,
    pub locale: String,
    pub theme: String,
    pub palette: String,
    pub window_mode: String,
    pub log_dir: String,
    pub log_size: u64,
    pub recent_logs: Vec<String>,
}

/// Collects the diagnostics block shown and copied from Settings.
pub fn collect(app: &AppHandle) -> Result<Diagnostics, String> {
    let state = app.state::<AppState>();
    let settings = state
        .settings
        .lock()
        .map_err(|_| "settings are unavailable".to_owned())?
        .clone();
    let log_dir = log_dir(app)?;
    Ok(Diagnostics {
        version: app.package_info().version.to_string(),
        os: std::env::consts::OS.to_owned(),
        arch: std::env::consts::ARCH.to_owned(),
        webview: tauri::webview_version().unwrap_or_else(|_| "unknown".to_owned()),
        locale: settings
            .general
            .locale
            .unwrap_or_else(|| "system".to_owned()),
        theme: theme_name(settings.general.theme).to_owned(),
        palette: palette_name(settings.general.palette).to_owned(),
        window_mode: window_mode_name(settings.general.window_mode).to_owned(),
        log_dir: redact_home(app, &log_dir),
        log_size: directory_size(&log_dir),
        recent_logs: recent_warnings(&log_dir, 50),
    })
}

/// Deletes log files while leaving the directory in place.
pub fn clear_logs(app: &AppHandle) -> Result<(), String> {
    let directory = log_dir(app)?;
    let entries = fs::read_dir(&directory).map_err(|error| error.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            if let Err(error) = fs::remove_file(&path) {
                warn!("failed to remove log file {}: {error}", path.display());
            }
        }
    }
    Ok(())
}

/// Opens the log directory in the platform file manager.
pub fn open_log_dir(app: &AppHandle) -> Result<(), String> {
    let directory = log_dir(app)?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let mut command = if cfg!(target_os = "windows") {
        let mut command = std::process::Command::new("explorer");
        command.arg(&directory);
        command
    } else if cfg!(target_os = "macos") {
        let mut command = std::process::Command::new("open");
        command.arg(&directory);
        command
    } else {
        let mut command = std::process::Command::new("xdg-open");
        command.arg(&directory);
        command
    };
    command
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

fn log_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path().app_log_dir().map_err(|error| error.to_string())
}

fn directory_size(directory: &PathBuf) -> u64 {
    let Ok(entries) = fs::read_dir(directory) else {
        return 0;
    };
    entries
        .flatten()
        .filter_map(|entry| entry.metadata().ok())
        .filter(|metadata| metadata.is_file())
        .map(|metadata| metadata.len())
        .sum()
}

fn recent_warnings(directory: &PathBuf, limit: usize) -> Vec<String> {
    let Ok(entries) = fs::read_dir(directory) else {
        return Vec::new();
    };
    let mut files: Vec<PathBuf> = entries
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| path.extension().is_some_and(|extension| extension == "log"))
        .collect();
    files.sort();
    let Some(newest) = files.last() else {
        return Vec::new();
    };
    let Ok(text) = fs::read_to_string(newest) else {
        return Vec::new();
    };
    let mut lines: Vec<String> = text
        .lines()
        .filter(|line| line.contains(" WARN ") || line.contains(" ERROR "))
        .map(str::to_owned)
        .collect();
    if lines.len() > limit {
        lines.drain(..lines.len() - limit);
    }
    lines
}

fn redact_home(app: &AppHandle, path: &Path) -> String {
    let text = path.display().to_string();
    match app.path().home_dir() {
        Ok(home) => text.replace(&home.display().to_string(), "~"),
        Err(_) => text,
    }
}

fn theme_name(theme: Theme) -> &'static str {
    match theme {
        Theme::System => "System",
        Theme::Light => "Light",
        Theme::Dark => "Dark",
    }
}

fn palette_name(palette: Palette) -> &'static str {
    match palette {
        Palette::Forest => "Forest",
        Palette::Ocean => "Ocean",
        Palette::Ember => "Ember",
        Palette::Plum => "Plum",
        Palette::Slate => "Slate",
        Palette::Rose => "Rose",
        Palette::Aurora => "Aurora",
        Palette::Sand => "Sand",
        Palette::Moss => "Moss",
        Palette::Ink => "Ink",
        Palette::Dusk => "Dusk",
        Palette::Clay => "Clay",
    }
}

fn window_mode_name(mode: WindowMode) -> &'static str {
    match mode {
        WindowMode::Standard => "Standard",
        WindowMode::Compact => "Compact",
    }
}
