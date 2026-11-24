/**
 * One pointer-press ripple for every clickable surface in the app.
 *
 * The listener is installed once per window instead of wiring an action into
 * every component, so new buttons, rows, chips, swatches, and tabs inherit the
 * same feedback automatically. Ripples are visual only: no element changes
 * size, and reduced-motion users keep the flat hover/press states.
 */
const RIPPLE_MS = 460;
const RIPPLE_OPACITY = 0.22;

function prefersReducedMotion(): boolean {
  return (
    document.documentElement.dataset.motion === 'Reduced' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Resolves the element that should own the ripple, or null when it is inert. */
function rippleHost(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element) || target.closest('[data-no-ripple]')) {
    return null;
  }
  if (target.closest('button:disabled, [aria-disabled="true"]')) {
    return null;
  }
  const control = target.closest('button, [role="button"], [role="tab"]');
  if (control instanceof HTMLElement) {
    return control;
  }
  // The settings switches hide a checkbox inside a full-row label; the label is
  // the clickable surface users perceive, so the ripple belongs on it.
  const input = target.closest('input[type="checkbox"], input[type="radio"]');
  const label = input?.closest('label');
  return label instanceof HTMLElement ? label : null;
}

function spawnRipple(host: HTMLElement, clientX: number, clientY: number): void {
  if (prefersReducedMotion()) {
    return;
  }
  const hostRect = host.getBoundingClientRect();
  if (hostRect.width === 0 || hostRect.height === 0) {
    return;
  }
  if (getComputedStyle(host).position === 'static') {
    host.style.position = 'relative';
  }

  const layer = document.createElement('span');
  layer.dataset.ripple = '';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = [
    'position:absolute',
    'inset:0',
    'overflow:hidden',
    'border-radius:inherit',
    'pointer-events:none',
  ].join(';');
  host.append(layer);

  const layerRect = layer.getBoundingClientRect();
  const x = clientX - layerRect.left;
  const y = clientY - layerRect.top;
  const reach = Math.hypot(Math.max(x, layerRect.width - x), Math.max(y, layerRect.height - y));
  const dot = document.createElement('span');
  dot.style.cssText = [
    'position:absolute',
    `left:${x - reach}px`,
    `top:${y - reach}px`,
    `inline-size:${reach * 2}px`,
    `block-size:${reach * 2}px`,
    'border-radius:50%',
    'background:currentColor',
    'pointer-events:none',
  ].join(';');
  layer.append(dot);

  const animation = dot.animate(
    [
      { transform: 'scale(0)', opacity: RIPPLE_OPACITY },
      { transform: 'scale(1)', opacity: 0 },
    ],
    { duration: RIPPLE_MS, easing: 'cubic-bezier(0.2, 0.7, 0.25, 1)' },
  );
  animation.onfinish = () => layer.remove();
  animation.oncancel = () => layer.remove();
}

/** Installs the shared ripple listener; safe to call once per window. */
export function installRipple(): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button !== 0) {
        return;
      }
      const host = rippleHost(event.target);
      if (host) {
        spawnRipple(host, event.clientX, event.clientY);
      }
    },
    { passive: true },
  );
  // Keyboard activation produces a click with detail 0 and no pointer event;
  // ripple from the centre so Enter and Space still show a press.
  document.addEventListener('click', (event) => {
    if (event.detail !== 0) {
      return;
    }
    const host = rippleHost(event.target);
    if (!host) {
      return;
    }
    const rect = host.getBoundingClientRect();
    spawnRipple(host, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
}
