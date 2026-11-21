# Code quality

> Status: accepted for this repository. Thresholds are 1.0 and may be reviewed after 30 days.

Code is read more often than it is written. This project uses automated gates so that quality does not depend on memory or reviewer stamina.

Three rules:

1. New code has zero violations.
2. Existing violations, if any, may only decrease.
3. The gate runs before product code, not after.

## Principles

- Names reveal intent; one concept has one name.
- Functions do one thing and stay small.
- Comments explain why, not what.
- Errors are explicit; nothing is swallowed.
- Domain code does not depend on the UI, the host, or the database.
- Duplication is measured; abstraction waits until it is stable.
- Tests describe behavior, not implementation.
- Every change leaves the touched module a little cleaner.

## Hard limits

### TypeScript and Svelte

| Rule                       | Limit                                             |
| -------------------------- | ------------------------------------------------- |
| Cyclomatic complexity      | ≤ 10                                              |
| Cognitive complexity       | ≤ 15                                              |
| Nesting depth              | ≤ 4                                               |
| Nested callbacks           | ≤ 3                                               |
| Parameters                 | ≤ 4                                               |
| Statements per function    | ≤ 40                                              |
| Lines per function         | ≤ 80 (blank lines and comments skipped)           |
| File length                | TS ≤ 400; Svelte component ≤ 300; test file ≤ 600 |
| `any`                      | 0                                                 |
| Floating promises          | 0                                                 |
| Empty `catch`              | 0                                                 |
| Commented-out code         | 0                                                 |
| Ownerless `TODO` / `FIXME` | 0                                                 |

`TODO` and `FIXME` must include an issue reference:

```ts
// TODO(#123): replace the polling fallback when the event API is available.
```

### Rust

```toml
# clippy.toml
cognitive-complexity-threshold = 15
too-many-arguments-threshold = 5
too-many-lines-threshold = 100
type-complexity-threshold = 250
```

- `cargo fmt --check`.
- `cargo clippy --all-targets --all-features -- -D warnings`.
- Core modules forbid `unwrap`, `expect`, and `panic`; tests and startup bootstrapping may opt out explicitly.
- The timer core does not depend on Tauri, SQLite, or platform APIs.

### CSS namespace and tokens

- `l-{owner}-*` classes are BEM blocks owned by one component and defined in that component's scoped `<style>`. Global `.css` files must not define classes.
- BEM shape only: block, `__element`, `--modifier`; no three-level underscores. Names use full words, not `btn`, `nav`, or `hdr`.
- `is-*` marks state; `data-*` is a JavaScript hook, never a style selector.
- Design values come from `src/styles/tokens.css`: raw colors, lengths, and durations fail the gate. Tokens that nobody references also fail.
- The dark theme repaints tokens under `[data-theme='Dark']`; components never fork their CSS.

### Duplication, boundaries, dead code

- Duplicate rate ≤ 3% with `jscpd`, minimum 50 tokens.
- No cyclic dependencies; no domain-to-UI or UI-to-host deep imports.
- `tsc --noUnusedLocals --noUnusedParameters`.
- Single file: TS 400, Svelte 300, Rust 500. Split or register an exception.

## Commands

```bash
pnpm format:check
pnpm lint
pnpm check:types
pnpm check:css
pnpm check:tokens
pnpm check:boundaries
pnpm check:duplicates
pnpm check:todo
pnpm check:file-size
pnpm check:rust
pnpm check:clean   # aggregate code-quality gate
pnpm check         # format + clean; CI entry point
```

The scaffold and CI run these commands. A failure blocks the pull request. Do not use `--no-verify`, do not skip the gate, and do not add blanket lint suppressions.

## Exceptions

- Generated code, migrations, vendor code, fixtures, and snapshots may be excluded in config with a written reason.
- A single-line suppression must include a reason and an issue:

```ts
// eslint-disable-next-line sonarjs/cognitive-complexity -- legacy parser; see #123
```

- File-level and directory-level suppressions are not allowed.
- Threshold exceptions are per-file, reviewed quarterly.
- Security, permissions, billing, and runtime core do not receive complexity exceptions.

## Baseline for existing code

This repository starts clean and has no baseline. Repositories with existing violations generate `clean-code-baseline.json`; CI fails when the count increases and updates the baseline when it decreases. The target is zero.

## Review checklist

- Are names clear and consistent with the domain?
- Does each function do one thing?
- Is there duplication, deep nesting, or a boolean flag parameter?
- Are errors swallowed? Is the failure path observable?
- Does the domain import a framework, host, or database?
- Are tests behavioral, deterministic, and free of sleeps?
- Are there commented-out blocks, ownerless TODOs, or new suppressions?
- Is `pnpm check` green?
