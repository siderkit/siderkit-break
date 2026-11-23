use super::model::{should_prompt, Snapshot, UpdatePhase};
use crate::db::now_ms;
use crate::settings::UpdateSettings;

fn available(version: &str) -> Snapshot {
    Snapshot {
        phase: UpdatePhase::Available,
        version: Some(version.to_owned()),
        ..Snapshot::default()
    }
}

#[test]
fn an_available_update_prompts_by_default() {
    assert!(should_prompt(
        &available("1.0.0"),
        &UpdateSettings::default(),
        now_ms()
    ));
}

#[test]
fn a_skipped_version_does_not_prompt() {
    let settings = UpdateSettings {
        skipped_version: Some("1.0.0".to_owned()),
        ..UpdateSettings::default()
    };
    assert!(!should_prompt(&available("1.0.0"), &settings, now_ms()));
    assert!(should_prompt(&available("1.0.1"), &settings, now_ms()));
}

#[test]
fn a_postponed_update_stays_hidden_until_the_snooze_expires() {
    let now = now_ms();
    let settings = UpdateSettings {
        snooze_until_ms: Some(now + 60_000),
        ..UpdateSettings::default()
    };
    assert!(!should_prompt(&available("1.0.0"), &settings, now));
    assert!(should_prompt(&available("1.0.0"), &settings, now + 60_001));
}

#[test]
fn a_ready_download_prompts_even_without_a_fresh_check() {
    let mut snapshot = available("1.0.0");
    snapshot.phase = UpdatePhase::Ready;
    assert!(should_prompt(
        &snapshot,
        &UpdateSettings::default(),
        now_ms()
    ));
}

#[test]
fn idle_and_up_to_date_states_never_prompt() {
    let settings = UpdateSettings::default();
    let mut snapshot = available("1.0.0");
    snapshot.phase = UpdatePhase::UpToDate;
    assert!(!should_prompt(&snapshot, &settings, now_ms()));
    snapshot.phase = UpdatePhase::Idle;
    assert!(!should_prompt(&snapshot, &settings, now_ms()));
}

#[test]
fn the_announced_version_is_the_one_compared_with_the_skip() {
    let settings = UpdateSettings {
        skipped_version: Some("1.0.0".to_owned()),
        ..UpdateSettings::default()
    };
    let snapshot = available("1.0.0");
    assert_eq!(snapshot.version.as_deref(), Some("1.0.0"));
    assert!(!should_prompt(&snapshot, &settings, now_ms()));
}
