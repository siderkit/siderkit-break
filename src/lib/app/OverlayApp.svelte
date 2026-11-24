<script lang="ts">
  import { onMount } from 'svelte';
  import { getCurrentWindow } from '@tauri-apps/api/window';

  import { m } from '../../paraglide/messages.js';
  import { formatClock, phaseClass, phaseLabel } from '../utils/format.util';
  import {
    beginOverlayDrag,
    endOverlayDrag,
    isTauri,
    saveOverlayPosition,
    showMainWindow,
    showOverlayMenu,
  } from '../ipc/client';
  import { isDragGesture, isOverlayIdle } from '../utils/overlay/overlay.util';
  import { fitOverlayWidth } from '../utils/overlay/overlay-fit.util';
  import { timerStore } from '../state/timer.store.svelte.ts';
  import OverlayDroplet from '../components/OverlayDroplet.svelte';

  let pressing = $state(false);
  let dragged = $state(false);
  let pressOrigin = { x: 0, y: 0 };
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  onMount(() => {
    void timerStore.init();
    const stops: Array<() => void> = [];
    if (isTauri) {
      void getCurrentWindow()
        .onMoved(() => {
          if (saveTimer) {
            clearTimeout(saveTimer);
          }
          saveTimer = setTimeout(() => void saveOverlayPosition(), 400);
        })
        .then((unlisten) => stops.push(unlisten));
    }
    return () => {
      for (const stop of stops) {
        stop();
      }
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
      timerStore.destroy();
    };
  });

  const snapshot = $derived(timerStore.snapshot);
  const idle = $derived(isOverlayIdle(snapshot.phase));
  const phase = $derived(
    snapshot.phase === 'Idle' && snapshot.pendingBreak ? snapshot.pendingBreak : snapshot.phase,
  );
  const size = $derived(timerStore.settings.overlay.size);
  const sizeClass = $derived(`is-size-${size.toLowerCase()}`);
  const label = $derived(formatClock(snapshot.remainingMs));

  // Opacity is a content setting, not a window setting: the transparent area
  // must stay fully transparent for the click-through shape to keep working.
  $effect(() => {
    document.documentElement.style.opacity = String(timerStore.settings.overlay.opacity / 100);
    return () => {
      document.documentElement.style.opacity = '';
    };
  });
  const breakPhase = $derived(phase === 'ShortBreak' || phase === 'LongBreak');
  const description = $derived(`${phaseLabel(phase)} ${label}`);
  const idleLabel = $derived(snapshot.pendingBreak ? m['overlay.breakReady']() : m['tray.open']());

  function startPress(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
    pressing = true;
    dragged = false;
    pressOrigin = { x: event.clientX, y: event.clientY };
    const target = event.currentTarget;
    if (target instanceof HTMLElement) {
      target.setPointerCapture(event.pointerId);
    }
  }

  function trackPress(event: PointerEvent): void {
    if (!pressing || dragged) {
      return;
    }
    if (!isDragGesture(pressOrigin.x, pressOrigin.y, event.clientX, event.clientY)) {
      return;
    }
    dragged = true;
    // Native dragging takes over from pointer capture; release it first so the
    // window manager, not the webview, receives the rest of the gesture.
    releasePointer(event);
    if (isTauri) {
      void beginOverlayDrag().catch(() => {
        dragged = false;
      });
    }
  }

  function endPress(event: PointerEvent): void {
    if (!pressing) {
      return;
    }
    pressing = false;
    releasePointer(event);
    if (isTauri) {
      void endOverlayDrag();
    }
    if (!dragged) {
      void showMainWindow();
    }
  }

  function cancelPress(event: PointerEvent): void {
    pressing = false;
    dragged = false;
    releasePointer(event);
    if (isTauri) {
      void endOverlayDrag();
    }
  }

  /** Pointer capture keeps the press alive when the pointer leaves the window. */
  function releasePointer(event: PointerEvent): void {
    const target = event.currentTarget;
    if (target instanceof HTMLElement && target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  }

  function openMenu(event: MouseEvent): void {
    event.preventDefault();
    void showOverlayMenu();
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      void showMainWindow();
    } else if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault();
      void showOverlayMenu();
    }
  }
</script>

