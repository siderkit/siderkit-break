mod engine;
mod model;

pub use engine::TimerEngine;
pub use model::{
    Phase, SessionKind, SessionOutcome, SessionRecord, TimerConfig, TimerError, TimerSnapshot,
    Transition,
};

#[cfg(test)]
mod tests;
