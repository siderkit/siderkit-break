# README assets

These images are captured from the running app. They are not mockups, and the UI text is not retouched.

| File                | Source                                                                     | Intrinsic size |
| ------------------- | -------------------------------------------------------------------------- | -------------- |
| `hero.png`          | `hero.html`, composed from the screenshots below                           | 1280 × 640     |
| `hero-neutral.png`  | `hero-neutral.html`, no headline text                                      | 1280 × 640     |
| `main-focus.png`    | `http://localhost:1420/` at 360 × 600, 2×                                  | 720 × 1200     |
| `break-running.png` | `http://localhost:1420/break.html` with a running short break, transparent | 720 × 400      |
| `overlay-focus.png` | `http://localhost:1420/overlay.html` at 128 × 32, transparent              | 256 × 64       |
| `settings.png`      | Settings → Timer                                                           | 720 × 1200     |
| `languages.png`     | Settings → General → Language                                              | 720 × 1200     |

## Regenerating

1. Install dependencies and start the Vite preview:

   ```bash
   pnpm install
   pnpm dev
   ```

2. Capture each app page at the viewport listed above with a 2× device scale factor. Use a Chrome DevTools Protocol client, for example with a 9222 debugging port:

   ```bash
   chrome --remote-debugging-port=9222 --user-data-dir=<temp-profile>
   ```

3. For the running states, inject the timer snapshot before the screenshot. The browser preview exposes the store at `/src/lib/timer-store.svelte.ts`; set `timerStore.snapshot` and `timerStore.summary` to the values shown in the image.

4. Open `hero.html` or `hero-neutral.html` through the dev server at a 1280 × 640 viewport and capture at 1×. The HTML files use the screenshots above and CSS-only shadows and gradients.

5. Keep the transparent background of the break cards and the overlay. The card shadow is part of the PNG.

## Rules

- Use the English UI for the main screenshots. Localized READMEs use the neutral hero.
- Do not redraw controls, change copy, or composite a different product into the image.
- Remove personal data, account names, and paths before capturing.
- Keep the same background, corner radius, shadow, and scale across a batch.
- Prefer text or command output for evidence that does not need a visual check.
