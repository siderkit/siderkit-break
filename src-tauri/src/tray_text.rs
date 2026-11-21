use crate::i18n::translate;
use crate::timer::{Phase, TimerSnapshot};

/// A neutral snapshot for the first menu build if the engine is not ready yet.
pub(crate) fn idle_snapshot() -> TimerSnapshot {
    TimerSnapshot {
        phase: Phase::Idle,
        is_paused: false,
        remaining_ms: 0,
        planned_ms: 0,
        ends_at_ms: None,
        cycle_index: 0,
        completed_focus_count: 0,
        started_at_ms: None,
        interruptions: 0,
        pending_break: None,
    }
}

pub(crate) fn overlay_toggle_text(locale: &str, visible: bool) -> String {
    let key = if visible {
        "tray.hideOverlay"
    } else {
        "tray.showOverlay"
    };
    translate(locale, key)
}

pub(crate) fn status_text(locale: &str, snapshot: &TimerSnapshot) -> String {
    if snapshot.phase == Phase::Idle {
        if let Some(pending) = snapshot.pending_break {
            return format!(
                "{} · {}",
                phase_name(locale, pending),
                translate(locale, "overlay.breakReady")
            );
        }
        return translate(locale, "overlay.ready");
    }
    let pause_suffix = if snapshot.is_paused {
        format!(" · {}", translate(locale, "timer.paused"))
    } else {
        String::new()
    };
    format!(
        "{} · {}{}",
        phase_name(locale, snapshot.phase),
        format_clock(snapshot.remaining_ms),
        pause_suffix
    )
}

pub(crate) fn toggle_text(locale: &str, snapshot: &TimerSnapshot) -> String {
    if snapshot.phase == Phase::Idle {
        return if snapshot.pending_break.is_some() {
            translate(locale, "timer.action.startBreak")
        } else {
            translate(locale, "timer.action.startFocus")
        };
    }
    if snapshot.is_paused {
        translate(locale, "timer.action.resume")
    } else {
        translate(locale, "timer.action.pause")
    }
}

fn phase_name(locale: &str, phase: Phase) -> String {
    let key = match phase {
        Phase::Idle => "timer.phase.ready",
        Phase::Focus => "timer.phase.focus",
        Phase::ShortBreak => "timer.phase.shortBreak",
        Phase::LongBreak => "timer.phase.longBreak",
        Phase::Countdown => "timer.phase.countdown",
    };
    translate(locale, key)
}

fn format_clock(remaining_ms: u64) -> String {
    let seconds = remaining_ms / 1000;
    if seconds >= 3_600 {
        format!(
            "{:02}:{:02}:{:02}",
            seconds / 3_600,
            (seconds % 3_600) / 60,
            seconds % 60
        )
    } else {
        format!("{:02}:{:02}", seconds / 60, seconds % 60)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_menu_heading_names_the_app_and_open_names_the_main_window() {
        use crate::settings::SUPPORTED_LOCALES;

        assert_eq!(translate("en", "app.name"), "Siderkit Break");
        assert_eq!(translate("en", "tray.open"), "Open main window");
        assert_eq!(translate("zh-CN", "tray.open"), "打开主窗口");
        for locale in SUPPORTED_LOCALES {
            assert_eq!(translate(locale, "app.name"), "Siderkit Break");
            let open = translate(locale, "tray.open");
            assert!(!open.is_empty(), "{locale} has an empty open label");
            assert!(
                !open.contains("Siderkit Break"),
                "{locale} still repeats the app name in the open label"
            );
        }
    }

    #[test]
    fn the_overlay_row_switches_between_hide_and_show() {
        assert_eq!(overlay_toggle_text("en", true), "Hide floating ball");
        assert_eq!(overlay_toggle_text("en", false), "Show floating ball");
        assert_eq!(overlay_toggle_text("zh-CN", true), "关闭悬浮球");
        assert_eq!(overlay_toggle_text("zh-CN", false), "开启悬浮球");
    }

    #[test]
    fn the_locate_row_is_localized() {
        assert_eq!(
            translate("en", "tray.locateOverlay"),
            "Locate floating ball"
        );
        assert_eq!(translate("zh-CN", "tray.locateOverlay"), "定位悬浮球");
        assert_eq!(translate("en", "overlay.locate"), "I'm here");
        assert_eq!(translate("zh-CN", "overlay.locate"), "我在这里");
    }

    #[test]
    fn the_tray_clock_switches_to_hours() {
        assert_eq!(format_clock(59 * 60_000), "59:00");
        assert_eq!(format_clock(3_600_000), "01:00:00");
        assert_eq!(format_clock(24 * 60 * 60_000), "24:00:00");
    }

    #[test]
    fn the_tray_toggle_names_the_exact_action() {
        let mut snapshot = idle_snapshot();
        assert_eq!(toggle_text("en", &snapshot), "Start focus");
        snapshot.pending_break = Some(Phase::ShortBreak);
        assert_eq!(toggle_text("en", &snapshot), "Start break");
        snapshot.pending_break = None;
        snapshot.phase = Phase::Focus;
        assert_eq!(toggle_text("en", &snapshot), "Pause");
        snapshot.is_paused = true;
        assert_eq!(toggle_text("en", &snapshot), "Resume");
    }
}
