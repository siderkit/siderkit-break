import type { Phase } from './ipc/types';

/** Pointer travel in CSS pixels before a press becomes a window drag. */
export const OVERLAY_DRAG_THRESHOLD = 4;

/** The idle droplet is the only overlay state that accepts keyboard focus. */
export function isOverlayIdle(phase: Phase): boolean {
  return phase === 'Idle';
}

/** Separates a click from a drag without waiting for pointerup. */
export function isDragGesture(originX: number, originY: number, x: number, y: number): boolean {
  return Math.hypot(x - originX, y - originY) > OVERLAY_DRAG_THRESHOLD;
}
