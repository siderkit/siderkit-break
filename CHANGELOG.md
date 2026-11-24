# Changelog

All notable changes to Siderkit Break are recorded here. The project is at the 1.0 release-candidate stage; no public binaries have been published yet.

## [Unreleased]

### Added

- **Settings rebuilt as two levels.** A root screen with seven entries and a current-value summary, plus General, Rhythm & timer, Appearance, Floating window, Reminders & sound, Data & privacy, and About. Diagnostics is a sub-page of Data & privacy. Every change saves immediately; there is no save or cancel.
- **Insights.** Today, this week, this month, and this year, with focus time, completed rounds, streak days, a 53-week heatmap, and a per-tag breakdown. Loading, empty, and error states are separate. A small chart icon in the header opens it; the tray, window, and floating-window menus carry the same entry.
- **Session tags.** Each finished focus round can carry a tag of up to 40 characters, with the last three tags offered as chips. Tags appear under the time in history, can be edited in place, and are written to the Excel export as a `Tag` column. The finish card keeps the tag link collapsed until it is used.
- **Sound options.** Three built-in timbres (Chime, Soft, Bell) with an independent preview button, a volume slider, and an optional focus-only tick. Custom audio can be imported (≤ 5 s, ≤ 2 MB) and is copied into app data.
- **Twelve color styles.** Moss, Ink, Dusk, and Clay join the existing eight. Existing `Plum` and `Aurora` values still load. Every style now repaints the page and card surfaces, the heatmap, and the floating droplet instead of only the primary accent.
- **Ten more UI languages.** Javanese, Punjabi, Hausa, Yoruba, Gujarati, Kannada, Malayalam, Burmese, Amharic, and Nepali join the shipped set, for 40 UI languages at 350 keys each. The tray menu and in-app reminders use the same catalogs.
- **Floating-window control.** Three sizes (S 96×32, M 136×40, L 180×52) with real droplet previews, a 40–100% opacity slider, a locate hint, and reset position.
- **Diagnostics.** Version, OS, architecture, WebView, language, theme, palette, tray status, and the last 50 warnings, with copy, open log folder, clear log, and reset anonymous ID.

### Changed

