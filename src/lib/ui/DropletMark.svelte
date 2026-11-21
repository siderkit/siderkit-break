<script lang="ts">
  const uid = $props.id();
  const fillId = `l-droplet-mark-fill-${uid}`;
  const sheenId = `l-droplet-mark-sheen-${uid}`;
</script>

<svg class="l-droplet-mark" viewBox="0 0 32 32" aria-hidden="true">
  <defs>
    <linearGradient id={fillId} x1="10" y1="3" x2="22" y2="29" gradientUnits="userSpaceOnUse">
      <stop class="l-droplet-mark__stop-top" offset="0" />
      <stop class="l-droplet-mark__stop-bottom" offset="1" />
    </linearGradient>
    <radialGradient id={sheenId} cx="0.34" cy="0.28" r="0.52">
      <stop class="l-droplet-mark__stop-sheen" offset="0" />
      <stop class="l-droplet-mark__stop-clear" offset="1" />
    </radialGradient>
  </defs>
  <path
    class="l-droplet-mark__body"
    fill="url(#{fillId})"
    d="M16 1.2C20.6 9.4 29.4 13.6 29.4 21A13.4 13.4 0 0 1 2.6 21C2.6 13.6 11.4 9.4 16 1.2Z"
  />
  <path
    class="l-droplet-mark__sheen"
    fill="url(#{sheenId})"
    d="M16 1.2C20.6 9.4 29.4 13.6 29.4 21A13.4 13.4 0 0 1 2.6 21C2.6 13.6 11.4 9.4 16 1.2Z"
  />
  <ellipse
    class="l-droplet-mark__spark"
    cx="11.4"
    cy="13.6"
    rx="1.9"
    ry="2.7"
    transform="rotate(-28 11.4 13.6)"
  />
  <path
    class="l-droplet-mark__rim"
    d="M16 2.6C20.1 10 28.2 13.9 28.2 20.8A12.2 12.2 0 0 1 3.8 20.8C3.8 13.9 11.9 10 16 2.6Z"
  />
</svg>

<style>
  .l-droplet-mark {
    display: block;
    flex: 0 0 auto;
    inline-size: var(--sk-brand-mark-size);
    block-size: var(--sk-brand-mark-size);
    overflow: visible;
    filter: drop-shadow(var(--sk-shadow-icon-drop));
  }

  .l-droplet-mark__body,
  .l-droplet-mark__sheen {
    stroke: none;
  }

  .l-droplet-mark__stop-top {
    stop-color: hsl(var(--sk-color-brand));
  }

  .l-droplet-mark__stop-bottom {
    stop-color: hsl(var(--sk-color-brand-strong));
  }

  .l-droplet-mark__stop-sheen {
    stop-color: hsl(var(--sk-color-on-brand) / 0.9);
  }

  .l-droplet-mark__stop-clear {
    stop-color: hsl(var(--sk-color-on-brand) / 0);
  }

  .l-droplet-mark__spark {
    fill: hsl(var(--sk-color-on-brand) / 0.92);
  }

  .l-droplet-mark__rim {
    fill: none;
    stroke: hsl(var(--sk-color-on-brand) / 0.4);
    stroke-width: var(--sk-edge);
    stroke-linejoin: round;
  }
</style>
