<script lang="ts">
  let {
    pending = false,
    moving = false,
    idle = false,
  }: { pending?: boolean; moving?: boolean; idle?: boolean } = $props();

  const uid = $props.id();
  const bodyId = `l-overlay-droplet-body-${uid}`;
  const sheenId = `l-overlay-droplet-sheen-${uid}`;
</script>

<div
  class="l-overlay-droplet"
  class:is-pending={pending}
  class:is-move={moving}
  class:is-idle={idle}
  aria-hidden="true"
>
  <svg class="l-overlay-droplet__shape" viewBox="0 0 32 35">
    <defs>
      <linearGradient id={bodyId} x1="12" y1="2" x2="22" y2="30" gradientUnits="userSpaceOnUse">
        <stop class="l-overlay-droplet__stop-top" offset="0" />
        <stop class="l-overlay-droplet__stop-middle" offset="0.52" />
        <stop class="l-overlay-droplet__stop-bottom" offset="1" />
      </linearGradient>
      <radialGradient id={sheenId} cx="0.34" cy="0.26" r="0.62">
        <stop class="l-overlay-droplet__stop-sheen" offset="0" />
        <stop class="l-overlay-droplet__stop-clear" offset="0.78" stop-opacity="0" />
      </radialGradient>
    </defs>
    <path
      class="l-overlay-droplet__body"
      fill="url(#{bodyId})"
      d="M16 1.2C20.6 9.4 29.4 13.6 29.4 21A13.4 13.4 0 0 1 2.6 21C2.6 13.6 11.4 9.4 16 1.2Z"
    />
    <path
      class="l-overlay-droplet__sheen"
      fill="url(#{sheenId})"
      d="M16 1.2C20.6 9.4 29.4 13.6 29.4 21A13.4 13.4 0 0 1 2.6 21C2.6 13.6 11.4 9.4 16 1.2Z"
    />
    <ellipse
      class="l-overlay-droplet__spark"
      cx="11.2"
      cy="13.2"
      rx="1.6"
      ry="2.5"
      transform="rotate(-30 11.2 13.2)"
    />
    <ellipse
      class="l-overlay-droplet__spark-soft"
      cx="9.6"
      cy="17.4"
      rx="0.8"
      ry="1.2"
      transform="rotate(-30 9.6 17.4)"
    />
    <path class="l-overlay-droplet__reflection" d="M19.6 29.4Q24 27.9 26.4 23.8" />
  </svg>
</div>

<style>
  .l-overlay-droplet {
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: 100%;
    block-size: 100%;
  }

  .l-overlay-droplet__shape {
    display: block;
    inline-size: var(--overlay-drop-size);
    block-size: var(--overlay-drop-size);
    overflow: visible;
    filter: drop-shadow(var(--sk-shadow-droplet));
    transition:
      transform var(--sk-duration-base) var(--sk-ease-standard),
      opacity var(--sk-duration-base) var(--sk-ease-standard),
      filter var(--sk-duration-base) var(--sk-ease-standard);
  }

  .l-overlay-droplet__body {
    stroke: hsl(var(--sk-drop-outline));
    stroke-width: var(--sk-drop-stroke);
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }

  .l-overlay-droplet__sheen {
    stroke: none;
  }

  .l-overlay-droplet__stop-top {
    stop-color: hsl(var(--sk-drop-body-top));
  }

  .l-overlay-droplet__stop-middle {
    stop-color: hsl(var(--sk-drop-body-middle));
  }

  .l-overlay-droplet__stop-bottom {
    stop-color: hsl(var(--sk-drop-body-bottom));
  }

  .l-overlay-droplet__stop-sheen {
    stop-color: hsl(var(--sk-drop-shine-soft));
  }

  .l-overlay-droplet__stop-clear {
    stop-color: hsl(var(--sk-drop-shine-soft));
  }

  .l-overlay-droplet__spark {
    fill: hsl(var(--sk-drop-shine));
  }

  .l-overlay-droplet__spark-soft {
    fill: hsl(var(--sk-drop-shine-soft));
  }

  .l-overlay-droplet__reflection {
    fill: none;
    stroke: hsl(var(--sk-drop-inner-rim));
    stroke-width: var(--sk-drop-rim-stroke);
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
  }

  .l-overlay-droplet:hover .l-overlay-droplet__shape,
  .l-overlay-droplet:focus-visible .l-overlay-droplet__shape {
    transform: scale(1.08);
    filter: drop-shadow(var(--sk-shadow-droplet-hover));
  }

  .l-overlay-droplet.is-idle:hover .l-overlay-droplet__shape,
  .l-overlay-droplet.is-idle:focus-visible .l-overlay-droplet__shape {
    transform: scale(1.04);
    opacity: var(--sk-overlay-drop-hover-opacity);
    filter: drop-shadow(var(--sk-shadow-droplet));
  }

  .l-overlay-droplet.is-idle:hover .l-overlay-droplet__reflection,
  .l-overlay-droplet.is-idle:focus-visible .l-overlay-droplet__reflection {
    stroke: hsl(var(--sk-drop-inner-rim-strong));
  }

  .l-overlay-droplet.is-pending .l-overlay-droplet__shape {
    animation: l-overlay-droplet-pulse 2.4s var(--sk-ease-standard) infinite;
  }

  .l-overlay-droplet.is-move .l-overlay-droplet__shape {
    filter: drop-shadow(0 0 var(--sk-overlay-drop-blur) hsl(var(--sk-drop-move-outline)))
      var(--sk-shadow-droplet);
  }

  @keyframes l-overlay-droplet-pulse {
    0%,
    100% {
      filter: drop-shadow(var(--sk-shadow-droplet));
    }
    50% {
      filter: drop-shadow(0 0 var(--sk-overlay-drop-blur) hsl(var(--sk-drop-pulse-rim)))
        drop-shadow(0 0 var(--sk-overlay-drop-blur) hsl(var(--sk-drop-pulse-halo)))
        var(--sk-shadow-droplet);
    }
  }
</style>