- Reminder copy now names a concrete act of care: step away from the screen, look into the distance, sip water, or roll your shoulders and neck. The break-over card welcomes people back gently instead of asking whether they are ready.
- The main window is now 360×560 by default and can shrink to 320×400. Below 520 px the header, timer ring, and summary compress in stages, so the main view keeps every control without a scrollbar.
- Excel exports use minute precision: the filename ends with a short local date-time stamp, and the session start column no longer shows seconds.
- Language and other list options now highlight as square, full-width rows. Language names sit vertically centered instead of clinging to the top of the hover band.
- The home timer ring is slightly smaller, and the phase label is a soft colored pill again instead of a dot plus text. Reminder cards use a larger, unframed icon aligned with the title.
- Excel summary metrics and numeric table columns now align to the right; labels, dates, and types stay left-aligned.
- The floating countdown is called "floating window" (悬浮窗) in the app, tray menu, and settings, replacing the earlier "floating ball" wording.
- Insight durations use a compact `6h 20m` / `45m` format so the three stats never truncate at 360 px.
- The main window now caps at 768×900 and cannot be maximized. Content stays in a 560 px column that is centered, so stretching the window no longer smears the timer across the screen. The timer and its summary keep a top-down flow; extra height becomes calm empty space below instead of pushing the summary into the middle.
- Every settings page, root and detail alike, now has the same Done button at the top right. On a detail page it returns one level up; only the root page's Done closes settings, so leaving no longer means walking back through three levels. The root page also gains a back arrow at the top left that closes settings, so the exit is visible without hunting for Done.
- Settings separators were inconsistent: some rows had none and the data page drew a double line above its action group. Every row after the first now carries exactly one divider, and the last row draws none.
- Settings rows now share one `SettingsCell`: 44 px minimum height, 10 px block padding on both sides of the content, a 1 px top divider between rows, 18 px between separate groups, and one 14 px page inset owned by the settings shell. Row, switch, field, and slider components only style their inner content, so pages can no longer drift into their own padding, divider, or hover rules.
- Dialog and form action rows now share one `ActionBar`: left aligned, `Sm` buttons, exactly one primary action, and an automatic Ghost close button last. The history dialog moved its export and close actions out of the title bar into the shared bar; inline cancel and reveal actions became Ghost buttons instead of underlined text. The secondary button now carries a brand tint so a supporting action, the primary action, and close read as three distinct levels.
- The settings Done button and the language sheet Done button now use the shared `Button`, so every header action has the same fill, hover, ripple, and vertical centering.
- Overlay-size cards lost their outline and hover lift; selection now reads as a soft filled card that changes tone, never moves.
- A product-line gate, `check:ui-patterns`, now rejects local dialog action rows, missing `ActionBar`, cell padding or divider declarations outside `SettingsCell`, page-level top padding, local `__rows` wrappers, non-`Sm` action-bar buttons, and shorthand `class:is-*` directives. It runs inside `check:web`.
- `src/lib` is fully layered: `app/`, `components/`, `ipc/`, `state/`, `ui/`, and `utils/` with nothing left loose at the lib root. Suffixes encode the role (`*.util.ts`, `*.store.svelte.ts`, `*.model.ts`), utils keeps at most one domain folder deep, and lower layers may not import upper ones. Store imports always spell out `*.store.svelte.ts`, utils imports carry explicit extensions so the pure helpers stay directly runnable under Node, and a new `check:structure` gate enforces every rule inside `check:web`. The former ad-hoc `core/` dependency rule was folded into the structure gate.
- Unit tests now live next to their modules and grew from 65 to 96 cases, adding coverage for tag normalization, diagnostics text, settings summaries, insights math (heat levels, 53-week heatmap padding, tag bars, empty preview), and the Excel XML builders (escaping, column names, cells, rows, sections, column widths).
- The home quick actions (Countdown, History) are visibly bigger pills: 36 px tall with 13 px text and 16 px inline padding, up from 28 px / 11.5 px / 12 px, so the lower half of the timer page reads less empty. Short windows (≤ 460 px height) keep the compact 28 px row.
- The insights heatmap is now an SVG chart that scales with the window: it always fills the content column (about 37 px tall at 320 width, 94 px at 768), the cell-to-gap ratio never changes, and the minimum window width no longer shows a horizontal scrollbar. The old fixed 4 px cells are gone.
- Restore defaults moved from a bottom row on the settings root into the header as a quiet Ghost button left of Done, so it is actually discoverable; the bottom danger section is gone and the confirmation dialog still carries the destructive action.
- Settings rows share one horizontal geometry: 8 px inline padding with an 8 px bleed on both sides, so hover fills and dividers reach wider than the text while every row's text lines up with the rest of the page — including read-only rows like Version that used to sit flush against the edge while tappable rows were inset.
- The settings root compresses vertically: Common sits inline with the quick duration chips, the entry list follows 12 px below, rows drop to 40 px in short (≤ 460 px height) windows, and the shell tightens its paddings, so the minimum 320×400 window shows the whole root without a scrollbar.
- The About subtitle reuses the app tagline in every language. The separate subtitle string is deleted (it had drifted in Simplified Chinese to an off-brand "专注，休息，再来一轮"); all 40 locales now show the same approved line under the version.
- The countdown dialog compresses in short windows (≤ 460 px height): tighter card padding and spacing, 28 px preset chips, and zero vertical padding on dense steppers, so all nine presets plus the hour/minute steppers fit 320×400 without a scrollbar. Normal-height layout is untouched.
- The color grid switches to four columns at 640 px and wider, so swatches keep their shape instead of stretching into wide bands.
- The two secondary timer actions now sit lower under the primary button, with the same breathing room used elsewhere in the timer.
- Language moves from Appearance to General and opens in its own searchable sheet.
- The settings file only gains fields; a 1.0.0-rc.1 client reading 1.0.0 settings ignores unknown keys and keeps working.
- Every clickable surface now answers hover and press: settings rows, buttons, chips, tabs, swatches, switches, and links share one ripple that follows the pointer, while the pressed control never changes size. Reduced-motion users keep the flat hover and brightness states. `check:interaction` enforces the rule.
- Every button keeps a visible surface without an outline frame: Ghost sits on a soft tint and Secondary on a slightly stronger one, both filling the shape instead of drawing a hairline box. Bare text actions in the settings header, help panel, reminders page, and history dialog became filled pills.
- Reminder-card actions start at the copy column and read left to right under the body text instead of floating at the center or right edge. The primary actions still come first.
- Button labels were shortened across all 40 languages and never wrap: the break card now says "Got it" instead of "Hide", "Postpone 5 min" instead of "+5 min", and the finish cards use "Close" and "Start focus".

### Removed

- **Compact mode.** The 320×200 window, its header collapse icon, the Appearance switch, and the related menu and translation entries are gone. The main window always opens at 360×560 and stays within 320×400–768×900.

### Fixed

