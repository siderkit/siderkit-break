use super::*;

#[test]
fn upgrading_a_version_two_database_adds_tags_and_keeps_history() {
    let connection = Connection::open_in_memory().expect("in-memory database");
    connection.execute_batch(BASE_SCHEMA).expect("v2 schema");
    insert_legacy_countdown(&connection, now_ms());
    connection
        .pragma_update(None, "user_version", 2)
        .expect("version two");

    let store = Store {
        connection,
        path: None,
    };
    store.migrate().expect("migration succeeds");

    assert_eq!(schema_version(&store.connection), SCHEMA_VERSION);
    assert!(column_exists(&store.connection, "sessions", "tag"));
    let history = store.history().expect("history still loads");
    assert_eq!(history.days.len(), 1);
    assert_eq!(history.days[0].sessions[0].tag, None);
    let index: i64 = store
        .connection
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master
             WHERE type = 'index' AND name = 'sessions_tag_started_at'",
            [],
            |row| row.get(0),
        )
        .expect("tag index lookup");
    assert_eq!(index, 1);
}

#[test]
fn a_session_tag_round_trips_and_can_be_cleared() {
    let store = store();
    let record = session(SessionKind::Focus, SessionOutcome::Completed, now_ms());
    store.insert_session(&record).expect("insert focus");

    assert!(store
        .set_session_tag(&record.id, Some("  deep   work  "))
        .expect("tag saves"));
    let history = store.history().expect("history loads");
    assert_eq!(
        history.days[0].sessions[0].tag.as_deref(),
        Some("deep work")
    );
    assert_eq!(
        store.recent_tags(3).expect("recent tags"),
        vec!["deep work".to_owned()]
    );

    assert!(store
        .set_session_tag(&record.id, Some("   "))
        .expect("tag clears"));
    let history = store.history().expect("history loads");
    assert_eq!(history.days[0].sessions[0].tag, None);
    assert!(!store
        .set_session_tag("missing", Some("x"))
        .expect("unknown id is a no-op"));
}

#[test]
fn tags_are_trimmed_and_collapsed_without_truncation() {
    assert_eq!(
        normalize_tag("  write   code "),
        Some("write code".to_owned())
    );
    assert_eq!(normalize_tag("\n\t "), None);
    let long = "a".repeat(60);
    assert_eq!(normalize_tag(&long), Some(long));
    let emoji = "💧".repeat(50);
    assert_eq!(normalize_tag(&emoji), Some(emoji));
}

#[test]
fn recent_tags_dedupe_case_insensitively_and_keep_the_newest_spelling() {
    let store = store();
    let today = store.start_of_today_ms().expect("start of today");
    for (offset, tag) in [(1, "Deep Work"), (2, "Reading"), (3, "deep work")] {
        let record = session(
            SessionKind::Focus,
            SessionOutcome::Completed,
            today + offset * MINUTE,
        );
        store.insert_session(&record).expect("insert focus");
        store
            .set_session_tag(&record.id, Some(tag))
            .expect("tag saves");
    }
    assert_eq!(
        store.recent_tags(3).expect("recent tags"),
        vec!["deep work".to_owned(), "Reading".to_owned()]
    );
}

#[test]
fn insights_aggregate_today_and_build_the_heatmap() {
    let store = store();
    let today = store.start_of_today_ms().expect("start of today");
    let first = session(
        SessionKind::Focus,
        SessionOutcome::Completed,
        today + MINUTE,
    );
    let second = session(
        SessionKind::Focus,
        SessionOutcome::Completed,
        today + 2 * MINUTE,
    );
    store.insert_session(&first).expect("insert focus");
    store.insert_session(&second).expect("insert focus");
    store
        .set_session_tag(&first.id, Some("Writing"))
        .expect("tag first");
    store
        .set_session_tag(&second.id, Some("Writing"))
        .expect("tag second");
    store
        .insert_session(&session(
            SessionKind::ShortBreak,
            SessionOutcome::Completed,
            today + 3 * MINUTE,
        ))
        .expect("insert break");

    let payload = store.insights("today").expect("insights load");
    assert_eq!(payload.range, "today");
    assert_eq!(payload.totals.rounds, 2);
    assert_eq!(payload.totals.focus_ms, 50 * 60_000);
    assert_eq!(payload.totals.streak_days, 1);
    assert_eq!(payload.heatmap.len(), 371);
    assert_eq!(payload.tags.len(), 1);
    assert_eq!(payload.tags[0].tag, "Writing");
    assert_eq!(payload.tags[0].focus_ms, 50 * 60_000);
    assert!(payload.days.iter().any(|day| day.rounds == 2));
}

#[test]
fn clearing_history_removes_every_session_and_tag() {
    let store = store();
    let record = session(SessionKind::Focus, SessionOutcome::Completed, now_ms());
    store.insert_session(&record).expect("insert focus");
    store
        .set_session_tag(&record.id, Some("Reading"))
        .expect("tag saves");

    assert_eq!(store.clear_history().expect("history clears"), 1);
    assert!(store.history().expect("history loads").days.is_empty());
    assert!(store.recent_tags(3).expect("recent tags").is_empty());
}
