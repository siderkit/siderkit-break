# Contributing

## Status

The project is in the 1.0 release-candidate stage. Core flows are complete; Windows installers are built locally, and macOS/Linux builds run in CI. The specs remain the source of truth for behavior. These instructions describe the workflow.

## Prerequisites

- Node.js 22 or newer.
- pnpm 12.
- Rust stable and the platform build tools required by Tauri.
- On Windows: the MSVC build tools and WebView2 runtime.
- On macOS: Xcode command line tools.
- On Linux: `libwebkit2gtk-4.1-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `libgtk-3-dev`, `libxdo-dev`, `libssl-dev`, `patchelf`, `rpm`, `build-essential`, and the ALSA headers (`libasound2-dev`).

## Setup

```bash
pnpm install
pnpm tauri dev
```

## Build installers

```bash
# Windows
pnpm tauri build --bundles nsis,msi

# macOS (universal)
rustup target add aarch64-apple-darwin x86_64-apple-darwin
pnpm tauri build --target universal-apple-darwin --bundles dmg

# Ubuntu 22.04+
pnpm tauri build --bundles deb,rpm,appimage
```

See [docs/release.md](docs/release.md) for signing and verification.

## Checks

Run before every pull request:

```bash
pnpm check
```

`pnpm check` includes formatting, linting, type checking, CSS namespace and token gates, boundary checks, duplication checks, TODO checks, file-size checks, Rust formatting, Clippy, and tests. A failing check blocks the pull request.

The full rules are in [docs/code-quality.md](docs/code-quality.md).

## Code expectations

- New code has zero clean-code violations.
- Do not add file-level or directory-level lint suppressions.
- A single-line suppression needs a reason and an issue reference.
- Keep the timer core independent of Tauri, SQLite, and platform APIs.
- Style with `l-*` BEM classes scoped to the owning component and `--sk-*` tokens; raw colors, lengths, and durations fail the gate.
- Keep user-facing strings in the message catalog; English is the source locale.
- Add or update tests with behavior changes.
- Update the relevant document when a flow or acceptance criterion changes.

## Commits

Use Conventional Commits:

```text
feat(timer): add pause and resume
fix(tray): keep the menu in sync after a phase change
docs(adr): record the overlay strategy
```

Keep commits focused. Do not commit generated build output.

## Pull requests

Include:

- what changed and why;
- the user-visible effect;
- test evidence;
- platform coverage;
- known limitations;
- documentation updates.

## Security

Do not open a public issue for a vulnerability. Follow [SECURITY.md](SECURITY.md).
