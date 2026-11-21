use std::fs;
use std::path::{Path, PathBuf};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

/// Lets the user choose the workbook path before any generation happens.
/// `Ok(None)` means the save dialog was dismissed.
pub fn choose_path(
    app: &AppHandle,
    file_name: &str,
    title: &str,
    filter_name: &str,
) -> Result<Option<String>, String> {
    let Some(target) = choose_target(app, file_name, title, filter_name)? else {
        return Ok(None);
    };
    Ok(Some(
        with_xlsx_extension(target).to_string_lossy().into_owned(),
    ))
}

/// Decodes the renderer-built workbook and writes it to a chosen path.
pub fn write_workbook(path: &str, payload: &str) -> Result<(), String> {
    let bytes = decode_workbook(payload)?;
    fs::write(path, bytes).map_err(|error| format!("failed to write the workbook: {error}"))
}

fn decode_workbook(payload: &str) -> Result<Vec<u8>, String> {
    STANDARD
        .decode(payload)
        .map_err(|error| format!("invalid workbook payload: {error}"))
}

fn choose_target(
    app: &AppHandle,
    file_name: &str,
    title: &str,
    filter_name: &str,
) -> Result<Option<PathBuf>, String> {
    let suggested = suggested_file_name(file_name);
    let mut dialog = app
        .dialog()
        .file()
        .set_title(title)
        .set_file_name(suggested)
        .add_filter(filter_name, &["xlsx"]);
    if let Some(window) = app.get_webview_window("main") {
        dialog = dialog.set_parent(&window);
    }
    let Some(file) = dialog.blocking_save_file() else {
        return Ok(None);
    };
    file.into_path()
        .map(Some)
        .map_err(|error| format!("invalid save location: {error}"))
}

/// Keeps the suggested name a plain file name so the dialog cannot be pointed
/// at another directory by a malformed renderer value.
fn suggested_file_name(file_name: &str) -> String {
    Path::new(file_name)
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .unwrap_or("siderkit-break-export.xlsx")
        .to_owned()
}

fn with_xlsx_extension(mut path: PathBuf) -> PathBuf {
    let has_xlsx = path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("xlsx"));
    if !has_xlsx {
        path.set_extension("xlsx");
    }
    path
}

/// Opens the file manager with the exported workbook selected.
pub fn reveal(path: &str) -> Result<(), String> {
    let path = Path::new(path);
    if !path.is_file() {
        return Err("the exported workbook is no longer available".to_owned());
    }
    let mut command = file_manager_command(path)?;
    command
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "windows")]
fn file_manager_command(path: &Path) -> Result<std::process::Command, String> {
    use std::os::windows::process::CommandExt;

    let mut command = std::process::Command::new("explorer");
    command.raw_arg(format!("/select,\"{}\"", path.display()));
    Ok(command)
}

#[cfg(target_os = "macos")]
fn file_manager_command(path: &Path) -> Result<std::process::Command, String> {
    let mut command = std::process::Command::new("open");
    command.arg("-R").arg(path);
    Ok(command)
}

#[cfg(all(unix, not(target_os = "macos")))]
fn file_manager_command(path: &Path) -> Result<std::process::Command, String> {
    let folder = path
        .parent()
        .ok_or_else(|| "the exported workbook has no folder".to_owned())?;
    let mut command = std::process::Command::new("xdg-open");
    command.arg(folder);
    Ok(command)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_an_existing_xlsx_extension_in_any_case() {
        assert_eq!(
            with_xlsx_extension(PathBuf::from("report.XLSX")),
            PathBuf::from("report.XLSX")
        );
    }

    #[test]
    fn adds_or_replaces_the_extension() {
        assert_eq!(
            with_xlsx_extension(PathBuf::from("report")),
            PathBuf::from("report.xlsx")
        );
        assert_eq!(
            with_xlsx_extension(PathBuf::from("report.csv")),
            PathBuf::from("report.xlsx")
        );
    }

    #[test]
    fn a_suggested_name_never_contains_a_directory() {
        assert_eq!(
            suggested_file_name("../../escape.xlsx"),
            "escape.xlsx".to_owned()
        );
        assert_eq!(
            suggested_file_name(""),
            "siderkit-break-export.xlsx".to_owned()
        );
    }

    #[test]
    fn decodes_a_valid_payload() {
        assert_eq!(decode_workbook("UEsDBA=="), Ok(b"PK\x03\x04".to_vec()));
    }

    #[test]
    fn rejects_a_malformed_payload() {
        assert!(decode_workbook("not base64").is_err());
    }
}
