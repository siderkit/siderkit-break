# Security policy

## Supported versions

| Version | Supported                                       |
| ------- | ----------------------------------------------- |
| 1.0.x   | Yes, once the first public release is published |
| < 1.0   | No                                              |

## Reporting a vulnerability

Please use GitHub's private security advisory feature for this repository. Do not open a public issue for a vulnerability.

Include:

- the affected version or commit;
- the platform and OS version;
- reproduction steps;
- the impact;
- any suggested fix.

## Scope

Siderkit Break 1.0 is local-first:

- no account;
- no server;
- no network requests;
- no telemetry;
- no remote content.

Security issues of interest include:

- escaping the intended Tauri capability set;
- unintended file or shell access through IPC;
- overlay or window behavior that captures input unexpectedly;
- local data exposure;
- dependency vulnerabilities;
- notification or autostart behavior that persists after uninstall.

## Disclosure

We will acknowledge a report, investigate, and coordinate a fix and disclosure timeline. There is no bug bounty.
