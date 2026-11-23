# Privacy

> Applies to Siderkit Break desktop builds. Last updated: 2026-11-23.

Siderkit Break is local-first. Your timer settings, session history, and exports
stay on your machine. There is no account and no sync service, and session data
is never sent anywhere.

## What stays on your device

| Data                         | Location                                           | Purpose                                     |
| ---------------------------- | -------------------------------------------------- | ------------------------------------------- |
| Settings and session history | `siderkit-break.sqlite3` in the app data directory | Restore the timer, history, and preferences |
| Anonymous install ID         | `metrics.json` in the app data directory           | Optional install and update counts          |
| Logs                         | App log directory                                  | Diagnose startup and update failures        |

Uninstalling keeps these files unless **Delete app data** is selected in the
installer. Deleting `metrics.json` resets the anonymous ID.

## Network requests

The app makes at most two kinds of request:

| Request        | When                                                                         | Sent                                                                                |
| -------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Update check   | 30 seconds after launch, then every 6 hours, or when you press **Check now** | `X-Siderkit-Install: <random UUID>`, app version, target, architecture, bundle type |
| Install beacon | Once after a new install, or after you reset the anonymous ID                | `X-Siderkit-Install: <random UUID>`, app version, OS, architecture                  |

- The update check fetches `https://dl.siderkit.com/latest.json`; if that host
  fails, it falls back to the GitHub release mirror.
- The install beacon goes to `https://dl.siderkit.com/i` and returns an empty
  response.
- The anonymous ID is a random UUID created on the device. It is not derived
  from hardware, the network, an account, or the install path.
- Turning off **Share anonymous install counts** in Settings stops both the ID
  header and the install beacon. Update checks still work.
- **Reset anonymous ID** creates a new UUID and sends one new install beacon
  while counts are enabled.
- The app does not send your timer activity, session history, window titles,
  file paths, crash contents, or any usage events.
- The app does not use a third-party analytics SDK, advertising ID, IP hash, or
  device fingerprint.

## Server-side counts

The download host is a Cloudflare Worker in front of GitHub Releases. For a
request that carries a valid anonymous ID, it writes one row to Cloudflare
Analytics Engine:

```text
event, anonymous UUID, app version, target, architecture, bundle type, count = 1
```

It does not write the client IP address. Cloudflare, as the hosting provider,
still processes connection metadata such as IP addresses to deliver and protect
the service under its own terms. Analytics Engine retention applies; the counts
are aggregate only and are not used to build user profiles.

The counters answer three questions: how many new installs appeared, how many
installs checked for updates, and which versions they run. They cannot measure
uninstalls, and a reinstall or reset counts as a new install.

## Website

The separate `siderkit.com` site is static. It sets no cookies and loads no
third-party scripts, fonts, or analytics. Cloudflare Pages may keep standard
access logs as the hosting provider.

## Contact

Privacy questions and security reports: see [SECURITY.md](SECURITY.md).
