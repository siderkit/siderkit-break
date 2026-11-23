//! Tray row text for an available or downloaded update.

use tauri::AppHandle;

use super::model::{supported, UpdatePhase};
use super::status;
use crate::i18n::translate;

pub fn label(app: &AppHandle, locale: &str) -> Option<String> {
    if !supported() {
        return None;
    }
    let status = status(app);
    let version = status.version?;
    if status.skipped_version.as_deref() == Some(version.as_str()) {
        return None;
    }
    let key = match status.phase {
        UpdatePhase::Available | UpdatePhase::Downloading | UpdatePhase::Failed => {
            "update.tray.available"
        }
        UpdatePhase::Ready => "update.tray.ready",
        _ => return None,
    };
    Some(translate(locale, key).replace("{version}", &version))
}
