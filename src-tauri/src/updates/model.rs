//! Wire types, in-memory snapshots, and prompt rules for the updater.

use std::sync::atomic::{AtomicBool, AtomicU64};
use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tauri_plugin_updater::Update;
use tokio::sync::Notify;

use crate::settings::UpdateSettings;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum UpdatePhase {
    Idle,
    Checking,
    Available,
    Downloading,
    Ready,
    Installing,
    UpToDate,
    Failed,
}

/// What the renderer sees. `prompt` is false while a version is skipped or
/// postponed, but the tray can still report the available update.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStatus {
    pub supported: bool,
    pub phase: UpdatePhase,
    pub version: Option<String>,
    pub notes: Option<String>,
    pub pub_date: Option<String>,
    pub downloaded: u64,
    pub total: Option<u64>,
    pub last_checked_ms: Option<i64>,
    pub last_error: Option<String>,
    pub prompt: bool,
    pub auto_check: bool,
    pub skipped_version: Option<String>,
    pub snooze_until_ms: Option<i64>,
}

#[derive(Debug, Clone)]
pub(super) struct Snapshot {
    pub(super) phase: UpdatePhase,
    pub(super) version: Option<String>,
    pub(super) notes: Option<String>,
    pub(super) pub_date: Option<String>,
    pub(super) downloaded: u64,
    pub(super) total: Option<u64>,
    pub(super) last_checked_ms: Option<i64>,
    pub(super) last_error: Option<String>,
    pub(super) last_progress_emit_ms: i64,
}

impl Default for Snapshot {
    fn default() -> Self {
        Self {
            phase: UpdatePhase::Idle,
            version: None,
            notes: None,
            pub_date: None,
            downloaded: 0,
            total: None,
            last_checked_ms: None,
            last_error: None,
            last_progress_emit_ms: 0,
        }
    }
}

/// The checked update and, once downloaded, its verified installer bytes.
pub(super) struct Pending {
    pub(super) update: Update,
    pub(super) bytes: Option<Vec<u8>>,
}

pub(super) struct UpdaterState {
    pub(super) snapshot: Mutex<Snapshot>,
    pub(super) pending: Mutex<Option<Pending>>,
    pub(super) task: Mutex<Option<tauri::async_runtime::JoinHandle<()>>>,
    pub(super) checking: AtomicBool,
    pub(super) downloading: AtomicBool,
    pub(super) download_id: AtomicU64,
    pub(super) wake: Arc<Notify>,
}

impl Default for UpdaterState {
    fn default() -> Self {
        Self {
            snapshot: Mutex::new(Snapshot::default()),
            pending: Mutex::new(None),
            task: Mutex::new(None),
            checking: AtomicBool::new(false),
            downloading: AtomicBool::new(false),
            download_id: AtomicU64::new(0),
            wake: Arc::new(Notify::new()),
        }
    }
}

pub(super) fn should_prompt(snapshot: &Snapshot, settings: &UpdateSettings, now: i64) -> bool {
    if !matches!(snapshot.phase, UpdatePhase::Available | UpdatePhase::Ready) {
        return false;
    }
    let Some(version) = snapshot.version.as_deref() else {
        return false;
    };
    if settings.skipped_version.as_deref() == Some(version) {
        return false;
    }
    if settings.snooze_until_ms.is_some_and(|until| now < until) {
        return false;
    }
    true
}

pub(super) fn supported() -> bool {
    cfg!(target_os = "windows")
}

pub(super) fn set_failed(app: &AppHandle, code: &str) {
    let state = app.state::<UpdaterState>();
    let mut snapshot = state
        .snapshot
        .lock()
        .unwrap_or_else(|poison| poison.into_inner());
    snapshot.phase = UpdatePhase::Failed;
    snapshot.last_error = Some(code.to_owned());
    snapshot.downloaded = 0;
    snapshot.total = None;
}
