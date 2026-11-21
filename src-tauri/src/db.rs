use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use log::warn;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::settings::{OverlayPosition, Settings};
use crate::timer::{SessionKind, SessionOutcome, SessionRecord, TimerSnapshot};

mod schema;
#[cfg(test)]
use schema::BASE_SCHEMA;
use schema::SCHEMA_VERSION;

#[derive(Debug, Error)]
pub enum StoreError {
    #[error("database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("file system error: {0}")]
    Io(#[from] std::io::Error),
    #[error("settings data is invalid: {0}")]
    Json(#[from] serde_json::Error),
    #[error("the database schema version {0} is newer than this app")]
    UnsupportedSchema(i64),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TodaySummary {
    pub completed_focus: u32,
    pub focus_ms: u64,
    pub completed_countdown: u32,
    pub countdown_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistorySession {
    pub id: String,
    pub kind: SessionKind,
    pub started_at_ms: i64,
    pub ended_at_ms: i64,
    pub planned_ms: u64,
    pub actual_ms: u64,
    pub outcome: SessionOutcome,
    pub interruptions: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryDay {
    pub date: String,
    pub completed_focus: u32,
    pub focus_ms: u64,
    pub completed_countdown: u32,
    pub countdown_ms: u64,
    pub break_count: u32,
    pub break_ms: u64,
    pub sessions: Vec<HistorySession>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct History {
    pub days: Vec<HistoryDay>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryWindow {
    pub days: Vec<HistoryDay>,
    pub has_more: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryRangeSummary {
    pub sessions: u32,
    pub days: u32,
    pub focus_ms: u64,
    pub break_ms: u64,
    pub countdown_ms: u64,
}

pub struct Store {
    connection: Connection,
    path: Option<PathBuf>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
struct StoredSettings {
    overlay: StoredOverlay,
}

#[derive(Debug, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
struct StoredOverlay {
    position: Option<OverlayPosition>,
}

fn stored_overlay_position(json: &str) -> Option<OverlayPosition> {
    serde_json::from_str::<StoredSettings>(json)
        .ok()
        .and_then(|stored| stored.overlay.position)
}

impl Store {
    pub fn open(path: &Path) -> Result<Self, StoreError> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let connection = Connection::open(path)?;
        connection.busy_timeout(Duration::from_secs(5))?;
        connection.pragma_update(None, "journal_mode", "WAL")?;
        let store = Self {
            connection,
            path: Some(path.to_path_buf()),
        };
        store.migrate()?;
        Ok(store)
    }

    pub fn load_settings(&self) -> Result<Settings, StoreError> {
        let value: Option<String> = self
            .connection
            .query_row(
                "SELECT value_json FROM settings WHERE key = 'app'",
                [],
                |row| row.get(0),
            )
            .optional()?;
        match value {
            Some(json) => match serde_json::from_str::<Settings>(&json) {
                Ok(mut settings) => {
                    // `OverlaySettings` ignores the position when deserialized
                    // so UI payloads cannot move the overlay. The stored copy is
                    // still the only place the Rust-owned position lives, so it
                    // is read back here explicitly.
                    settings.overlay.position = stored_overlay_position(&json);
                    Ok(settings.normalized())
                }
                Err(error) => {
                    warn!("stored settings are unreadable, using defaults: {error}");
                    Ok(Settings::default())
                }
            },
            None => Ok(Settings::default()),
        }
    }

    pub fn save_settings(&self, settings: &Settings) -> Result<(), StoreError> {
        let json = serde_json::to_string(settings)?;
        self.connection.execute(
            "INSERT INTO settings (key, value_json, updated_at, rev) VALUES ('app', ?1, ?2, 1)
             ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json,
             updated_at = excluded.updated_at, rev = settings.rev + 1",
            params![json, now_ms()],
        )?;
        Ok(())
    }

    pub fn load_runtime(&self) -> Result<Option<TimerSnapshot>, StoreError> {
        let json: Option<String> = self
            .connection
            .query_row(
                "SELECT value_json FROM runtime_state WHERE id = 1",
                [],
                |row| row.get(0),
            )
            .optional()?;
        match json {
            Some(value) => match serde_json::from_str(&value) {
                Ok(snapshot) => Ok(Some(snapshot)),
                Err(error) => {
                    warn!("stored runtime state is unreadable, starting fresh: {error}");
                    Ok(None)
                }
            },
            None => Ok(None),
        }
    }

    pub fn save_runtime(&self, snapshot: &TimerSnapshot) -> Result<(), StoreError> {
        let json = serde_json::to_string(snapshot)?;
        self.connection.execute(
            "INSERT INTO runtime_state (id, value_json, updated_at) VALUES (1, ?1, ?2)
             ON CONFLICT(id) DO UPDATE SET value_json = excluded.value_json,
             updated_at = excluded.updated_at",
            params![json, now_ms()],
        )?;
        Ok(())
    }

    pub fn insert_session(&self, session: &SessionRecord) -> Result<(), StoreError> {
        self.connection.execute(
            "INSERT INTO sessions (
                id, kind, started_at, ended_at, planned_ms, actual_ms, outcome,
                interruptions, device_id, created_at, updated_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)",
            params![
                session.id,
                kind_name(session.kind),
                session.started_at_ms,
                session.ended_at_ms,
                session.planned_ms as i64,
                session.actual_ms as i64,
                outcome_name(session.outcome),
                session.interruptions,
                device_id(),
                now_ms(),
            ],
        )?;
        Ok(())
    }

    /// Local midnight as a Unix timestamp in milliseconds.
    ///
    /// `localtime` turns the current instant into wall-clock time and
    /// `start of day` floors it there, so the value still carries the UTC
    /// offset. The trailing `utc` modifier converts that wall-clock midnight
    /// back into a real instant; without it, in UTC+8 the local day would
    /// start at 08:00 and the summary would hide the morning.
    pub fn start_of_today_ms(&self) -> Result<i64, StoreError> {
        Ok(self.connection.query_row(
            "SELECT strftime('%s', 'now', 'localtime', 'start of day', 'utc') * 1000",
            [],
            |row| row.get::<_, i64>(0),
        )?)
    }

    pub fn today_summary(&self) -> Result<TodaySummary, StoreError> {
        let start_of_day = self.start_of_today_ms()?;
        let (completed_focus, focus_ms): (i64, i64) = self.connection.query_row(
            "SELECT COUNT(*), COALESCE(SUM(actual_ms), 0) FROM sessions
             WHERE kind = 'Focus' AND outcome = 'Completed' AND started_at >= ?1",
            params![start_of_day],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )?;
        let (completed_countdown, countdown_ms): (i64, i64) = self.connection.query_row(
            "SELECT COUNT(*), COALESCE(SUM(actual_ms), 0) FROM sessions
             WHERE kind = 'Countdown' AND outcome = 'Completed' AND started_at >= ?1",
            params![start_of_day],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )?;
        Ok(TodaySummary {
            completed_focus: completed_focus as u32,
            focus_ms: focus_ms as u64,
            completed_countdown: completed_countdown as u32,
            countdown_ms: countdown_ms as u64,
        })
    }

    pub fn history(&self) -> Result<History, StoreError> {
        self.history_between(i64::MIN, i64::MAX)
    }

    /// Loads only the sessions started inside `[from_ms, to_ms)`, newest first.
    pub fn history_between(&self, from_ms: i64, to_ms: i64) -> Result<History, StoreError> {
        let mut statement = self.connection.prepare(
            "SELECT id, kind, started_at, ended_at, planned_ms, actual_ms, outcome,
                    interruptions, date(started_at / 1000, 'unixepoch', 'localtime')
             FROM sessions
             WHERE deleted_at IS NULL AND started_at >= ?1 AND started_at < ?2
             ORDER BY started_at DESC",
        )?;
        let rows = statement.query_map(params![from_ms, to_ms], |row| {
            let started_at_ms: i64 = row.get(2)?;
            Ok((
                row.get::<_, String>(8)?,
                HistorySession {
                    id: row.get(0)?,
                    kind: kind_from_name(&row.get::<_, String>(1)?),
                    started_at_ms,
                    ended_at_ms: row.get::<_, Option<i64>>(3)?.unwrap_or(started_at_ms),
                    planned_ms: row.get::<_, i64>(4)? as u64,
                    actual_ms: row.get::<_, Option<i64>>(5)?.unwrap_or(0) as u64,
                    outcome: outcome_from_name(&row.get::<_, String>(6)?),
                    interruptions: row.get::<_, i64>(7)? as u32,
                },
            ))
        })?;

        let mut days: Vec<HistoryDay> = Vec::new();
        for row in rows {
            let (date, session) = row?;
            let day = match days.last_mut() {
                Some(day) if day.date == date => day,
                _ => {
                    days.push(HistoryDay {
                        date,
                        completed_focus: 0,
                        focus_ms: 0,
                        completed_countdown: 0,
                        countdown_ms: 0,
                        break_count: 0,
                        break_ms: 0,
                        sessions: Vec::new(),
                    });
                    days.last_mut().expect("a day was just pushed")
                }
            };
            match session.kind {
                SessionKind::Focus if session.outcome == SessionOutcome::Completed => {
                    day.completed_focus += 1;
                    day.focus_ms += session.actual_ms;
                }
                SessionKind::Countdown if session.outcome == SessionOutcome::Completed => {
                    day.completed_countdown += 1;
                    day.countdown_ms += session.actual_ms;
                }
                SessionKind::ShortBreak | SessionKind::LongBreak => {
                    day.break_count += 1;
                    day.break_ms += session.actual_ms;
                }
                _ => {}
            }
            day.sessions.push(session);
        }
        Ok(History { days })
    }

    /// One continuous-scroll slice plus whether anything older exists.
    pub fn history_window(&self, from_ms: i64, to_ms: i64) -> Result<HistoryWindow, StoreError> {
        let history = self.history_between(from_ms, to_ms)?;
        let has_more: bool = self.connection.query_row(
            "SELECT EXISTS(
                SELECT 1 FROM sessions
                WHERE deleted_at IS NULL AND started_at < ?1
             )",
            params![from_ms],
            |row| row.get(0),
        )?;
        Ok(HistoryWindow {
            days: history.days,
            has_more,
        })
    }

    /// Aggregates a selected export range without loading its sessions.
    pub fn history_range_summary(
        &self,
        from_ms: i64,
        to_ms: i64,
    ) -> Result<HistoryRangeSummary, StoreError> {
        let (sessions, days, focus_ms, break_ms, countdown_ms): (i64, i64, i64, i64, i64) =
            self.connection.query_row(
                "SELECT COUNT(*),
                        COUNT(DISTINCT date(started_at / 1000, 'unixepoch', 'localtime')),
                        COALESCE(SUM(CASE WHEN kind = 'Focus' AND outcome = 'Completed'
                                          THEN COALESCE(actual_ms, 0) ELSE 0 END), 0),
                        COALESCE(SUM(CASE WHEN kind IN ('ShortBreak', 'LongBreak')
                                          THEN COALESCE(actual_ms, 0) ELSE 0 END), 0),
                        COALESCE(SUM(CASE WHEN kind = 'Countdown' AND outcome = 'Completed'
                                          THEN COALESCE(actual_ms, 0) ELSE 0 END), 0)
                 FROM sessions
                 WHERE deleted_at IS NULL AND started_at >= ?1 AND started_at < ?2",
                params![from_ms, to_ms],
                |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                    ))
                },
            )?;
        Ok(HistoryRangeSummary {
            sessions: sessions as u32,
            days: days as u32,
            focus_ms: focus_ms as u64,
            break_ms: break_ms as u64,
            countdown_ms: countdown_ms as u64,
        })
    }

    pub fn export_json(&self) -> Result<String, StoreError> {
        let history = self.history()?;
        let settings = self.load_settings().unwrap_or_else(|_| Settings::default());
        let value = serde_json::json!({
            "schemaVersion": SCHEMA_VERSION,
            "exportedAt": now_ms(),
            "settings": settings,
            "days": history.days,
        });
        Ok(serde_json::to_string_pretty(&value)?)
    }
}

fn kind_name(kind: crate::timer::SessionKind) -> &'static str {
    match kind {
        crate::timer::SessionKind::Focus => "Focus",
        crate::timer::SessionKind::ShortBreak => "ShortBreak",
        crate::timer::SessionKind::LongBreak => "LongBreak",
        crate::timer::SessionKind::Countdown => "Countdown",
    }
}

fn kind_from_name(name: &str) -> SessionKind {
    match name {
        "ShortBreak" => SessionKind::ShortBreak,
        "LongBreak" => SessionKind::LongBreak,
        "Countdown" => SessionKind::Countdown,
        _ => SessionKind::Focus,
    }
}

fn outcome_from_name(name: &str) -> SessionOutcome {
    match name {
        "Skipped" => SessionOutcome::Skipped,
        "Reset" => SessionOutcome::Reset,
        "Interrupted" => SessionOutcome::Interrupted,
        _ => SessionOutcome::Completed,
    }
}

fn outcome_name(outcome: crate::timer::SessionOutcome) -> &'static str {
    match outcome {
        crate::timer::SessionOutcome::Completed => "Completed",
        crate::timer::SessionOutcome::Skipped => "Skipped",
        crate::timer::SessionOutcome::Reset => "Reset",
        crate::timer::SessionOutcome::Interrupted => "Interrupted",
    }
}

pub fn now_ms() -> i64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_millis() as i64,
        Err(_) => 0,
    }
}

fn device_id() -> String {
    let path = std::env::temp_dir().join("siderkit-break-device-id");
    if let Ok(value) = fs::read_to_string(&path) {
        let trimmed = value.trim();
        if !trimmed.is_empty() {
            return trimmed.to_owned();
        }
    }
    let value = uuid::Uuid::now_v7().to_string();
    let _ = fs::write(path, &value);
    value
}

#[cfg(test)]
#[path = "db_tests.rs"]
mod tests;
