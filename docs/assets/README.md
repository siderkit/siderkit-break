# README assets

These images are captured from the running app. They are not mockups, and the UI text is not retouched.

| File                | Source                                                      | Intrinsic size |
| ------------------- | ----------------------------------------------------------- | -------------- |
| `hero.png`          | Composed: main window beside the break reminder card        | 1200 × 630     |
| `hero-neutral.png`  | Main window on the paper background, no headline text       | 1280 × 640     |
| `main-focus.png`    | Main window, focus running (768 × 500 client area)          | 770 × 517      |
| `break-running.png` | Break reminder card window, short break running             | 360 × 157      |
| `settings.png`      | Settings root page (768 × 500 client area)                  | 770 × 532      |
| `languages.png`     | Settings → General → Language sheet (768 × 500 client area) | 770 × 532      |

## Regenerating

1. Install dependencies and build the app, then stop any running instance.

2. Seed a deterministic demo database (about 180 days of plausible history) and
   a fixed window position, start the packaged app, and capture its real
   windows. The capture tooling prints every visible top-level window of the
   app process with exact pixel edges, resizes the main window to a 768 × 500
   client area, and drives navigation through UI Automation, so no pixel is
   hand-edited.

3. Compose `hero.png` (main window beside the reminder card) and
   `hero-neutral.png` (main window on the paper background) from those
   captures with the same layout the website's Open Graph image uses.

4. The reminder card window is transparent, so its capture keys out the empty
   black backdrop before it is placed on any background.

## Rules

- Use the English UI for the main screenshots. Localized READMEs use the neutral hero.
- Do not redraw controls, change copy, or composite a different product into the image.
- Remove personal data, account names, and paths before capturing.
- Keep the same background, corner radius, shadow, and scale across a batch.
- Prefer text or command output for evidence that does not need a visual check.
