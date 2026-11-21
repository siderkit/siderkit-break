use proptest::prelude::*;

use super::model::{MAX_COUNTDOWN_MINUTES, MAX_MINUTES, MIN_MINUTES};
use super::*;

const MINUTE: i64 = 60_000;

fn engine() -> TimerEngine {
    TimerEngine::new(TimerConfig::default())
}

#[test]
fn starts_a_focus_session() {
    let mut engine = engine();
    let transition = engine.start(0);

    assert_eq!(transition.snapshot.phase, Phase::Focus);
    assert_eq!(transition.snapshot.remaining_ms, 25 * 60_000);
    assert_eq!(transition.snapshot.planned_ms, 25 * 60_000);
    assert!(transition.phase_changed);
    assert!(transition.ended_session.is_none());
}

#[test]
fn pause_and_resume_preserve_the_deadline() {
    let mut engine = engine();
    engine.start(0);
    engine.pause(5 * MINUTE).expect("pause succeeds");

    assert!(engine.snapshot(5 * MINUTE).is_paused);
    assert_eq!(engine.snapshot(10 * MINUTE).remaining_ms, 20 * 60_000);

    engine.resume(10 * MINUTE).expect("resume succeeds");
    assert_eq!(engine.snapshot(10 * MINUTE).remaining_ms, 20 * 60_000);
    assert_eq!(engine.snapshot(10 * MINUTE + 20 * 60_000).remaining_ms, 0);
}

#[test]
fn completes_focus_once_and_starts_a_short_break() {
    let mut engine = engine();
    engine.start(0);
    let transition = engine.tick(25 * MINUTE);

    assert_eq!(transition.snapshot.phase, Phase::ShortBreak);
    assert_eq!(transition.snapshot.completed_focus_count, 1);
    assert_eq!(transition.snapshot.cycle_index, 1);
    assert_eq!(
        transition.ended_session.expect("session").outcome,
        SessionOutcome::Completed
    );
    assert!(!transition.missed_deadline);
}

#[test]
fn completes_a_long_break_after_the_configured_rounds() {
    let mut engine = engine();
    for round in 1..=4 {
        engine.start(0);
        let transition = engine.tick(25 * MINUTE);
        if round < 4 {
            assert_eq!(transition.snapshot.phase, Phase::ShortBreak);
            engine.skip(26 * MINUTE);
        } else {
            assert_eq!(transition.snapshot.phase, Phase::LongBreak);
            assert_eq!(transition.snapshot.completed_focus_count, 4);
            engine.tick(26 * MINUTE + 15 * MINUTE);
            assert_eq!(engine.snapshot(0).completed_focus_count, 0);
        }
    }
}

#[test]
fn skipped_focus_does_not_count_toward_the_long_break() {
    let mut engine = engine();
    engine.start(0);
    let transition = engine.skip(5 * MINUTE);

    assert_eq!(transition.snapshot.phase, Phase::Idle);
    assert_eq!(transition.snapshot.completed_focus_count, 0);
    assert_eq!(
        transition.ended_session.expect("session").outcome,
        SessionOutcome::Skipped
    );
}

#[test]
fn postponing_a_break_keeps_it_pending() {
    let mut engine = engine();
    engine.start(0);
    engine.tick(25 * MINUTE);

    assert_eq!(engine.snapshot(25 * MINUTE).phase, Phase::ShortBreak);

    let transition = engine.postpone(26 * MINUTE);

    assert_eq!(transition.snapshot.phase, Phase::Idle);
    assert_eq!(transition.snapshot.pending_break, Some(Phase::ShortBreak));
    assert_eq!(
        transition.ended_session.expect("session").outcome,
        SessionOutcome::Skipped
    );
}

#[test]
fn reset_discards_a_pending_break() {
    let mut engine = engine();
    engine.start(0);
    engine.tick(24 * 60 * MINUTE);

    assert_eq!(
        engine.snapshot(24 * 60 * MINUTE).pending_break,
        Some(Phase::ShortBreak)
    );

    let transition = engine.reset(24 * 60 * MINUTE);

    assert_eq!(transition.snapshot.phase, Phase::Idle);
    assert_eq!(transition.snapshot.pending_break, None);
}

#[test]
fn a_large_clock_jump_completes_only_one_phase() {
    let mut engine = engine();
    engine.start(0);
    let transition = engine.tick(24 * 60 * MINUTE);

    assert!(transition.missed_deadline);
    assert_eq!(transition.snapshot.phase, Phase::Idle);
    assert_eq!(transition.snapshot.pending_break, Some(Phase::ShortBreak));
    assert_eq!(transition.snapshot.completed_focus_count, 1);
}

#[test]
fn a_backward_clock_jump_is_clamped_to_the_planned_duration() {
    let mut engine = engine();
    engine.start(0);
    let snapshot = engine.snapshot(-10 * MINUTE);

    assert_eq!(snapshot.remaining_ms, 25 * 60_000);
}

#[test]
fn restore_keeps_a_paused_session_paused() {
    let config = TimerConfig::default();
    let mut engine = engine();
    engine.start(0);
    engine.pause(5 * MINUTE).expect("pause succeeds");
    let snapshot = engine.snapshot(5 * MINUTE);
    let restored = TimerEngine::restore(config, snapshot, 5 * MINUTE);

    assert_eq!(restored.snapshot(10 * MINUTE).remaining_ms, 20 * 60_000);
    assert!(restored.snapshot(10 * MINUTE).is_paused);
}

