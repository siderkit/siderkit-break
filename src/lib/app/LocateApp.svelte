<script lang="ts">
  import { onMount } from 'svelte';

  import { m } from '../../paraglide/messages.js';
  import { isTauri, onLocateReset, onLocateShow } from '../ipc/client';

  let generation = $state(0);
  let playing = $state(false);

  onMount(() => {
    if (!isTauri) {
      return;
    }
    const stops: Array<() => void> = [];
    void onLocateShow(() => {
      generation += 1;
      playing = true;
    }).then((unlisten) => {
      stops.push(unlisten);
    });
    void onLocateReset(() => {
      playing = false;
    }).then((unlisten) => {
      stops.push(unlisten);
    });
    return () => {
      for (const stop of stops) {
        stop();
      }
    };
  });
</script>

<div class="l-locate" aria-hidden="true">
  {#key generation}
    <div class="l-locate__echo" class:is-playing={playing}></div>
    <div class="l-locate__echo l-locate__echo--late" class:is-playing={playing}></div>
    <div class="l-locate__frame" class:is-playing={playing}>
      <span class="l-locate__glow"></span>
    </div>
    <span class="l-locate__label" class:is-playing={playing}>{m['overlay.locate']()}</span>
  {/key}
</div>

<style>
  .l-locate {
    position: fixed;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .l-locate__echo,
  .l-locate__frame {
    position: absolute;
    top: var(--sk-locate-center-y);
    left: var(--sk-locate-center-x);
    inline-size: var(--sk-locate-frame-size);
    block-size: var(--sk-locate-frame-size);
    margin-block-start: calc(var(--sk-locate-frame-size) / -2);
    margin-inline-start: calc(var(--sk-locate-frame-size) / -2);
    border-radius: var(--sk-locate-frame-radius);
    opacity: 0;
  }

  .l-locate__echo {
    border: var(--sk-locate-echo-stroke) solid hsl(var(--sk-color-brand) / 0.6);
  }

  .l-locate__echo.is-playing {
    animation: l-locate-echo var(--sk-locate-echo-duration) var(--sk-ease-standard) 2 both;
    animation-delay: var(--sk-locate-echo-delay);
  }

  .l-locate__echo--late.is-playing {
    animation-delay: calc(var(--sk-locate-echo-delay) + var(--sk-duration-slow));
  }

  .l-locate__frame {
    border: var(--sk-locate-frame-stroke) solid hsl(var(--sk-color-brand) / 0.9);
    background: hsl(var(--sk-color-brand) / 0.07);
    box-shadow:
      0 0 var(--sk-locate-frame-halo-blur) var(--sk-locate-frame-halo-spread)
        hsl(var(--sk-color-brand) / 0.18),
      var(--sk-shadow-card);
  }

  .l-locate__frame.is-playing {
    animation: l-locate-frame-in var(--sk-locate-frame-in-duration) var(--sk-ease-standard) both;
  }

  /* A soft fill pulse inside the outline keeps the frame alive without moving
     it, so the droplet never looks like it is drifting. */
  .l-locate__glow {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: hsl(var(--sk-color-brand) / 0.16);
    opacity: 0;
  }

  .l-locate__frame.is-playing .l-locate__glow {
    animation: l-locate-glow var(--sk-locate-glow-duration) var(--sk-ease-standard)
      var(--sk-locate-frame-in-duration) infinite alternate;
  }

  /* The label sits close above the frame so the hint reads as one unit. */
  .l-locate__label {
    position: absolute;
    top: calc(var(--sk-locate-center-y) - var(--sk-locate-label-gap));
    left: var(--sk-locate-center-x);
    padding: var(--sk-locate-label-padding-block) var(--sk-locate-label-padding-inline);
    transform: translate(-50%, -100%);
    border-radius: var(--sk-radius-sm);
    color: hsl(var(--sk-color-on-brand));
    background: hsl(var(--sk-color-brand));
    box-shadow: var(--sk-shadow-card);
    font-size: var(--sk-text-sm);
    font-weight: var(--sk-weight-semibold);
    line-height: var(--sk-leading-tight);
    white-space: nowrap;
    opacity: 0;
  }

  .l-locate__label::after {
    position: absolute;
    top: 100%;
    left: 50%;
    border: var(--sk-locate-label-arrow) solid transparent;
    border-block-start-color: hsl(var(--sk-color-brand));
    content: '';
    transform: translateX(-50%);
  }

  .l-locate__label.is-playing {
    animation: l-locate-label-in var(--sk-duration-slow) var(--sk-ease-standard) both;
    animation-delay: var(--sk-duration-fast);
  }

  @keyframes l-locate-frame-in {
    0% {
      opacity: 0;
      transform: scale(0.78);
    }
    55% {
      opacity: 1;
      transform: scale(1.05);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes l-locate-glow {
    0% {
      opacity: 0.12;
      transform: scale(0.94);
    }
    100% {
      opacity: 0.55;
      transform: scale(1.06);
    }
  }

  @keyframes l-locate-echo {
    0% {
      opacity: 0;
      transform: scale(0.9);
    }
    16% {
      opacity: 0.5;
    }
    100% {
      opacity: 0;
      transform: scale(1.6);
    }
  }

  @keyframes l-locate-label-in {
    0% {
      opacity: 0;
      transform: translate(-50%, -72%) scale(0.94);
    }
    100% {
      opacity: 1;
      transform: translate(-50%, -100%) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .l-locate__frame.is-playing {
      animation: none;
      opacity: 1;
    }

    .l-locate__frame.is-playing .l-locate__glow,
    .l-locate__echo.is-playing {
      animation: none;
      opacity: 0;
    }

    .l-locate__label.is-playing {
      animation: none;
      opacity: 1;
    }
  }
</style>
