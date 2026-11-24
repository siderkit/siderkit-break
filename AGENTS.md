# Siderkit Break Collaboration Rules

> Repository-level rules for `siderkit-break`. Workspace-wide rules live in the
> workspace `AGENTS.md`.

## Build and delivery

- **Package after every runtime change.** Any change that affects the shipped
  app (`src/`, `src-tauri/`, `messages/`, `tauri.conf.json`, icons, NSIS
  templates) must be followed immediately by:

  ```bash
  pnpm tauri build --bundles nsis
  ```

  Do not wait to be asked, and do not treat "it is not built yet" as a
  reminder.

- **Icon changes.** Run `node scripts/generate-icon.mjs` to produce
  `src-tauri/icon-source.png`, then `pnpm tauri icon src-tauri/icon-source.png`
  to regenerate every size (`icon.ico`, `icon.icns`, the PNG set, and the
  Windows Store square images), then package.
- **Icon not updating?** The Tauri build caches resource embedding. If
  `icon.ico` is correct but the exe still shows the old icon, run
  `touch src-tauri/build.rs` to force the build script to rerun, then package.
  Stop any running `siderkit-break.exe` before packaging, otherwise the build
  fails with `failed to remove file ... os error 5`.
- **Report the artifact.** Always give the installer's absolute path, file
  size, and build time. Path format:

  ```text
  src-tauri/target/release/bundle/nsis/Siderkit Break_<version>_x64-setup.exe
  ```

- **Build failures.** Report the failing command and the key error verbatim.
  Never claim something was packaged when it was not.
- **Timestamp check.** Confirm that
  `src-tauri/target/release/siderkit-break.exe` and the installer are newer
  than the last source or icon change.
- **Commits.** Follow the workspace Git rules: without explicit authorization
  in the current message, never run `git add` / `commit` / `push`.