#[test]
fn interruption_records_an_interrupted_session() {
    let mut engine = engine();
    engine.start(0);
    let transition = engine.interrupt(2 * MINUTE);

    assert_eq!(transition.snapshot.phase, Phase::Idle);
    assert_eq!(
        transition.ended_session.expect("session").outcome,
        SessionOutcome::Interrupted
    );
}

#[test]
fn a_countdown_runs_independently_of_the_pomodoro_cycle() {
    let mut engine = engine();
    let transition = engine.start_countdown(10, 0);
    let session = transition.ended_session;
    assert!(session.is_none());

    assert_eq!(transition.snapshot.phase, Phase::Countdown);
    assert_eq!(transition.snapshot.remaining_ms, 10 * 60_000);
    assert_eq!(transition.snapshot.completed_focus_count, 0);
    assert_eq!(transition.snapshot.cycle_index, 0);
    assert!(transition.snapshot.pending_break.is_none());
}

#[test]
fn a_completed_countdown_returns_to_idle_without_a_break() {
    let mut engine = engine();
    engine.start_countdown(5, 0);
    let transition = engine.tick(5 * MINUTE);

    assert_eq!(transition.snapshot.phase, Phase::Idle);
    assert!(transition.snapshot.pending_break.is_none());
    assert_eq!(transition.snapshot.completed_focus_count, 0);
    let session = transition.ended_session.expect("countdown session");
    assert_eq!(session.kind, SessionKind::Countdown);
    assert_eq!(session.outcome, SessionOutcome::Completed);
    assert_eq!(session.actual_ms, 5 * 60_000);
}

#[test]
fn a_countdown_can_be_paused_and_resumed() {
    let mut engine = engine();
    engine.start_countdown(10, 0);
    engine.pause(2 * MINUTE).expect("pause succeeds");

    assert_eq!(engine.snapshot(3 * MINUTE).remaining_ms, 8 * 60_000);

    engine.resume(5 * MINUTE).expect("resume succeeds");
    assert_eq!(engine.snapshot(5 * MINUTE).remaining_ms, 8 * 60_000);
    assert_eq!(engine.snapshot(13 * MINUTE).remaining_ms, 0);
}

#[test]
fn a_countdown_is_clamped_to_the_supported_range() {
    let mut shortest = engine();
    shortest.start_countdown(0, 0);
    assert_eq!(
        shortest.snapshot(0).planned_ms,
        u64::from(MIN_MINUTES) * 60_000
    );

    let mut longest = engine();
    longest.start_countdown(99_999, 0);
    assert_eq!(
        longest.snapshot(0).planned_ms,
        u64::from(MAX_COUNTDOWN_MINUTES) * 60_000
    );
}

#[test]
fn a_countdown_cannot_start_while_a_pomodoro_phase_is_active() {
    let mut engine = engine();
    engine.start(0);
    let transition = engine.start_countdown(10, MINUTE);

    assert_eq!(transition.snapshot.phase, Phase::Focus);
    assert_eq!(transition.snapshot.remaining_ms, 24 * 60_000);
    assert!(transition.ended_session.is_none());
}

#[test]
fn a_countdown_cannot_start_while_a_break_is_pending() {
    let mut engine = engine();
    engine.start(0);
    engine.tick(25 * MINUTE);
    engine.postpone(26 * MINUTE);

    let transition = engine.start_countdown(10, 27 * MINUTE);

    assert_eq!(transition.snapshot.phase, Phase::Idle);
    assert_eq!(transition.snapshot.pending_break, Some(Phase::ShortBreak));
}

#[test]
fn skipping_a_countdown_records_a_skipped_session() {
    let mut engine = engine();
    engine.start_countdown(10, 0);
    let transition = engine.skip(2 * MINUTE);

    assert_eq!(transition.snapshot.phase, Phase::Idle);
    assert!(transition.snapshot.pending_break.is_none());
    let session = transition.ended_session.expect("countdown session");
    assert_eq!(session.kind, SessionKind::Countdown);
    assert_eq!(session.outcome, SessionOutcome::Skipped);
    assert_eq!(session.actual_ms, 2 * 60_000);
}

#[test]
fn resetting_a_countdown_clears_it() {
    let mut engine = engine();
    engine.start_countdown(10, 0);
    let transition = engine.reset(2 * MINUTE);

    assert_eq!(transition.snapshot.phase, Phase::Idle);
    assert_eq!(
        transition.ended_session.expect("countdown session").outcome,
        SessionOutcome::Reset
    );
}

#[test]
fn restoring_a_countdown_keeps_its_deadline() {
    let config = TimerConfig::default();
    let mut engine = engine();
    engine.start_countdown(30, 0);
    let snapshot = engine.snapshot(5 * MINUTE);
    let restored = TimerEngine::restore(config, snapshot, 5 * MINUTE);

    assert_eq!(restored.snapshot(6 * MINUTE).phase, Phase::Countdown);
    assert_eq!(restored.snapshot(6 * MINUTE).remaining_ms, 24 * 60_000);
}

#[test]
fn pomodoro_durations_are_capped_at_sixty_minutes() {
    let config = TimerConfig {
        focus_minutes: 999,
        short_break_minutes: 999,
        long_break_minutes: 999,
        ..TimerConfig::default()
    }
    .normalized();

    assert_eq!(config.focus_minutes, MAX_MINUTES);
    assert_eq!(config.short_break_minutes, MAX_MINUTES);
    assert_eq!(config.long_break_minutes, MAX_MINUTES);
}

proptest! {
    #[test]
    fn remaining_time_never_exceeds_the_plan(offset in -600_000i64..2_000_000) {
        let mut engine = engine();
        engine.start(0);
        let snapshot = engine.snapshot(offset);
        prop_assert!(snapshot.remaining_ms <= snapshot.planned_ms);
    }
}
