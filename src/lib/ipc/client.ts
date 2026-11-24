import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

import type {
  Diagnostics,
  History,
  HistoryRangeSummary,
  HistoryWindow,
  InsightsPayload,
  InsightsRange,
  Settings,
  SoundPreset,
  TimerNotice,
  TimerSnapshot,
  TodaySummary,
  UpdateStatus,
} from './types';
import { PROJECT_URL } from '../project';

/** True inside a Tauri webview; false in a plain browser design preview. */
export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export { PROJECT_URL };

/** Opens the project page in the default browser. */
export function openProjectPage(): Promise<void> {
  if (!isTauri) {
    window.open(PROJECT_URL, '_blank', 'noopener,noreferrer');
    return Promise.resolve();
  }
  return invoke<void>('open_project_page');
}

/** Opens the privacy policy in the default browser. */
export function openPrivacyPage(): Promise<void> {
  if (!isTauri) {
    window.open(`${PROJECT_URL}/blob/main/PRIVACY.md`, '_blank', 'noopener,noreferrer');
    return Promise.resolve();
  }
  return invoke<void>('open_privacy_page');
}

/** Reads the authoritative timer snapshot from the Rust engine. */
export function getState(): Promise<TimerSnapshot> {
  return invoke<TimerSnapshot>('get_state');
}

/** Reads the persisted settings; the Rust side normalizes the values. */
export function getSettings(): Promise<Settings> {
  return invoke<Settings>('get_settings');
}

/** Persists settings and returns the normalized copy applied by Rust. */
export function updateSettings(settings: Settings): Promise<Settings> {
  return invoke<Settings>('update_settings', { settings });
}

/** Reads the current update state without starting a request. */
export function getUpdateStatus(): Promise<UpdateStatus> {
  return invoke<UpdateStatus>('get_update_status');
}

/** Runs a check; `manual` only changes logging on the Rust side. */
export function checkForUpdate(manual = true): Promise<UpdateStatus> {
  return invoke<UpdateStatus>('check_for_update', { manual });
}

/** Starts downloading the available update in the background. */
export function downloadUpdate(): Promise<UpdateStatus> {
  return invoke<UpdateStatus>('download_update');
}

/** Aborts an in-flight download and discards its partial bytes. */
export function cancelUpdateDownload(): Promise<UpdateStatus> {
  return invoke<UpdateStatus>('cancel_update_download');
}

/** Hands the verified installer to the OS; Windows restarts into it. */
export function installUpdate(): Promise<void> {
  return invoke<void>('install_update');
}

/** Hides the banner for this version until a newer one appears. */
export function skipUpdateVersion(version: string): Promise<UpdateStatus> {
  return invoke<UpdateStatus>('skip_update_version', { version });
}

/** Clears a skipped version so it prompts again. */
export function clearSkippedUpdate(): Promise<UpdateStatus> {
  return invoke<UpdateStatus>('clear_skipped_update');
}

/** Hides the banner for the given number of hours. */
export function snoozeUpdate(hours = 24): Promise<UpdateStatus> {
  return invoke<UpdateStatus>('snooze_update', { hours });
}

/** Issues a fresh anonymous install ID and reports it again. */
export function resetMetricsId(): Promise<void> {
  return invoke<void>('reset_metrics_id');
}

/** Returns the completed focus count and focus time for the local day. */
export function getTodaySummary(): Promise<TodaySummary> {
  return invoke<TodaySummary>('get_today_summary');
}

/** Returns every stored session, grouped by local date. */
export function getHistory(): Promise<History> {
  return invoke<History>('get_history');
}

/** Loads one 30-day virtual-list slice between two local midnights. */
export function getHistoryWindow(fromMs: number, toMs: number): Promise<HistoryWindow> {
  return invoke<HistoryWindow>('get_history_window', { fromMs, toMs });
}

/** Loads the exact range selected for an Excel export. */
export function getHistoryRange(fromMs: number, toMs: number): Promise<History> {
  return invoke<History>('get_history_range', { fromMs, toMs });
}

/** Counts a range without transferring its sessions. */
export function getHistoryRangeSummary(fromMs: number, toMs: number): Promise<HistoryRangeSummary> {
  return invoke<HistoryRangeSummary>('get_history_range_summary', { fromMs, toMs });
}