- The privacy-policy link pointed at `blob/main/PRIVACY.md`, but the default branch is `master`; it now uses `blob/HEAD/`, which GitHub always resolves to the default branch, so a branch rename can never 404 it again.
- The main window's right-click menu now offers "Locate floating window" while the floating window is enabled, matching the tray menu, so a window that drifted off-screen can be found from the window in hand.
- The main window no longer appears at the screen center for a frame and then jumps to its remembered spot. It is created hidden, sized first, positioned with the saved coordinates clamped to the visible work area, and shown only once, so the remembered position is the first thing painted.
- Palette selection now repaints the whole app: page, card, and raised surfaces follow the chosen hue, and the heatmap follows the palette accent. Moss, Ink, Dusk, and Clay previously had no CSS rules at all, so those choices changed nothing.
- The floating droplet's glass tint, outline, and pulse now derive from the active palette; its idle clock text uses the palette's strong brand color instead of a fixed muted tone.
- Theme, palette, opacity, and floating-size changes now reach every open window immediately through a `settings:changed` event, so the floating droplet no longer waits for a restart.
- The mode switch above the color grid had extra vertical padding, which pushed it away from its label and doubled the field spacing.
- Duration chips in Settings rendered as 16 px slivers instead of filling their row, and their 10 px corners read as flat tabs. They now stretch evenly and use a full pill radius.
- The timer page no longer ends with a full-width "focused this week" row; statistics moved into the header so the timer keeps its top-down rhythm.
- Settings switches are back to their 38×22 shape inside the unified cell, and the data page no longer opens with a double divider or a 4 px gap above its first action row.
- The droplet mark and the floating-window droplet now include their full rounded base; the 32×35 view box no longer clips the last few units of the logo.
- About no longer repeats the version twice.
- The `Tag` column stays empty instead of writing a placeholder when a session has no tag.

### Database

- Schema v3 adds one nullable `tag` column and a partial index on `sessions`. Opening a v1 or v2 database takes a backup first, then migrates inside a single transaction. A database missing optional columns is repaired on open.

### Notes

- Dynamic tray icons, custom theme files (`themes/*.json`), per-display size and opacity memory, and memory/startup measurements are deferred to a later version. This entry records what 1.0.0 does not include; none of it is ruled out permanently.

## [1.0.0-rc.1] - 2026-11-23

### Added

- Focus, short-break, and long-break cycles with pause, resume, skip, reset, and editable lengths.
- A transparent floating countdown that stays on top, labels break phases, and remains click-through until pointed at.
- In-app reminder cards at every phase boundary, with postpone, skip, close, and a bundled reminder chime.
- Local session history with a styled spreadsheet (`.xlsx`) export.
- Thirty UI languages with system-language detection and right-to-left layouts for Arabic, Persian, and Urdu.
- Light, dark, and system themes with eight color styles.
- Global shortcuts, launch at login, start minimized, and close-to-tray.
- Windows NSIS (per-user) installer with a language selector; Linux deb, rpm, and AppImage bundles; a universal macOS DMG build.
- Signed Windows auto-updates: a 6-hour background check, a non-modal update banner, manual download with progress and cancel, restart-to-install, skip-this-version, and a 24-hour snooze. Settings and About share one version/status block, and the Help icon shows a badge while an update is ready to act on. macOS and Linux remain manual downloads.
- Optional anonymous install and update counts: a random local ID, one install beacon, and a header on update checks. The setting can be turned off, and the ID can be reset.
- A Cloudflare Worker download host (`dl.siderkit.com`) that proxies GitHub Releases under a per-product path, with branded and GitHub-fallback update manifests.
- Product documentation, acceptance criteria, technical design, ADRs, a privacy notice, and a release guide.

### Changed

- The right-click menu is now a native app menu on every window instead of the WebView menu, with the standard edit verbs kept in text fields.
- The project is licensed under Apache-2.0 only; the previous MIT/Apache-2.0 dual license and its two license files are gone, and the attribution moved to `NOTICE`.
- Windows ships only the per-user NSIS installer; the all-users MSI was retired after a managed Windows 11 machine rejected it with Windows Installer error 1625.
- The NSIS installer ships 23 languages, preselects the OS language, and offers a language selector that never appears during silent, passive, or update runs.
- Manifests are at `1.0.0-rc.1`; the public `1.0.0` version follows the updater and the website.
- The updater plugin is driven from Rust; the WebView has no updater permission and never receives an installer byte.
- Phase boundaries now use in-app cards instead of operating-system notifications, so reminders work without a notification permission.
- The Windows NSIS installer defaults to a per-user folder and remembers a custom install location across upgrades.
- The overlay ignores input until the pointer is over it, so it does not block work underneath.

### Fixed

- The timer keeps its deadline in the Rust core when the main window is hidden.
- The overlay no longer steals focus or captures clicks outside its bounds.
- The Linux locate hint is override-redirect, so a window manager cannot push it away from a droplet at the screen edge.
- Locale changes reload every open window instead of leaving stale text in the tray or overlay.

### Security

- Local-first by default: no account, no sync, and no server for session data. The only outbound requests are signed update checks and the optional anonymous install beacon.
- Reminder cards do not require an operating-system notification permission.

### Known limitations

- macOS builds are unsigned until a Developer ID is configured; Gatekeeper will warn on first launch.
- Windows installers are unsigned until a code-signing certificate is configured; SmartScreen may warn.
- Linux Wayland sessions cannot position a top-level window reliably, so the floating countdown and global shortcuts are best-effort there.
- Auto-update is Windows-only. macOS and Linux users download new builds manually.
- Update checks count anonymous installs by default; the setting can be turned off or reset.
- True in-taskbar text embedding is not implemented; the floating countdown is a separate window.
