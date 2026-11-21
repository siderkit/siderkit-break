use serde::{Deserialize, Serialize};
use thiserror::Error;

// Defaults follow the classic Pomodoro protocol (25 focus, 5 break, a longer
// 15-minute break every 4 rounds): short enough to start without friction and
// the most widely validated baseline for sustained attention.
pub const DEFAULT_FOCUS_MINUTES: u32 = 25;
pub const DEFAULT_SHORT_BREAK_MINUTES: u32 = 5;
pub const DEFAULT_LONG_BREAK_MINUTES: u32 = 15;
pub const DEFAULT_LONG_BREAK_EVERY: u32 = 4;
pub const MIN_MINUTES: u32 = 1;
pub const MAX_MINUTES: u32 = 60;
pub const MAX_COUNTDOWN_MINUTES: u32 = 24 * 60;
pub const MIN_LONG_BREAK_EVERY: u32 = 2;
pub const MAX_LONG_BREAK_EVERY: u32 = 12;

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum Phase {
    #[default]
    Idle,
    Focus,
    ShortBreak,
    LongBreak,
    Countdown,
}

impl Phase {
    pub fn is_break(self) -> bool {
        matches!(self, Self::ShortBreak | Self::LongBreak)
    }

    pub fn is_active(self) -> bool {
        self != Self::Idle
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SessionKind {
    Focus,
    ShortBreak,
    LongBreak,
    Countdown,
}

impl From<Phase> for SessionKind {
    fn from(phase: Phase) -> Self {
        match phase {
            Phase::ShortBreak => Self::ShortBreak,
            Phase::LongBreak => Self::LongBreak,
            Phase::Countdown => Self::Countdown,
            Phase::Focus | Phase::Idle => Self::Focus,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SessionOutcome {
    Completed,
    Skipped,
    Reset,
    Interrupted,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct TimerConfig {
    pub focus_minutes: u32,
    pub short_break_minutes: u32,
    pub long_break_minutes: u32,
    pub long_break_every: u32,
    pub auto_start_breaks: bool,
    pub auto_start_focus: bool,
}

impl Default for TimerConfig {
    fn default() -> Self {
        Self {
            focus_minutes: DEFAULT_FOCUS_MINUTES,
            short_break_minutes: DEFAULT_SHORT_BREAK_MINUTES,
            long_break_minutes: DEFAULT_LONG_BREAK_MINUTES,
            long_break_every: DEFAULT_LONG_BREAK_EVERY,
            auto_start_breaks: true,
            auto_start_focus: false,
        }
    }
}

impl TimerConfig {
    pub fn normalized(self) -> Self {
        Self {
            focus_minutes: self.focus_minutes.clamp(MIN_MINUTES, MAX_MINUTES),
            short_break_minutes: self.short_break_minutes.clamp(MIN_MINUTES, MAX_MINUTES),
            long_break_minutes: self.long_break_minutes.clamp(MIN_MINUTES, MAX_MINUTES),
            long_break_every: self
                .long_break_every
                .clamp(MIN_LONG_BREAK_EVERY, MAX_LONG_BREAK_EVERY),
            auto_start_breaks: self.auto_start_breaks,
            auto_start_focus: self.auto_start_focus,
        }
    }

    pub fn duration_ms(self, phase: Phase) -> u64 {
        let minutes = match phase {
            Phase::Focus => self.focus_minutes,
            Phase::ShortBreak => self.short_break_minutes,
            Phase::LongBreak => self.long_break_minutes,
            Phase::Idle | Phase::Countdown => 0,
        };
        u64::from(minutes) * 60_000
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct TimerSnapshot {
    pub phase: Phase,
    pub is_paused: bool,
    pub remaining_ms: u64,
    pub planned_ms: u64,
    pub ends_at_ms: Option<i64>,
    pub cycle_index: u32,
    pub completed_focus_count: u32,
    pub started_at_ms: Option<i64>,
    pub interruptions: u32,
    pub pending_break: Option<Phase>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionRecord {
    pub id: String,
    pub kind: SessionKind,
    pub started_at_ms: i64,
    pub ended_at_ms: i64,
    pub planned_ms: u64,
    pub actual_ms: u64,
    pub outcome: SessionOutcome,
    pub interruptions: u32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Transition {
    pub snapshot: TimerSnapshot,
    pub ended_session: Option<SessionRecord>,
    pub phase_changed: bool,
    pub missed_deadline: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum TimerError {
    #[error("the timer is not running")]
    NotRunning,
    #[error("the timer is not paused")]
    NotPaused,
    #[error("the timer is already paused")]
    AlreadyPaused,
}
