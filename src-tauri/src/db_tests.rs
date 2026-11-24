use super::*;

const MINUTE: i64 = 60_000;

fn store() -> Store {
    let store = Store {
        connection: Connection::open_in_memory().expect("in-memory database"),
        path: None,
    };
    store.migrate().expect("schema migrates");
    store
}

fn session(kind: SessionKind, outcome: SessionOutcome, started_at_ms: i64) -> SessionRecord {
    SessionRecord {
        id: uuid::Uuid::now_v7().to_string(),
        kind,
        started_at_ms,
        ended_at_ms: started_at_ms + 25 * MINUTE,
        planned_ms: 25 * 60_000,
        actual_ms: 25 * 60_000,
        outcome,
        interruptions: 0,
    }
}

#[test]
fn history_groups_sessions_by_day_and_kind() {
    let store = store();
    let now = now_ms();
    store
        .insert_session(&session(SessionKind::Focus, SessionOutcome::Completed, now))
        .expect("insert focus");
    store
        .insert_session(&session(
            SessionKind::ShortBreak,
            SessionOutcome::Completed,
            now,
        ))
        .expect("insert break");
    store
        .insert_session(&session(
            SessionKind::Countdown,
            SessionOutcome::Completed,
            now,
        ))
        .expect("insert countdown");
    store
        .insert_session(&session(
            SessionKind::Countdown,
            SessionOutcome::Skipped,
            now - 2 * 24 * 60 * MINUTE,
        ))
        .expect("insert older countdown");

    let history = store.history().expect("history loads");
    assert_eq!(history.days.len(), 2);

    let today = &history.days[0];
    assert_eq!(today.completed_focus, 1);
    assert_eq!(today.focus_ms, 25 * 60_000);
    assert_eq!(today.completed_countdown, 1);
    assert_eq!(today.countdown_ms, 25 * 60_000);
    assert_eq!(today.break_count, 1);
    assert_eq!(today.sessions.len(), 3);

    let older = &history.days[1];
    assert_eq!(older.completed_countdown, 0);
    assert_eq!(older.sessions.len(), 1);
    assert_eq!(older.sessions[0].outcome, SessionOutcome::Skipped);
}

#[test]
fn history_window_returns_only_the_requested_slice() {
    let store = store();
    let today = store.start_of_today_ms().expect("start of today");
    store
        .insert_session(&session(
            SessionKind::Focus,
            SessionOutcome::Completed,
            today - MINUTE,
        ))
        .expect("insert yesterday");
    store
        .insert_session(&session(
            SessionKind::Focus,
            SessionOutcome::Completed,
            today + MINUTE,
        ))
        .expect("insert today");

    let window = store
        .history_window(today, today + 24 * 60 * MINUTE)
        .expect("today window");
    assert_eq!(window.days.len(), 1);
    assert_eq!(window.days[0].sessions.len(), 1);
    assert!(window.has_more);

    let older = store
        .history_window(today - 24 * 60 * MINUTE, today)
        .expect("yesterday window");
    assert_eq!(older.days.len(), 1);
    assert_eq!(older.days[0].sessions.len(), 1);
    assert!(!older.has_more);
}

#[test]
fn history_range_summary_counts_only_the_selected_range() {
    let store = store();
    let today = store.start_of_today_ms().expect("start of today");
    store
        .insert_session(&session(
            SessionKind::Focus,
            SessionOutcome::Completed,
            today + MINUTE,
        ))
        .expect("insert focus");
    store
        .insert_session(&session(
            SessionKind::ShortBreak,
            SessionOutcome::Completed,
            today + 2 * MINUTE,
        ))
        .expect("insert break");
    store
        .insert_session(&session(
            SessionKind::Countdown,
            SessionOutcome::Skipped,
            today + 3 * MINUTE,
        ))
        .expect("insert skipped countdown");
    store
        .insert_session(&session(
            SessionKind::Focus,
            SessionOutcome::Completed,
            today - MINUTE,
        ))
        .expect("insert outside range");

    let summary = store
        .history_range_summary(today, today + 24 * 60 * MINUTE)
        .expect("range summary");
    assert_eq!(summary.sessions, 3);
    assert_eq!(summary.days, 1);
    assert_eq!(summary.focus_ms, 25 * 60_000);
    assert_eq!(summary.break_ms, 25 * 60_000);
    assert_eq!(summary.countdown_ms, 0);
}

