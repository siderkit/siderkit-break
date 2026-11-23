# Download host and anonymous counters

A single Cloudflare Worker serves `https://dl.siderkit.com`:

| Route          | Response                                               | Counted        |
| -------------- | ------------------------------------------------------ | -------------- |
| `/latest.json` | updater manifest from R2, `no-store`                   | update check   |
| `/i`           | empty `204`, no-store                                  | install beacon |
| `/health`      | `ok`                                                   | no             |
| `/<key>`       | R2 object; `releases/*` is immutable, others 5 minutes | no             |

The Worker never sees an account. It stores one row per counted request in
Cloudflare Analytics Engine and writes no logs that contain an IP address.

## Why two counters

- **Install beacon**: the app sends `GET /i` once, guarded by a flag in its local
  `metrics.json`. Reinstalling the app or resetting the anonymous ID creates a
  new UUID and therefore a new install event.
- **Update check**: every check carries the same UUID. A running app checks at
  most every six hours, so distinct IDs per day estimate active installs, and
  the version dimension shows how quickly installs move to a release.

Both counters are skipped unless `X-Siderkit-Install` is a valid UUID. Turning
off **Share anonymous install counts** in the app makes it omit the header, so
the request is served but never counted.

## One-time setup

1. Create the R2 bucket `siderkit-dl`.
2. Create an Analytics Engine dataset named `siderkit_break_metrics`.
3. Attach `dl.siderkit.com` as a custom domain to the Worker. The zone must be
   on the same Cloudflare account.
4. Deploy from this directory:

   ```text
   pnpm dlx wrangler login
   pnpm dlx wrangler deploy
   ```

   `wrangler.toml` already binds `BUCKET` and `METRICS`. Change the bucket or
   dataset name there if the account uses different names.

5. Create an R2 API token with object read/write access to the bucket. The
   release workflow uses the S3 endpoint through these repository secrets:

   | Secret                 | Value                                           |
   | ---------------------- | ----------------------------------------------- |
   | `R2_ACCOUNT_ID`        | Cloudflare account ID                           |
   | `R2_ACCESS_KEY_ID`     | token access key ID                             |
   | `R2_SECRET_ACCESS_KEY` | token secret                                    |
   | `R2_BUCKET`            | `siderkit-dl` (repository variable, not secret) |

## Object layout

```text
latest.json                                      current updater manifest
releases/1.0.0/Siderkit-Break_1.0.0_windows_x64-setup.exe
releases/1.0.0/Siderkit-Break_1.0.0_macos_universal.dmg
releases/1.0.0/Siderkit-Break_1.0.0_linux_amd64.deb
releases/1.0.0/Siderkit-Break_1.0.0_linux_x86_64.rpm
releases/1.0.0/Siderkit-Break_1.0.0_linux_amd64.AppImage
```

`latest.json` is only replaced after a GitHub release is published. The release
workflow uploads versioned binaries immediately but keeps the previous manifest
in place, so a draft cannot push an update to users.

## Queries

Analytics Engine SQL, dataset `siderkit_break_metrics`:

```sql
-- Events per day for the last week
SELECT toDate(timestamp) AS day, blob1 AS event, SUM(double1) AS events
FROM siderkit_break_metrics
WHERE timestamp > NOW() - INTERVAL '7' DAY
GROUP BY day, event
ORDER BY day DESC;

-- New installs per day
SELECT toDate(timestamp) AS day, COUNT() AS installs
FROM siderkit_break_metrics
WHERE blob1 = 'install' AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY day
ORDER BY day DESC;

-- Distinct installs that checked in on a given day
SELECT toDate(timestamp) AS day, COUNT(DISTINCT blob2) AS installs
FROM siderkit_break_metrics
WHERE blob1 = 'check' AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY day
ORDER BY day DESC;

-- Version adoption
SELECT blob3 AS version, COUNT(DISTINCT blob2) AS installs
FROM siderkit_break_metrics
WHERE blob1 = 'check' AND timestamp > NOW() - INTERVAL '7' DAY
GROUP BY version
ORDER BY installs DESC;
```

Column meanings:

| Column    | Value                   |
| --------- | ----------------------- |
| `blob1`   | `install` or `check`    |
| `blob2`   | anonymous install UUID  |
| `blob3`   | app version (`1.0.0`)   |
| `blob4`   | target (`windows`)      |
| `blob5`   | architecture (`x86_64`) |
| `blob6`   | bundle type (`nsis`)    |
| `double1` | always `1`              |

## Limits

- An uninstall is not reported; only a new UUID counts as a new install.
- A user who resets the anonymous ID is counted as a new install by design.
- A reinstall from the same `metrics.json` backup keeps the old ID.
- Analytics Engine retention applies; export or query long-term trends before
  the retention window closes.
- Cloudflare terminates TLS and therefore sees client IPs, but the Worker does
  not read, log, or store them.
