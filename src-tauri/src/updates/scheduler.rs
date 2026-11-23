//! Background check loop. The first check waits for the app to settle; later
//! checks follow the fixed interval or wake early when settings change.

use std::time::Duration;

use tauri::{AppHandle, Manager};

use super::check;
use super::model::UpdaterState;
use crate::engine_host;

const STARTUP_DELAY_SECS: u64 = 30;
const CHECK_INTERVAL_SECS: u64 = 6 * 60 * 60;

pub(super) fn spawn(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_secs(startup_delay_secs())).await;
        loop {
            if auto_check(&app) {
                let _ = check(&app, false).await;
            }
            let wake = app.state::<UpdaterState>().wake.clone();
            tokio::select! {
                _ = tokio::time::sleep(Duration::from_secs(check_interval_secs())) => {}
                _ = wake.notified() => {}
            }
        }
    });
}

fn auto_check(app: &AppHandle) -> bool {
    engine_host::get_settings(app)
        .map(|settings| settings.update.auto_check)
        .unwrap_or(true)
}

fn startup_delay_secs() -> u64 {
    std::env::var("SIDERKIT_UPDATE_STARTUP_SECS")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(STARTUP_DELAY_SECS)
}

fn check_interval_secs() -> u64 {
    std::env::var("SIDERKIT_UPDATE_INTERVAL_SECS")
        .ok()
        .and_then(|value| value.parse().ok())
        .filter(|value| *value > 0)
        .unwrap_or(CHECK_INTERVAL_SECS)
}
