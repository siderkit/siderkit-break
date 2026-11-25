import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const ipc = vi.hoisted(() => ({ isTauri: true, fitOverlay: vi.fn(async () => {}) }));
vi.mock('../../ipc/client.ts', () => ipc);

import { fitOverlayWidth } from './overlay-fit.util.ts';

class FakeResizeObserver {
  static readonly instances: FakeResizeObserver[] = [];
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(readonly callback: (entries: never[], observer: never) => void) {
    FakeResizeObserver.instances.push(this);
  }
}

beforeEach(() => {
  ipc.fitOverlay.mockClear();
  FakeResizeObserver.instances.length = 0;
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  // Run the scheduled frame synchronously so fits are observable at once.
  vi.stubGlobal('requestAnimationFrame', (callback: (time: number) => void) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('the action observes the node and fits immediately', () => {
  const node = document.createElement('div');
  const action = fitOverlayWidth(node);
  expect(FakeResizeObserver.instances[0]?.observe).toHaveBeenCalledWith(node);
  expect(ipc.fitOverlay).toHaveBeenCalledTimes(1);
  expect(typeof action.destroy).toBe('function');
});

test('resize events refit and destroy stops everything', () => {
  const node = document.createElement('div');
  const action = fitOverlayWidth(node);
  expect(ipc.fitOverlay).toHaveBeenCalledTimes(1);
  const observer = FakeResizeObserver.instances[0];
  observer?.callback([], null as never);
  expect(ipc.fitOverlay).toHaveBeenCalledTimes(2);
  action.destroy();
  // The observer is gone and the pending frame was cancelled, so no further
  // resize can schedule another fit.
  expect(observer?.disconnect).toHaveBeenCalledTimes(1);
});
