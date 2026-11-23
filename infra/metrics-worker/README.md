# Download host and anonymous counters

A single Cloudflare Worker serves `https://dl.siderkit.com` for every Siderkit
product. The first path segment is always the product slug:

| Route                                  | Response                                        | Counted        |
| -------------------------------------- | ----------------------------------------------- | -------------- |
| `/health`                              | `ok`                                            | no             |
| `/`                                    | redirect to the site                            | no             |
| `/<product>/`                          | redirect to the product page                    | no             |
| `/<product>/latest.json`               | updater manifest from the latest GitHub release | update check   |
| `/<product>/i`                         | empty `204`, `no-store`                         | install beacon |
| `/<product>/releases/<version>/<file>` | release asset proxied from GitHub               | no             |

Adding a product means adding one entry to `PRODUCTS` in `src/index.js`; there
is one Worker for the whole host, not one per product.

Legacy aliases keep builds shipped before the namespace existed working. They
point at `siderkit-break` and must never be linked from new code:

| Legacy path                  | Behaviour                              |
| ---------------------------- | -------------------------------------- |
| `/latest.json`               | `302` → `/siderkit-break/latest.json`  |
| `/i`                         | `204`, counted as `siderkit-break`     |
| `/releases/<version>/<file>` | `302` → `/siderkit-break/releases/...` |

GitHub Releases is the only binary store. The Worker keeps one branded origin
for the app, the website, and the updater, and it rewrites every asset URL in
the manifest to `/<product>/releases/...`. Publishing a GitHub release (not
draft, not prerelease) is what makes `/<product>/latest.json` point at the new
version.

The Worker never sees an account. It stores one row per counted request in
Cloudflare Analytics Engine and writes no logs that contain an IP address.

## Why two counters

- **Install beacon**: the app sends `GET /<product>/i` once, guarded by a flag
  in its local `metrics.json`. Reinstalling the app or resetting the anonymous
  ID creates a new UUID and therefore a new install event.
- **Update check**: every check carries the same UUID. A running app checks at
  most every six hours, so distinct IDs per day estimate active installs, and
  the version dimension shows how quickly installs move to a release.

Both counters are skipped unless `X-Siderkit-Install` is a valid UUID. Turning
off **Share anonymous install counts** in the app makes it omit the header, so
the request is served but never counted. Each data point carries the product
slug as its first blob, so products never mix.

## One-time setup

1. Attach `dl.siderkit.com` as a custom domain to the Worker. The zone must be
   on the same Cloudflare account.
2. Deploy from this directory:

   ```text
   pnpm dlx wrangler login
   pnpm dlx wrangler deploy
   ```

   `wrangler.toml` binds the custom domain.

3. Optional: analytics. Enable Analytics Engine, create the dataset
   `siderkit_break_metrics`, and uncomment the `METRICS` binding in
   `wrangler.toml`. Without it `/i` still answers `204` and `record()` is a
   no-op, so the app and the updater work unchanged; only the counters stay
   empty. The Workers Free plan on this account does not expose Analytics
   Engine, so the binding stays commented out.

No R2 bucket, S3 token, or repository secret is involved. The release workflow
talks to GitHub only.

## Release assets

The release workflow attaches version-free asset names, because the tag already
carries the version:

```text
Siderkit-Break_windows_x64-setup.exe
Siderkit-Break_windows_x64-setup.exe.sig
Siderkit-Break_macos_universal.dmg
Siderkit-Break_linux_amd64.deb
Siderkit-Break_linux_x86_64.rpm
Siderkit-Break_linux_amd64.AppImage
latest-dl.json     branded manifest (dl.siderkit.com/<product>/ URLs)
latest.json        GitHub fallback manifest
SHA256SUMS.txt
```

`/<product>/releases/<version>/<file>` maps to
`releases/download/v<version>/<file>`, so the same asset names work for every
tag without versioned copies. The Worker reads `latest-dl.json` first, then
falls back to `latest-r2.json` and `latest.json` for releases published before
the rename.

## Local check

```text
curl -fsS https://dl.siderkit.com/health
curl -fsS https://dl.siderkit.com/siderkit-break/latest.json
curl -fsSI https://dl.siderkit.com/siderkit-break/releases/1.0.0-rc.1/Siderkit-Break_1.0.0-rc.1_windows_x64-setup.exe
curl -fsSI https://dl.siderkit.com/latest.json            # legacy, 302
```
