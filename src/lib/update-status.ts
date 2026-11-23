import type { UpdatePhase, UpdateStatus } from './ipc/types';
import { downloadPercent } from './update-format.ts';

/** Visual tone of the status dot. */
export type UpdateTone = 'Muted' | 'Brand' | 'Warning' | 'Countdown' | 'Break';

/** The single action a status line offers. */
export type UpdateAction = 'Check' | 'Download' | 'Cancel' | 'Restart' | 'Retry' | 'None';

export interface UpdatePresentation {
  tone: UpdateTone;
  action: UpdateAction;
  busy: boolean;
  percent: number;
}

const PHASE_PRESENTATION: Record<UpdatePhase, UpdatePresentation> = {
  Idle: { tone: 'Muted', action: 'Check', busy: false, percent: 0 },
  Checking: { tone: 'Countdown', action: 'Check', busy: true, percent: 0 },
  Available: { tone: 'Warning', action: 'Download', busy: false, percent: 0 },
  Downloading: { tone: 'Countdown', action: 'Cancel', busy: false, percent: 0 },
  Ready: { tone: 'Brand', action: 'Restart', busy: false, percent: 100 },
  Installing: { tone: 'Countdown', action: 'Restart', busy: true, percent: 100 },
  UpToDate: { tone: 'Brand', action: 'Check', busy: false, percent: 0 },
  Failed: { tone: 'Break', action: 'Retry', busy: false, percent: 0 },
};

/**
 * Maps an updater snapshot to the tone, action, and progress the shared
 * version block renders. Platforms without auto-update get no action.
 */
export function presentUpdate(status: UpdateStatus | null): UpdatePresentation {
  if (!status) {
    return { tone: 'Muted', action: 'Check', busy: false, percent: 0 };
  }
  if (!status.supported) {
    return { tone: 'Muted', action: 'None', busy: false, percent: 0 };
  }
  const presentation = PHASE_PRESENTATION[status.phase];
  if (status.phase !== 'Downloading') {
    return presentation;
  }
  return { ...presentation, percent: downloadPercent(status.downloaded, status.total) };
}