#[test]
fn the_range_end_is_exclusive() {
    let store = store();
    let today = store.start_of_today_ms().expect("start of today");
    store
        .insert_session(&session(
            SessionKind::Focus,
            SessionOutcome::Completed,
            today,
        ))
        .expect("insert on the boundary");

    let window = store.history_window(today, today).expect("empty window");
    assert!(window.days.is_empty());

    let window = store
        .history_window(today, today + MINUTE)
        .expect("inclusive start");
    assert_eq!(window.days.len(), 1);
}

#[test]
fn today_starts_at_local_midnight() {
    let store = store();
    let start = store.start_of_today_ms().expect("start of today");
    let now = now_ms();
    assert!(start <= now, "the local day cannot start in the future");
    let local_day = |value: i64| -> String {
        store
            .connection
            .query_row(
                "SELECT date(?1 / 1000, 'unixepoch', 'localtime')",
                [value],
                |row| row.get(0),
            )
            .expect("local day")
    };
    assert_eq!(local_day(start), local_day(now));
}

#[test]
fn today_summary_separates_countdowns_from_focus_sessions() {
    let store = store();
    let now = now_ms();
    store
        .insert_session(&session(SessionKind::Focus, SessionOutcome::Completed, now))
        .expect("insert focus");
    store
        .insert_session(&session(
            SessionKind::Countdown,
            SessionOutcome::Completed,
            now,
        ))
        .expect("insert countdown");

    let summary = store.today_summary().expect("summary loads");
    assert_eq!(summary.completed_focus, 1);
    assert_eq!(summary.focus_ms, 25 * 60_000);
    assert_eq!(summary.completed_countdown, 1);
    assert_eq!(summary.countdown_ms, 25 * 60_000);
}

#[test]
fn export_includes_settings_and_every_history_day() {
    let store = store();
    let now = now_ms();
    store
        .insert_session(&session(
            SessionKind::Countdown,
            SessionOutcome::Completed,
            now,
        ))
        .expect("insert countdown");

    let export = store.export_json().expect("export succeeds");
    let value: serde_json::Value = serde_json::from_str(&export).expect("valid json");
    assert_eq!(value["schemaVersion"], SCHEMA_VERSION);
    assert!(value["settings"].is_object());
    let days = value["days"].as_array().expect("days array");
    assert_eq!(days.len(), 1);
    assert_eq!(days[0]["sessions"][0]["kind"], "Countdown");
}

fn insert_legacy_countdown(connection: &Connection, now: i64) {
    connection
        .execute(
            "INSERT INTO sessions (
                    id, kind, started_at, ended_at, planned_ms, actual_ms, outcome,
                    interruptions, device_id, created_at, updated_at
                 ) VALUES (?1, 'Countdown', ?2, ?3, ?4, ?4, 'Completed', 0, 'legacy', ?2, ?2)",
            params![
                uuid::Uuid::now_v7().to_string(),
                now,
                now + 5 * MINUTE,
                5 * MINUTE,
            ],
        )
        .expect("legacy session row");
}

fn schema_version(connection: &Connection) -> i64 {
    connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .expect("schema version")
}

fn column_exists(connection: &Connection, table: &str, column: &str) -> bool {
    connection
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM pragma_table_info(?1) WHERE name = ?2)",
            params![table, column],
            |row| row.get::<_, bool>(0),
        )
        .expect("column lookup")
}

