<script lang="ts">
  import type { Snippet } from 'svelte';

  export type ReminderTone = 'Focus' | 'Break' | 'Countdown' | 'RunningBreak';
  export type ReminderIcon = 'Coffee' | 'Check' | 'Clock' | 'Leaf';

  let {
    tone,
    icon,
    title,
    body,
    autoDismissMs = null,
    actions,
  }: {
    tone: ReminderTone;
    icon: ReminderIcon;
    title: string;
    body: string;
    autoDismissMs?: number | null;
    actions: Snippet;
  } = $props();

  const id = $props.id();
  const titleId = `l-reminder-card-title-${id}`;
  const TONE_CLASS: Record<ReminderTone, string> = {
    Focus: 'is-focus',
    Break: 'is-break',
    Countdown: 'is-countdown',
    RunningBreak: 'is-running-break',
  };
  const toneClass = $derived(TONE_CLASS[tone]);
</script>

<section class="l-reminder-card {toneClass}" aria-labelledby={titleId}>
  <span class="l-reminder-card__mark" aria-hidden="true">
    <svg class="l-reminder-card__icon" viewBox="0 0 24 24" fill="none">
      {#if icon === 'Coffee'}
        <path d="M5 10h10v4.5a4.5 4.5 0 0 1-4.5 4.5h-1A4.5 4.5 0 0 1 5 14.5V10Z" />
        <path d="M15 11h1.8a2.6 2.6 0 0 1 0 5.2H15" />
        <path d="M8 3.5v2M12 3v2.5" />
      {:else if icon === 'Check'}
        <circle cx="12" cy="12" r="8.5" />
        <path d="m8 12.3 2.7 2.7 5.4-5.6" />
      {:else if icon === 'Clock'}
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 1.8" />
      {:else}
        <path d="M19.5 4.5C11 4.5 5 9 5 15.5A3.5 3.5 0 0 0 8.5 19c6.5 0 11-6 11-14.5Z" />
        <path d="M5.5 19c1.8-5 5.3-8.2 10-10" />
      {/if}
    </svg>
  </span>
  <div class="l-reminder-card__copy">
    <h2 class="l-reminder-card__title" id={titleId}>{title}</h2>
    <p class="l-reminder-card__body">{body}</p>
  </div>
  <div class="l-reminder-card__actions">
    {@render actions()}
  </div>
  {#if autoDismissMs}
    <span
      class="l-reminder-card__deadline"
      style:animation-duration={`${autoDismissMs}ms`}
      aria-hidden="true"
    ></span>
  {/if}
</section>

<style>
  .l-reminder-card {
    --reminder-accent: var(--sk-color-brand);
    --reminder-wash: var(--sk-color-brand-soft);
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--sk-space-sm) var(--sk-space-md);
    overflow: hidden;
    padding: var(--sk-space-lg);
    border: var(--sk-edge) solid hsl(var(--reminder-accent) / 0.32);
    border-radius: var(--sk-radius-lg);
    background:
      radial-gradient(circle at 0 0, hsl(var(--reminder-wash) / 0.9), transparent 56%),
      hsl(var(--sk-color-bg-surface));
    box-shadow: var(--sk-shadow-card);
  }

  .l-reminder-card.is-break,
  .l-reminder-card.is-running-break {
    --reminder-accent: var(--sk-color-break);
    --reminder-wash: var(--sk-color-break-soft);
  }

  .l-reminder-card.is-countdown {
    --reminder-accent: var(--sk-color-countdown);
    --reminder-wash: var(--sk-color-countdown-soft);
  }

  .l-reminder-card__mark {
    display: grid;
    place-items: center;
    inline-size: var(--sk-brand-mark-size);
    block-size: var(--sk-brand-mark-size);
    border-radius: var(--sk-radius-full);
    color: hsl(var(--reminder-accent));
    background: hsl(var(--reminder-wash));
  }

  .l-reminder-card__icon {
    inline-size: var(--sk-icon-size);
    block-size: var(--sk-icon-size);
    stroke: currentColor;
    stroke-width: var(--sk-icon-stroke);
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .l-reminder-card__copy {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-2xs);
    min-inline-size: 0;
  }

  .l-reminder-card__title {
    margin: 0;
    font-size: var(--sk-text-lg);
    font-weight: var(--sk-weight-semibold);
    line-height: var(--sk-leading-tight);
    letter-spacing: var(--sk-tracking-tight);
  }

  .l-reminder-card__body {
    margin: 0;
    color: hsl(var(--sk-color-text-muted));
    font-size: var(--sk-text-sm);
  }

  .l-reminder-card__actions {
    display: flex;
    flex-wrap: wrap;
    grid-column: 1 / -1;
    gap: var(--sk-space-sm);
    margin-block-start: var(--sk-space-2xs);
  }

  .l-reminder-card__deadline {
    position: absolute;
    inset-inline: 0;
    inset-block-end: 0;
    block-size: var(--sk-space-3xs);
    background: hsl(var(--reminder-accent) / 0.55);
    transform-origin: left center;
    animation-name: l-reminder-card-countdown;
    animation-timing-function: linear;
    animation-fill-mode: forwards;
  }

  @media (prefers-reduced-motion: no-preference) {
    .l-reminder-card {
      animation: l-reminder-card-enter var(--sk-duration-slow) var(--sk-ease-standard) both;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .l-reminder-card__deadline {
      display: none;
    }
  }

  @keyframes l-reminder-card-enter {
    from {
      opacity: 0;
      transform: translateY(var(--sk-space-xs)) scale(0.985);
    }
  }

  @keyframes l-reminder-card-countdown {
    from {
      transform: scaleX(1);
    }

    to {
      transform: scaleX(0);
    }
  }
</style>
