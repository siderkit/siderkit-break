use uuid::Uuid;

use super::model::{
    Phase, SessionKind, SessionOutcome, SessionRecord, TimerConfig, TimerError, TimerSnapshot,
    Transition, MAX_COUNTDOWN_MINUTES, MIN_MINUTES,
};

const MISSED_DEADLINE_MS: i64 = 60_000;

#[derive(Debug, Clone)]
pub struct TimerEngine {
    config: TimerConfig,
    phase: Phase,
    is_paused: bool,
    ends_at_ms: Option<i64>,
    paused_remaining_ms: Option<u64>,
    planned_ms: u64,
    started_at_ms: Option<i64>,
    cycle_index: u32,
    completed_focus_count: u32,
    interruptions: u32,
    pending_break: Option<Phase>,
}

impl TimerEngine {
    pub fn new(config: TimerConfig) -> Self {
        Self {
            config: config.normalized(),
            phase: Phase::Idle,
            is_paused: false,
            ends_at_ms: None,
            paused_remaining_ms: None,
            planned_ms: 0,
            started_at_ms: None,
            cycle_index: 0,
            completed_focus_count: 0,
            interruptions: 0,
            pending_break: None,
        }
    }

    pub fn restore(config: TimerConfig, snapshot: TimerSnapshot, now: i64) -> Self {
        let phase = snapshot.phase;
        let is_paused = snapshot.is_paused || (phase.is_active() && snapshot.ends_at_ms.is_none());
        let mut engine = Self {
            config: config.normalized(),
            phase,
            is_paused,
            ends_at_ms: snapshot.ends_at_ms,
            paused_remaining_ms: is_paused.then_some(snapshot.remaining_ms),
            planned_ms: snapshot.planned_ms,
            started_at_ms: snapshot.started_at_ms.or(if phase.is_active() {
                Some(now)
            } else {
                None
            }),
            cycle_index: snapshot.cycle_index,
            completed_focus_count: snapshot.completed_focus_count,
            interruptions: snapshot.interruptions,
            pending_break: snapshot.pending_break,
        };
        if engine.phase.is_active() && engine.planned_ms == 0 {
            engine.planned_ms = engine.config.duration_ms(engine.phase);
        }
        if engine.phase.is_active() && !engine.is_paused && engine.ends_at_ms.is_none() {
            engine.is_paused = true;
            engine.paused_remaining_ms = Some(engine.planned_ms);
        }
        engine
    }

    pub fn set_config(&mut self, config: TimerConfig) {
        self.config = config.normalized();
    }

    pub fn snapshot(&self, now: i64) -> TimerSnapshot {
        TimerSnapshot {
            phase: self.phase,
            is_paused: self.is_paused,
            remaining_ms: self.remaining_ms(now),
            planned_ms: self.planned_ms,
            ends_at_ms: self.ends_at_ms,
            cycle_index: self.cycle_index,
            completed_focus_count: self.completed_focus_count,
            started_at_ms: self.started_at_ms,
            interruptions: self.interruptions,
            pending_break: self.pending_break,
        }
    }

    pub fn start(&mut self, now: i64) -> Transition {
        if self.phase.is_active() {
            return self.settled(now);
        }
        let next = self.pending_break.take().unwrap_or(Phase::Focus);
        self.begin_phase(next, now);
        self.transition(now, None, false)
    }

    pub fn start_countdown(&mut self, minutes: u32, now: i64) -> Transition {
        if self.phase.is_active() || self.pending_break.is_some() {
            return self.settled(now);
        }
        let minutes = minutes.clamp(MIN_MINUTES, MAX_COUNTDOWN_MINUTES);
        self.begin_timed_phase(Phase::Countdown, u64::from(minutes) * 60_000, now);
        self.transition(now, None, false)
    }

    pub fn pause(&mut self, now: i64) -> Result<Transition, TimerError> {
        if !self.phase.is_active() {
            return Err(TimerError::NotRunning);
        }
        if self.is_paused {
            return Err(TimerError::AlreadyPaused);
        }
        let remaining = self.remaining_ms(now);
        if remaining == 0 {
            return Ok(self.tick(now));
        }
        self.is_paused = true;
        self.paused_remaining_ms = Some(remaining);
        self.ends_at_ms = None;
        self.interruptions = self.interruptions.saturating_add(1);
        Ok(self.settled(now))
    }

    pub fn resume(&mut self, now: i64) -> Result<Transition, TimerError> {
        if !self.phase.is_active() {
            return Err(TimerError::NotRunning);
        }
        if !self.is_paused {
            return Err(TimerError::NotPaused);
        }
        let remaining = self.paused_remaining_ms.ok_or(TimerError::NotPaused)?;
        self.is_paused = false;
        self.paused_remaining_ms = None;
        self.ends_at_ms = Some(now.saturating_add(remaining as i64));
        Ok(self.settled(now))
    }

    pub fn skip(&mut self, now: i64) -> Transition {
        self.finish(now, SessionOutcome::Skipped, false)
    }

