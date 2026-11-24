/** Wire values mirror the Rust enums; enum variants stay PascalCase. */
export type Phase = 'Idle' | 'Focus' | 'ShortBreak' | 'LongBreak' | 'Countdown';

export type Theme = 'System' | 'Light' | 'Dark';
export type Palette =
  | 'Forest'
  | 'Ocean'
  | 'Ember'
  | 'Plum'
  | 'Slate'
  | 'Rose'
  | 'Aurora'
  | 'Sand'
  | 'Moss'
  | 'Ink'
  | 'Dusk'
  | 'Clay';
export type OverlaySize = 'S' | 'M' | 'L';
export type SoundPreset = 'Chime' | 'Soft' | 'Bell' | 'Custom' | 'Off';
export type SessionKind = 'Focus' | 'ShortBreak' | 'LongBreak' | 'Countdown';
export type SessionOutcome = 'Completed' | 'Skipped' | 'Reset' | 'Interrupted';

/** In-app reminder card selected by Rust at a phase boundary. */
export type TimerNotice =
  | { kind: 'FocusDone'; sessionId: string; minutes: number }
  | { kind: 'BreakDone' }
  | { kind: 'CountdownDone'; minutes: number };

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
  size: OverlaySize;
  /** Content opacity in percent, 40-100. */
  opacity: number;
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  preset: SoundPreset;
  /** Playback volume in percent, 0-100. */
  volume: number;
  customPath: string | null;
  tick: boolean;
}

export interface GeneralSettings {
  launchAtLogin: boolean;
  startMinimized: boolean;
  theme: Theme;
  palette: Palette;
  reduceMotion: boolean;
  locale: string | null;
}

export interface UpdateSettings {
  autoCheck: boolean;
  metrics: boolean;
  skippedVersion: string | null;
  snoozeUntilMs: number | null;
}

/** Wire values mirror the Rust updater state machine. */
export type UpdatePhase =
  | 'Idle'
  | 'Checking'
  | 'Available'
  | 'Downloading'
  | 'Ready'
  | 'Installing'
  | 'UpToDate'
  | 'Failed';

export interface UpdateStatus {
  supported: boolean;
  phase: UpdatePhase;
  version: string | null;
  notes: string | null;
  pubDate: string | null;
  downloaded: number;
  total: number | null;
  lastCheckedMs: number | null;
  lastError: string | null;
  prompt: boolean;
  autoCheck: boolean;
  skippedVersion: string | null;
  snoozeUntilMs: number | null;
}

export interface Settings {
  timer: TimerConfig;
  overlay: OverlaySettings;
  notifications: NotificationSettings;
  general: GeneralSettings;
  update: UpdateSettings;
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
  /** Normalized user tag, or null when the session has none. */
  tag: string | null;
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

export type InsightsRange = 'today' | 'week' | 'month' | 'year';

export interface InsightsTotals {
  focusMs: number;
  rounds: number;
  streakDays: number;
}

export interface InsightsDay {
  date: string;
  focusMs: number;
  rounds: number;
}

export interface InsightsTag {
  tag: string;
  focusMs: number;
}

export interface InsightsPayload {
  range: InsightsRange;
  totals: InsightsTotals;
  days: InsightsDay[];
  heatmap: InsightsDay[];
  tags: InsightsTag[];
}

export interface Diagnostics {
  version: string;
  os: string;
  arch: string;
  webview: string;
  locale: string;
  theme: string;
  palette: string;
  logDir: string;
  logSize: number;
  recentLogs: string[];
}
