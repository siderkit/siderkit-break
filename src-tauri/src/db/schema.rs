use std::fs;
use std::path::{Path, PathBuf};

use log::{info, warn};
use rusqlite::params;

use super::{now_ms, Store, StoreError};

pub(super) const SCHEMA_VERSION: i64 = 3;
pub(super) const BASE_SCHEMA: &str = "
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        rev INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        planned_ms INTEGER NOT NULL,
        actual_ms INTEGER,
        outcome TEXT NOT NULL,
        interruptions INTEGER NOT NULL DEFAULT 0,
        device_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        rev INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS sessions_started_at ON sessions(started_at);
    CREATE INDEX IF NOT EXISTS sessions_outcome_started_at ON sessions(outcome, started_at);
    CREATE TABLE IF NOT EXISTS runtime_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        value_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
    );";
const KIND_INDEX: &str =
    "CREATE INDEX IF NOT EXISTS sessions_kind_started_at ON sessions(kind, started_at);";
const TAG_INDEX: &str = "CREATE INDEX IF NOT EXISTS sessions_tag_started_at
    ON sessions(tag, started_at) WHERE tag IS NOT NULL;";

impl Store {
    pub(super) fn migrate(&self) -> Result<(), StoreError> {
        let version: i64 = self
            .connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))?;
        if version > SCHEMA_VERSION {
            return Err(StoreError::UnsupportedSchema(version));
        }
        if version < SCHEMA_VERSION {
            self.backup(version)?;
        }
        self.connection.execute_batch("BEGIN IMMEDIATE")?;
        let result = self.apply_migrations(version);
        match result {
            Ok(()) => {
                self.connection.execute_batch("COMMIT")?;
                Ok(())
            }
            Err(error) => {
                if let Err(rollback) = self.connection.execute_batch("ROLLBACK") {
                    warn!("failed to roll back the schema migration: {rollback}");
                }
                Err(error)
            }
        }
    }

    /// Applies each version step in order. The whole batch is one transaction,
    /// so a failed upgrade leaves the previous database intact.
    fn apply_migrations(&self, from: i64) -> Result<(), StoreError> {
        if from < 1 {
            self.connection.execute_batch(BASE_SCHEMA)?;
        }
        if from < 2 {
            self.connection.execute_batch(KIND_INDEX)?;
        }
        if from < 3 {
            self.ensure_column("sessions", "tag", "TEXT")?;
            self.connection.execute_batch(TAG_INDEX)?;
        }
        self.repair_schema()?;
        self.connection
            .pragma_update(None, "user_version", SCHEMA_VERSION)?;
        Ok(())
    }

    /// Older builds may have written a schema without optional columns while
    /// still reporting a current version. Adding them keeps those databases
    /// readable instead of failing at the first query.
    fn repair_schema(&self) -> Result<(), StoreError> {
        self.ensure_column("settings", "rev", "INTEGER NOT NULL DEFAULT 1")?;
        self.ensure_column("sessions", "deleted_at", "INTEGER")?;
        self.ensure_column("sessions", "rev", "INTEGER NOT NULL DEFAULT 1")?;
        self.ensure_column("sessions", "tag", "TEXT")?;
        Ok(())
    }

    fn ensure_column(&self, table: &str, column: &str, definition: &str) -> Result<(), StoreError> {
        let exists: bool = self.connection.query_row(
            "SELECT EXISTS(SELECT 1 FROM pragma_table_info(?1) WHERE name = ?2)",
            params![table, column],
            |row| row.get(0),
        )?;
        if exists {
            return Ok(());
        }
        // Identifiers are internal constants, never user input.
        self.connection.execute_batch(&format!(
            "ALTER TABLE {table} ADD COLUMN {column} {definition};"
        ))?;
        info!("added missing column {table}.{column}");
        Ok(())
    }

    /// Copies the database before an upgrade so a failed migration never
    /// leaves the only copy of the user's history in a half-upgraded state.
    fn backup(&self, from: i64) -> Result<(), StoreError> {
        let Some(path) = &self.path else {
            return Ok(());
        };
        if from == 0 || !path.exists() {
            return Ok(());
        }
        let _ = self
            .connection
            .execute_batch("PRAGMA wal_checkpoint(FULL);");
        let file_name = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("siderkit-break.sqlite3");
        let backup = path.with_file_name(format!("{file_name}.backup-v{from}-{}", now_ms()));
        fs::copy(path, &backup)?;
        info!("database backup written to {}", backup.display());
        prune_backups(path, file_name, 3);
        Ok(())
    }
}

/// Keeps the most recent backups so repeated upgrades do not fill the disk.
fn prune_backups(path: &Path, file_name: &str, keep: usize) {
    let Some(parent) = path.parent() else {
        return;
    };
    let prefix = format!("{file_name}.backup-");
    let Ok(entries) = fs::read_dir(parent) else {
        return;
    };
    let mut backups: Vec<PathBuf> = entries
        .flatten()
        .map(|entry| entry.path())
        .filter(|entry| {
            entry
                .file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| name.starts_with(&prefix))
        })
        .collect();
    backups.sort();
    while backups.len() > keep {
        let oldest = backups.remove(0);
        if let Err(error) = fs::remove_file(&oldest) {
            warn!("failed to remove old database backup: {error}");
        }
    }
}
