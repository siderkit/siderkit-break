//! Downloaded-update cache. The manifest and verified install bytes live side
//! by side so a restart can offer "restart to install" without another request.

use std::fs;
use std::path::{Path, PathBuf};

use log::{info, warn};
use tauri::{AppHandle, Manager};
use tauri_plugin_updater::UpdaterExt;

use super::model::{Pending, UpdatePhase, UpdaterState};

const CACHE_FOLDER: &str = "updates";

pub(super) fn save(app: &AppHandle, version: &str) {
    let Some(directory) = cache_dir(app) else {
        return;
    };
    let state = app.state::<UpdaterState>();
    let pending = state
        .pending
        .lock()
        .unwrap_or_else(|poison| poison.into_inner());
    let Some(pending) = pending.as_ref() else {
        return;
    };
    let Some(bytes) = pending.bytes.as_ref() else {
        return;
    };
    let Ok(raw_json) = serde_json::to_vec(&pending.update.raw_json) else {
        warn!("failed to serialize the update manifest for the cache");
        return;
    };
    if let Err(error) = fs::create_dir_all(&directory) {
        warn!("failed to create the update cache directory: {error}");
        return;
    }
    clear(app);
    let json_path = directory.join(format!("{version}.json"));
    let binary_path = directory.join(format!("{version}.bin"));
    if let Err(error) = fs::write(&json_path, raw_json) {
        warn!("failed to cache the update manifest: {error}");
        return;
    }
    if let Err(error) = fs::write(&binary_path, bytes) {
        warn!("failed to cache the update package: {error}");
        let _ = fs::remove_file(&json_path);
    }
}

pub(super) fn clear(app: &AppHandle) {
    let Some(directory) = cache_dir(app) else {
        return;
    };
    for path in files(&directory) {
        let _ = fs::remove_file(path);
    }
}

pub(super) fn restore(app: &AppHandle, state: &UpdaterState) {
    let Some(directory) = cache_dir(app) else {
        return;
    };
    for path in files(&directory) {
        if path.extension().and_then(|extension| extension.to_str()) != Some("json") {
            continue;
        }
        let Ok(raw) = fs::read(&path) else {
            continue;
        };
        let Ok(raw_json) = serde_json::from_slice::<serde_json::Value>(&raw) else {
            continue;
        };
        let Ok(updater) = app.updater() else {
            continue;
        };
        let Ok(Some(update)) = updater.restore_update(raw_json) else {
            continue;
        };
        let binary = path.with_extension("bin");
        let Ok(bytes) = fs::read(&binary) else {
            continue;
        };
        if update.verify(&bytes).is_err() {
            warn!("the cached update package failed signature verification");
            continue;
        }
        let size = bytes.len() as u64;
        let version = update.version.clone();
        let notes = update.body.clone();
        let pub_date = update.date.map(|date| date.to_string());
        {
            let mut snapshot = state
                .snapshot
                .lock()
                .unwrap_or_else(|poison| poison.into_inner());
            snapshot.phase = UpdatePhase::Ready;
            snapshot.version = Some(version);
            snapshot.notes = notes;
            snapshot.pub_date = pub_date;
            snapshot.downloaded = size;
            snapshot.total = Some(size);
            snapshot.last_error = None;
        }
        *state
            .pending
            .lock()
            .unwrap_or_else(|poison| poison.into_inner()) = Some(Pending {
            update,
            bytes: Some(bytes),
        });
        info!("restored a downloaded update from the cache");
        return;
    }
    clear(app);
}

fn cache_dir(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_cache_dir()
        .ok()
        .map(|directory| directory.join(CACHE_FOLDER))
}

fn files(directory: &Path) -> Vec<PathBuf> {
    let Ok(entries) = fs::read_dir(directory) else {
        return Vec::new();
    };
    entries
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| path.is_file())
        .collect()
}
