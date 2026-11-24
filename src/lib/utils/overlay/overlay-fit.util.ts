import { fitOverlay, isTauri } from '../../ipc/client.ts';

/**
 * Keeps the countdown window exactly as wide as the label it shows. The
 * droplet sits at a fixed inset, so the gap stays small in every locale and
 * phase instead of stretching inside a fixed-width window.
 */
export function fitOverlayWidth(node: HTMLElement) {
  if (!isTauri) {
    return {};
  }

  let frame = 0;
  const fit = (): void => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      void fitOverlay(node.getBoundingClientRect().width);
    });
  };
  const observer = new ResizeObserver(fit);
  observer.observe(node);
  fit();

  return {
    destroy(): void {
      cancelAnimationFrame(frame);
      observer.disconnect();
    },
  };
}