/** Reads one aggregated Insights range; raw sessions never cross the IPC. */
export function getInsights(range: InsightsRange): Promise<InsightsPayload> {
  return invoke<InsightsPayload>('get_insights', { range });
}

/** Returns the most recently used tags, newest first. */
export function getRecentTags(limit = 3): Promise<string[]> {
  return invoke<string[]>('get_recent_tags', { limit });
}

/** Saves or clears one session tag; blank input clears it. */
export function setSessionTag(sessionId: string, tag: string | null): Promise<boolean> {
  return invoke<boolean>('set_session_tag', { sessionId, tag });
}

/** Permanently deletes every stored session after the confirmation dialog. */
export function clearHistory(): Promise<number> {
  return invoke<number>('clear_history');
}

/** Reads the support block shown on the Data & Privacy screen. */
export function getDiagnostics(): Promise<Diagnostics> {
  return invoke<Diagnostics>('get_diagnostics');
}

/** Deletes every log file while keeping the directory. */
export function clearLogs(): Promise<void> {
  return invoke<void>('clear_logs');
}

/** Opens the log directory in the platform file manager. */
export function openLogDir(): Promise<void> {
  return invoke<void>('open_log_dir');
}

/** Imports a custom reminder sound and returns its stored path. */
export function chooseCustomSound(): Promise<string | null> {
  return invoke<string | null>('choose_custom_sound');
}

/** Returns the full local data snapshot as pretty-printed JSON. */
export function exportData(): Promise<string> {
  return invoke<string>('export_data');
}

/** Shows the save dialog before the workbook is generated. */
export function chooseHistoryWorkbookPath(
  fileName: string,
  title: string,
  filterName: string,
): Promise<string | null> {
  return invoke<string | null>('choose_history_workbook_path', { fileName, title, filterName });
}

/** Writes a renderer-built workbook to the path the user already chose. */
export function writeHistoryWorkbook(path: string, payload: string): Promise<void> {
  return invoke<void>('write_history_workbook', { path, payload });
}

/** Opens the file manager with the saved workbook selected. */
export function revealHistoryWorkbook(path: string): Promise<void> {
  return invoke<void>('reveal_history_workbook', { path });
}

/** Starts a focus session, or the pending break when one is queued. */
export function startFocus(): Promise<TimerSnapshot> {
  return invoke<TimerSnapshot>('start_focus');
}

/** Starts the independent countdown while the pomodoro timer is idle. */
export function startCountdown(minutes: number): Promise<TimerSnapshot> {
  return invoke<TimerSnapshot>('start_countdown', { minutes });
}

/** Pauses the active phase; rejects when no phase is running. */
export function pauseTimer(): Promise<TimerSnapshot> {
  return invoke<TimerSnapshot>('pause');
}

/** Resumes a paused phase from its stored remaining time. */
export function resumeTimer(): Promise<TimerSnapshot> {
  return invoke<TimerSnapshot>('resume');
}

/** Ends the active phase and records how it ended. */
export function skipTimer(): Promise<TimerSnapshot> {
  return invoke<TimerSnapshot>('skip');
}

/** Resets the timer to idle without counting the phase as completed. */
export function resetTimer(): Promise<TimerSnapshot> {
  return invoke<TimerSnapshot>('reset');
}

/** Ends the current break and re-queues it after the given minutes. */
export function postponeBreak(minutes = 5): Promise<TimerSnapshot> {
  return invoke<TimerSnapshot>('postpone_break', { minutes });
}

/** Shows or hides the always-on-top countdown window. */
export function setOverlayVisible(visible: boolean): Promise<void> {
  return invoke<void>('set_overlay_visible', { visible });
}

/** Flashes the rounded frame and "I'm here" hint around the floating ball. */
export function locateOverlay(): Promise<void> {
  return invoke<void>('locate_overlay');
}

/** Fires when Rust asks the locate hint window to replay its animation. */
export function onLocateShow(handler: () => void): Promise<UnlistenFn> {
  return listen('locate:show', handler);
}

/** Clears the finished hint so the next show starts from a blank window. */
export function onLocateReset(handler: () => void): Promise<UnlistenFn> {
  return listen('locate:reset', handler);
}