{#if idle}
  <div
    class="l-overlay-drop"
    role="button"
    data-no-ripple
    tabindex="0"
    aria-label={idleLabel}
    title={idleLabel}
    onpointerdown={startPress}
    onpointermove={trackPress}
    onpointerup={endPress}
    onpointercancel={cancelPress}
    oncontextmenu={openMenu}
    onkeydown={onKeydown}
  >
    <OverlayDroplet pending={snapshot.pendingBreak !== null} idle />
  </div>
{:else}
  <div
    class="l-overlay-text {phaseClass(phase)} {sizeClass}"
    class:is-paused={snapshot.isPaused}
    data-no-ripple
    use:fitOverlayWidth
    role="timer"
    aria-label={description}
    title={description}
    onpointerdown={startPress}
    onpointermove={trackPress}
    onpointerup={endPress}
    onpointercancel={cancelPress}
    oncontextmenu={openMenu}
  >
    <span class="l-overlay-text__drop" aria-hidden="true">
      <OverlayDroplet />
    </span>
    <span class="l-overlay-text__time" aria-hidden="true">
      {#if breakPhase}<span class="l-overlay-text__phase">{m['overlay.break']()}</span>{/if}{label}
    </span>
  </div>
{/if}

<style>
  .l-overlay-drop {
    --overlay-drop-size: var(--sk-overlay-drop-size-m);
    display: flex;
    align-items: center;
    justify-content: center;
    block-size: 100%;
    overflow: hidden;
    background: transparent;
    cursor: grab;
  }

  .l-overlay-drop:focus-visible {
    outline: var(--sk-edge) dashed hsl(var(--sk-color-brand));
    outline-offset: calc(-1 * var(--sk-edge));
  }

  .l-overlay-text {
    --overlay-drop-size: var(--sk-overlay-drop-size-m);
    --overlay-text-size: var(--sk-text-overlay-m);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    inline-size: max-content;
    block-size: 100%;
    padding-inline: var(--sk-space-3xs);
    overflow: hidden;
    background: transparent;
    cursor: grab;
  }

  .l-overlay-text.is-size-s {
    --overlay-drop-size: var(--sk-overlay-drop-size-s);
    --overlay-text-size: var(--sk-text-overlay-s);
  }

  .l-overlay-text.is-size-l {
    --overlay-drop-size: var(--sk-overlay-drop-size-l);
    --overlay-text-size: var(--sk-text-overlay-l);
  }

  .l-overlay-drop:active {
    cursor: grabbing;
  }

  /* Pinned to the same center as the idle droplet: 2px inset + 18px icon / 2.
     The clock is free to change width without dragging the droplet with it. */
  .l-overlay-text__drop {
    position: absolute;
    top: 50%;
    left: var(--sk-space-3xs);
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: var(--overlay-drop-size);
    block-size: var(--overlay-drop-size);
    transform: translateY(-50%);
  }

  .l-overlay-text:active {
    cursor: grabbing;
  }

  .l-overlay-text__time {
    position: relative;
    z-index: 0;
    inline-size: max-content;
    padding-left: calc(var(--overlay-drop-size) + var(--sk-space-xs));
    overflow: visible;
    color: hsl(var(--sk-color-text));
    font-size: var(--overlay-text-size);
    font-weight: var(--sk-weight-semibold);
    font-variant-numeric: tabular-nums;
    letter-spacing: var(--sk-tracking-tight);
    line-height: var(--sk-leading-none);
    text-align: start;
    white-space: nowrap;
  }

  .l-overlay-text.is-focus .l-overlay-text__time {
    color: hsl(var(--sk-color-brand));
  }

  .l-overlay-text__phase {
    margin-inline-end: var(--sk-space-3xs);
    color: hsl(var(--sk-color-break));
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: var(--sk-tracking-wide);
    vertical-align: var(--sk-space-3xs);
  }

  .l-overlay-text.is-break .l-overlay-text__time {
    color: hsl(var(--sk-color-break));
  }

  .l-overlay-text.is-countdown .l-overlay-text__time {
    color: hsl(var(--sk-color-countdown));
  }

  .l-overlay-text.is-idle .l-overlay-text__time {
    color: hsl(var(--sk-color-brand-strong));
  }

  .l-overlay-text.is-paused .l-overlay-text__time {
    color: hsl(var(--sk-color-warning));
  }
</style>
