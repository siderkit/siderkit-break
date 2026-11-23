import { getVersion } from '@tauri-apps/api/app';
import type { UnlistenFn } from '@tauri-apps/api/event';

import {
  cancelUpdateDownload,
  checkForUpdate,
  clearSkippedUpdate,
  downloadUpdate,
  getUpdateStatus,
  installUpdate,
  isTauri,
  onUpdateStatus,
  skipUpdateVersion,
  snoozeUpdate,
} from './ipc/client';
import type { UpdateStatus } from './ipc/types';

/**
 * Shared updater state for the main window. Rust remains authoritative; this
 * store only mirrors the status event and turns buttons into commands.
 */
class UpdateStore {
  status = $state<UpdateStatus | null>(null);
  currentVersion = $state('');
  error = $state<string | null>(null);
  dismissedVersion = $state<string | null>(null);

  private started = false;
  private unlisten: UnlistenFn[] = [];

  async init(): Promise<void> {
    if (this.started) {
      return;
    }
    this.started = true;
    if (!isTauri) {
      this.currentVersion = '0.0.0';
      return;
    }
    try {
      this.currentVersion = await getVersion();
    } catch {
      this.currentVersion = '0.0.0';
    }
    try {
      this.unlisten.push(
        await onUpdateStatus((next) => {
          this.apply(next);
        }),
      );
      this.apply(await getUpdateStatus());
    } catch (error) {
      this.fail(error);
    }
  }

  destroy(): void {
    for (const unlisten of this.unlisten) {
      unlisten();
    }
    this.unlisten = [];
    this.started = false;
  }

  get visible(): boolean {
    const status = this.status;
    if (!status) {
      return false;
    }
    if (status.version !== null && this.dismissedVersion === status.version) {
      return false;
    }
    switch (status.phase) {
      case 'Available':
      case 'Ready':
        return status.prompt;
      case 'Downloading':
      case 'Installing':
        return true;
      case 'Failed':
        return status.version !== null;
      default:
        return false;
    }
  }

  /** The header dot only marks a new version the user can act on. */
  get badgeVisible(): boolean {
    const status = this.status;
    if (!this.visible || status === null) {
      return false;
    }
    return status.phase === 'Available' || status.phase === 'Ready';
  }

  async checkNow(): Promise<void> {
    await this.run(() => checkForUpdate(true));
  }

  async download(): Promise<void> {
    await this.run(downloadUpdate);
  }

  async cancel(): Promise<void> {
    await this.run(cancelUpdateDownload);
  }

  install(): void {
    this.error = null;
    void installUpdate().catch((error: unknown) => {
      this.fail(error);
    });
  }

  async later(): Promise<void> {
    await this.run(() => snoozeUpdate(24));
  }

  async skip(): Promise<void> {
    const version = this.status?.version;
    if (!version) {
      return;
    }
    await this.run(() => skipUpdateVersion(version));
  }

  async restoreSkipped(): Promise<void> {
    await this.run(clearSkippedUpdate);
  }

  dismiss(): void {
    this.dismissedVersion = this.status?.version ?? null;
  }

  clearError(): void {
    this.error = null;
  }

  fail(error: unknown): void {
    this.error = messageFor(error);
  }

  private apply(next: UpdateStatus): void {
    // A new version deserves a fresh banner even if the old one was dismissed.
    if (next.version !== null && next.version !== this.status?.version) {
      this.dismissedVersion = null;
    }
    this.status = next;
  }

  private async run(action: () => Promise<UpdateStatus>): Promise<void> {
    this.error = null;
    try {
      this.apply(await action());
    } catch (error) {
      this.fail(error);
    }
  }
}

export const updateStore = new UpdateStore();

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