#[test]
fn upgrading_a_version_one_database_keeps_its_history() {
    let connection = Connection::open_in_memory().expect("in-memory database");
    connection.execute_batch(BASE_SCHEMA).expect("v1 schema");
    insert_legacy_countdown(&connection, now_ms());
    connection
        .pragma_update(None, "user_version", 1)
        .expect("version one");

    let store = Store {
        connection,
        path: None,
    };
    store.migrate().expect("migration succeeds");

    assert_eq!(schema_version(&store.connection), SCHEMA_VERSION);
    let history = store.history().expect("history still loads");
    assert_eq!(history.days.len(), 1);
    assert_eq!(history.days[0].completed_countdown, 1);
    let index: i64 = store
        .connection
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master
                 WHERE type = 'index' AND name = 'sessions_kind_started_at'",
            [],
            |row| row.get(0),
        )
        .expect("index lookup");
    assert_eq!(index, 1);
}

#[test]
fn a_database_missing_optional_columns_is_repaired() {
    let connection = Connection::open_in_memory().expect("in-memory database");
    connection.execute_batch(BASE_SCHEMA).expect("base schema");
    connection
        .execute_batch(
            "ALTER TABLE settings DROP COLUMN rev;
                 ALTER TABLE sessions DROP COLUMN deleted_at;
                 ALTER TABLE sessions DROP COLUMN rev;",
        )
        .expect("simulate an older schema");
    insert_legacy_countdown(&connection, now_ms());
    connection
        .pragma_update(None, "user_version", 1)
        .expect("version one");

    let store = Store {
        connection,
        path: None,
    };
    store.migrate().expect("repair succeeds");

    assert!(column_exists(&store.connection, "settings", "rev"));
    assert!(column_exists(&store.connection, "sessions", "deleted_at"));
    assert!(column_exists(&store.connection, "sessions", "rev"));
    assert_eq!(store.history().expect("history loads").days.len(), 1);
}

#[test]
fn a_newer_database_is_rejected_without_being_touched() {
    let connection = Connection::open_in_memory().expect("in-memory database");
    connection.execute_batch(BASE_SCHEMA).expect("base schema");
    connection
        .pragma_update(None, "user_version", 99)
        .expect("future version");

    let store = Store {
        connection,
        path: None,
    };
    assert!(matches!(
        store.migrate(),
        Err(StoreError::UnsupportedSchema(99))
    ));
    assert_eq!(schema_version(&store.connection), 99);
}

#[test]
fn opening_an_old_database_file_writes_a_backup_before_upgrading() {
    let directory =
        std::env::temp_dir().join(format!("siderkit-break-db-{}", uuid::Uuid::now_v7()));
    fs::create_dir_all(&directory).expect("temp directory");
    let path = directory.join("siderkit-break.sqlite3");
    {
        let connection = Connection::open(&path).expect("legacy database");
        connection.execute_batch(BASE_SCHEMA).expect("v1 schema");
        insert_legacy_countdown(&connection, now_ms());
        connection
            .pragma_update(None, "user_version", 1)
            .expect("version one");
    }

    let store = Store::open(&path).expect("database upgrades");
    assert_eq!(schema_version(&store.connection), SCHEMA_VERSION);
    assert_eq!(store.history().expect("history loads").days.len(), 1);
    let backups: Vec<_> = fs::read_dir(&directory)
        .expect("backup directory")
        .flatten()
        .filter(|entry| entry.file_name().to_string_lossy().contains(".backup-v1-"))
        .collect();
    assert_eq!(backups.len(), 1, "one backup per upgrade");
    drop(store);
    let _ = fs::remove_dir_all(&directory);
}

#[test]
fn the_overlay_position_survives_a_store_round_trip() {
    let store = store();
    let mut settings = Settings::default();
    settings.overlay.position = Some(OverlayPosition {
        x: 793,
        y: 1479,
        ratio_x: Some(310),
        ratio_y: Some(925),
        screen_width: Some(2560),
        screen_height: Some(1600),
    });
    store.save_settings(&settings).expect("settings save");

    let loaded = store.load_settings().expect("settings load");
    assert_eq!(loaded.overlay.position, settings.overlay.position);
    assert_eq!(loaded.general.palette, settings.general.palette);
}

#[path = "db_insights_tests.rs"]
mod insights;