    pub fn reset(&mut self, now: i64) -> Transition {
        let mut transition = self.finish(now, SessionOutcome::Reset, false);
        self.pending_break = None;
        transition.snapshot = self.snapshot(now);
        transition
    }

    pub fn postpone(&mut self, now: i64) -> Transition {
        if !self.phase.is_break() {
            return self.settled(now);
        }
        let postponed_phase = self.phase;
        let mut transition = self.finish(now, SessionOutcome::Skipped, false);
        self.pending_break = Some(postponed_phase);
        transition.snapshot = self.snapshot(now);
        transition
    }

    pub fn interrupt(&mut self, now: i64) -> Transition {
        self.finish(now, SessionOutcome::Interrupted, false)
    }

    pub fn tick(&mut self, now: i64) -> Transition {
        let Some(ends_at) = self.ends_at_ms else {
            return self.settled(now);
        };
        if self.is_paused || now < ends_at {
            return self.settled(now);
        }
        let missed = now.saturating_sub(ends_at) >= MISSED_DEADLINE_MS;
        self.finish(now, SessionOutcome::Completed, missed)
    }

    fn remaining_ms(&self, now: i64) -> u64 {
        if let Some(remaining) = self.paused_remaining_ms {
            return remaining.min(self.planned_ms);
        }
        let Some(ends_at) = self.ends_at_ms else {
            return 0;
        };
        let remaining = ends_at.saturating_sub(now).max(0) as u64;
        remaining.min(self.planned_ms)
    }

    fn begin_phase(&mut self, phase: Phase, now: i64) {
        self.begin_timed_phase(phase, self.config.duration_ms(phase), now);
    }

    fn begin_timed_phase(&mut self, phase: Phase, planned_ms: u64, now: i64) {
        self.phase = phase;
        self.is_paused = false;
        self.planned_ms = planned_ms;
        self.ends_at_ms = Some(now.saturating_add(self.planned_ms as i64));
        self.paused_remaining_ms = None;
        self.started_at_ms = Some(now);
        self.interruptions = 0;
        self.pending_break = None;
    }

    fn finish(&mut self, now: i64, outcome: SessionOutcome, missed: bool) -> Transition {
        if !self.phase.is_active() {
            return self.settled(now);
        }
        let ended_phase = self.phase;
        let session = self.session_record(now, outcome);
        self.clear_phase();
        if ended_phase == Phase::Focus && outcome == SessionOutcome::Completed {
            self.complete_focus(now, missed);
        } else if ended_phase == Phase::LongBreak {
            self.completed_focus_count = 0;
            self.cycle_index = 0;
        }
        if ended_phase.is_break() && outcome == SessionOutcome::Completed && !missed {
            self.start_focus_if_configured(now);
        }
        self.transition(now, session, missed)
    }

    fn clear_phase(&mut self) {
        self.phase = Phase::Idle;
        self.is_paused = false;
        self.ends_at_ms = None;
        self.paused_remaining_ms = None;
        self.planned_ms = 0;
        self.started_at_ms = None;
        self.interruptions = 0;
    }

    fn complete_focus(&mut self, now: i64, missed: bool) {
        self.completed_focus_count = self.completed_focus_count.saturating_add(1);
        self.cycle_index = ((self.completed_focus_count - 1) % self.config.long_break_every) + 1;
        let next = self.break_phase();
        if self.config.auto_start_breaks && !missed {
            self.begin_phase(next, now);
        } else {
            self.pending_break = Some(next);
        }
    }

    fn start_focus_if_configured(&mut self, now: i64) {
        if self.config.auto_start_focus {
            self.begin_phase(Phase::Focus, now);
        }
    }

    fn break_phase(&self) -> Phase {
        if self.completed_focus_count > 0
            && self
                .completed_focus_count
                .is_multiple_of(self.config.long_break_every)
        {
            Phase::LongBreak
        } else {
            Phase::ShortBreak
        }
    }

    fn session_record(&self, now: i64, outcome: SessionOutcome) -> Option<SessionRecord> {
        let started_at_ms = self.started_at_ms?;
        let planned_ms = self.planned_ms;
        let actual_ms = if outcome == SessionOutcome::Completed {
            planned_ms
        } else {
            now.saturating_sub(started_at_ms).max(0) as u64
        }
        .min(planned_ms);
        Some(SessionRecord {
            id: Uuid::now_v7().to_string(),
            kind: SessionKind::from(self.phase),
            started_at_ms,
            ended_at_ms: now,
            planned_ms,
            actual_ms,
            outcome,
            interruptions: self.interruptions,
        })
    }

    fn settled(&self, now: i64) -> Transition {
        Transition {
            snapshot: self.snapshot(now),
            ended_session: None,
            phase_changed: false,
            missed_deadline: false,
        }
    }

    fn transition(
        &self,
        now: i64,
        ended_session: Option<SessionRecord>,
        missed_deadline: bool,
    ) -> Transition {
        Transition {
            snapshot: self.snapshot(now),
            ended_session,
            phase_changed: true,
            missed_deadline,
        }
    }
}