/** Persists the overlay's current screen position after a drag. */
export function saveOverlayPosition(): Promise<void> {
  return invoke<void>('save_overlay_position');
}

/** Moves the floating ball back to its default corner and forgets the saved position. */
export function resetOverlayPosition(): Promise<void> {
  return invoke<void>('reset_overlay_position');
}

/** Starts a native drag while the hover watcher holds the window interactive. */
export function beginOverlayDrag(): Promise<void> {
  return invoke<void>('begin_overlay_drag');
}

/** Releases the drag guard after pointer-up or cancellation. */
export function endOverlayDrag(): Promise<void> {
  return invoke<void>('end_overlay_drag');
}

/** Opens the localized native context menu at the cursor. */
export function showOverlayMenu(): Promise<void> {
  return invoke<void>('show_overlay_menu');
}

/** Opens the native app menu; `editable` adds edit verbs for a text field. */
export function showContextMenu(editable: boolean): Promise<void> {
  return invoke<void>('show_context_menu', { editable });
}

/** Brings the existing main window to the front. */
export function showMainWindow(): Promise<void> {
  return invoke<void>('show_main_window');
}

/** Hides the break card while leaving the break itself running. */
export function hideBreakCard(): Promise<void> {
  return invoke<void>('hide_break_card');
}

/** Plays the built-in reminder chime without showing a system notification. */
export function previewNotificationSound(preset?: SoundPreset, volume?: number): Promise<void> {
  if (preset === undefined && volume === undefined) {
    return invoke<void>('preview_notification_sound');
  }
  return invoke<void>('preview_sound', { preset: preset ?? null, volume: volume ?? null });
}

/** Reads the reminder card Rust has open, so a late window load still shows it. */
export function getNotice(): Promise<TimerNotice | null> {
  return invoke<TimerNotice | null>('get_notice');
}

/** Dismisses the current reminder card and hides the HUD window. */
export function dismissNotice(): Promise<void> {
  return invoke<void>('dismiss_notice');
}

/** Fires when a phase boundary opens or clears the reminder card. */
export function onTimerNotice(handler: (notice: TimerNotice | null) => void): Promise<UnlistenFn> {
  return listen<TimerNotice | null>('timer:notice', (event) => handler(event.payload));
}

/** Resizes the break card window to the height its content needs. */
export function fitBreakCard(height: number): Promise<void> {
  return invoke<void>('fit_break_card', { height });
}

/** Resizes the countdown window to the width its label needs. */
export function fitOverlay(width: number): Promise<void> {
  return invoke<void>('fit_overlay', { width });
}

/** Subscribes to the once-per-second countdown tick. */
export function onTimerTick(handler: (snapshot: TimerSnapshot) => void): Promise<UnlistenFn> {
  return listen<TimerSnapshot>('timer:tick', (event) => handler(event.payload));
}

/** Subscribes to updater state changes. */
export function onUpdateStatus(handler: (status: UpdateStatus) => void): Promise<UnlistenFn> {
  return listen<UpdateStatus>('update:status', (event) => handler(event.payload));
}

/** Subscribes to command-driven state changes. */
export function onTimerState(handler: (snapshot: TimerSnapshot) => void): Promise<UnlistenFn> {
  return listen<TimerSnapshot>('timer:state', (event) => handler(event.payload));
}

/** Subscribes to phase transitions so summaries can refresh. */
export function onTimerPhase(handler: (snapshot: TimerSnapshot) => void): Promise<UnlistenFn> {
  return listen<TimerSnapshot>('timer:phase', (event) => handler(event.payload));
}

/** Fires when the deadline passed while the app was asleep or closed. */
export function onTimerMissed(handler: () => void): Promise<UnlistenFn> {
  return listen('timer:missed', handler);
}

/** Fires when the persisted locale changes in another window. */
export function onLocaleChanged(handler: () => void): Promise<UnlistenFn> {
  return listen<string | null>('locale:changed', handler);
}

/** Fires when a tray or overlay menu asks the main window to change views. */
export function onNavigate(handler: (view: string) => void): Promise<UnlistenFn> {
  return listen<string>('navigate', (event) => handler(event.payload));
}
