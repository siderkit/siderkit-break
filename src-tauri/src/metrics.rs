//! Anonymous install identity and aggregate metrics.
//!
//! A random UUID is created once and stored in the app data directory. It is
//! sent only on update checks and on a one-time install beacon, and only while
//! the "anonymous usage counts" preference is on. The ID is not derived from
//! hardware, the network, or an account, and deleting the file resets it.

use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;

use log::{info, warn};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

pub const INSTALL_HEADER: &str = "X-Siderkit-Install";
const IDENTITY_FILE: &str = "metrics.json";
const BEACON_URL: &str = "https://dl.siderkit.com/siderkit-break/i";
const BEACON_TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Identity {
    install_id: String,
    install_reported: bool,
}

impl Identity {
    fn new() -> Self {
        Self {
            install_id: Uuid::new_v4().to_string(),
            install_reported: false,
        }
    }
}

pub struct MetricsState {
    path: Option<PathBuf>,
    identity: Mutex<Identity>,
}

pub fn initialize(app: &AppHandle) {
    let path = identity_path(app);
    let identity = path.as_deref().and_then(read_identity).unwrap_or_else(|| {
        let identity = Identity::new();
        if let Some(path) = path.as_deref() {
            if let Err(error) = write_identity(path, &identity) {
                warn!("failed to persist the anonymous install ID: {error}");
            }
        }
        identity
    });
    app.manage(MetricsState {
        path,
        identity: Mutex::new(identity),
    });
}

/// Returns the install ID only while the user allows anonymous counts.
pub fn install_id(app: &AppHandle) -> Option<String> {
    if !enabled(app) {
        return None;
    }
    let state = app.try_state::<MetricsState>()?;
    let identity = state
        .identity
        .lock()
        .unwrap_or_else(|poison| poison.into_inner());
    Some(identity.install_id.clone())
}

/// Sends the install beacon once. A failed attempt is retried on the next start.
pub fn report_install(app: &AppHandle) {
    let Some(install_id) = install_id(app) else {
        return;
    };
    let pending = {
        let Some(state) = app.try_state::<MetricsState>() else {
            return;
        };
        let identity = state
            .identity
            .lock()
            .unwrap_or_else(|poison| poison.into_inner());
        !identity.install_reported
    };
    if !pending {
        return;
    }
    let version = app.package_info().version.to_string();
    let os = std::env::consts::OS.to_owned();
    let arch = std::env::consts::ARCH.to_owned();
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        match send_beacon(&install_id, &version, &os, &arch).await {
            Ok(()) => {
                mark_reported(&handle);
                info!("install beacon sent");
            }
            Err(error) => warn!("install beacon failed: {error}"),
        }
    });
}

/// Issues a fresh random ID and reports it again if counts are enabled.
pub fn reset(app: &AppHandle) -> Result<(), String> {
    let state = app
        .try_state::<MetricsState>()
        .ok_or_else(|| "metrics state is missing".to_owned())?;
    let mut identity = state
        .identity
        .lock()
        .unwrap_or_else(|poison| poison.into_inner());
    *identity = Identity::new();
    if let Some(path) = state.path.as_deref() {
        write_identity(path, &identity)?;
    }
    drop(identity);
    report_install(app);
    Ok(())
}

fn enabled(app: &AppHandle) -> bool {
    crate::engine_host::get_settings(app)
        .map(|settings| settings.update.metrics)
        .unwrap_or(true)
}

fn identity_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_data_dir()
        .ok()
        .map(|directory| directory.join(IDENTITY_FILE))
}

fn read_identity(path: &std::path::Path) -> Option<Identity> {
    let raw = fs::read_to_string(path).ok()?;
    let identity: Identity = serde_json::from_str(&raw).ok()?;
    Uuid::parse_str(&identity.install_id).ok()?;
    Some(identity)
}

fn write_identity(path: &std::path::Path, identity: &Identity) -> Result<(), String> {
    if let Some(directory) = path.parent() {
        fs::create_dir_all(directory).map_err(|error| error.to_string())?;
    }
    let raw = serde_json::to_string_pretty(identity).map_err(|error| error.to_string())?;
    fs::write(path, format!("{raw}\n")).map_err(|error| error.to_string())
}

fn mark_reported(app: &AppHandle) {
    let Some(state) = app.try_state::<MetricsState>() else {
        return;
    };
    let mut identity = state
        .identity
        .lock()
        .unwrap_or_else(|poison| poison.into_inner());
    identity.install_reported = true;
    if let Some(path) = state.path.as_deref() {
        if let Err(error) = write_identity(path, &identity) {
            warn!("failed to persist the install beacon state: {error}");
        }
    }
}

async fn send_beacon(install_id: &str, version: &str, os: &str, arch: &str) -> Result<(), String> {
    // reqwest is built without a bundled cryptography provider, so install the
    // ring provider once before the first TLS client is created.
    let _ = rustls::crypto::ring::default_provider().install_default();
    let client = reqwest::Client::builder()
        .timeout(BEACON_TIMEOUT)
        .user_agent(format!("Siderkit-Break/{version}"))
        .build()
        .map_err(|error| error.to_string())?;
    let response = client
        .get(beacon_url(version, os, arch))
        .header(INSTALL_HEADER, install_id)
        .send()
        .await
        .map_err(|error| error.to_string())?;
    if response.status().is_success() {
        Ok(())
    } else {
        Err(format!("beacon returned HTTP {}", response.status()))
    }
}

fn beacon_url(version: &str, os: &str, arch: &str) -> String {
    let mut url = reqwest::Url::parse(BEACON_URL).expect("the beacon URL is valid");
    url.query_pairs_mut()
        .append_pair("v", version)
        .append_pair("os", os)
        .append_pair("a", arch);
    url.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_new_identity_is_a_random_unreported_uuid() {
        let identity = Identity::new();
        assert!(Uuid::parse_str(&identity.install_id).is_ok());
        assert!(!identity.install_reported);
    }

    #[test]
    fn two_identities_differ() {
        assert_ne!(Identity::new().install_id, Identity::new().install_id);
    }

    #[test]
    fn the_identity_round_trips_through_json() {
        let identity = Identity::new();
        let raw = serde_json::to_string(&identity).expect("serialize");
        let parsed: Identity = serde_json::from_str(&raw).expect("parse");
        assert_eq!(parsed.install_id, identity.install_id);
        assert_eq!(parsed.install_reported, identity.install_reported);
    }

    #[test]
    fn the_beacon_url_carries_the_version_and_platform() {
        let url = beacon_url("1.0.0-rc.1", "windows", "x86_64");
        assert!(url.starts_with("https://dl.siderkit.com/siderkit-break/i?"));
        assert!(url.contains("v=1.0.0-rc.1"));
        assert!(url.contains("os=windows"));
        assert!(url.contains("a=x86_64"));
    }
}
