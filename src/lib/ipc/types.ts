/** Wire values mirror the Rust enums; enum variants stay PascalCase. */
export type Phase = 'Idle' | 'Focus' | 'ShortBreak' | 'LongBreak' | 'Countdown';

export type Theme = 'System' | 'Light' | 'Dark';
export type Palette = 'Forest' | 'Ocean' | 'Ember' | 'Plum' | 'Slate' | 'Rose' | 'Aurora' | 'Sand';
export type SessionKind = 'Focus' | 'ShortBreak' | 'LongBreak' | 'Countdown';
export type SessionOutcome = 'Completed' | 'Skipped' | 'Reset' | 'Interrupted';

/** In-app reminder card selected by Rust at a phase boundary. */
export type TimerNotice =
  { kind: 'FocusDone' } | { kind: 'BreakDone' } | { kind: 'CountdownDone'; minutes: number };

export interface TimerSnapshot {
  phase: Phase;
  isPaused: boolean;
  remainingMs: number;
  plannedMs: number;
  endsAtMs: number | null;
  cycleIndex: number;
  completedFocusCount: number;
  startedAtMs: number | null;
  interruptions: number;
  pendingBreak: Phase | null;
}

export interface TimerConfig {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
}

export interface OverlaySettings {
  enabled: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
}

export interface GeneralSettings {
  launchAtLogin: boolean;
  startMinimized: boolean;
  theme: Theme;
  palette: Palette;
  locale: string | null;
}

export interface Settings {
  timer: TimerConfig;
  overlay: OverlaySettings;
  notifications: NotificationSettings;
  general: GeneralSettings;
}

export interface TodaySummary {
  completedFocus: number;
  focusMs: number;
  completedCountdown: number;
  countdownMs: number;
}

export interface HistorySession {
  id: string;
  kind: SessionKind;
  startedAtMs: number;
  endedAtMs: number;
  plannedMs: number;
  actualMs: number;
  outcome: SessionOutcome;
  interruptions: number;
}

export interface HistoryDay {
  date: string;
  completedFocus: number;
  focusMs: number;
  completedCountdown: number;
  countdownMs: number;
  breakCount: number;
  breakMs: number;
  sessions: HistorySession[];
}

export interface History {
  days: HistoryDay[];
}

/** One continuous-scroll slice; `hasMore` means older sessions exist. */
export interface HistoryWindow {
  days: HistoryDay[];
  hasMore: boolean;
}

/** Lightweight totals for the export range preview. */
export interface HistoryRangeSummary {
  sessions: number;
  days: number;
  focusMs: number;
  breakMs: number;
  countdownMs: number;
}
