# Recruitdesk

A private, offline-first recruiting workspace for a single recruiter: a searchable candidate library, jobs, companies and the candidate–job applications that connect them.

Built with React 19, TypeScript, Vite, Tailwind CSS, Radix primitives and Dexie/IndexedDB. There is no account, password, backend, analytics or external API. All scripts, icons and fonts are bundled; the production page cannot open network connections.

## Contents

- [Features](#features)
- [Quick start](#quick-start)
- [Development](#development)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Data, privacy and backups](#data-privacy-and-backups)
- [Imports and identity](#imports-and-identity)
- [Editing safeguards](#editing-safeguards)
- [Updating and recovery](#updating-and-recovery)
- [Testing](#testing)
- [Project documents](#project-documents)
- [Scope and limitations](#scope-and-limitations)

## Features

**Workspace**

- **Today** — overdue, due-today and upcoming follow-ups, with complete and snooze actions (undo available).
- **Candidates, Jobs, Companies, Applications** — full create/read/update/delete, with fields that autosave in place.
- **Applications** are many-to-many between candidates and jobs, with stage history and next action / follow-up dates. Switch between a **List** and a keyboard-accessible **Board**.
- Flexible candidate profiles: experience, education, certificates, projects, contact logs and custom fields.
- Bulk selection with status changes (undoable) and confirmed deletion.
- Light, dark and system themes; responsive layouts from 320px phones to desktop.

**Finding and reusing work**

- Search across names, CPM IDs, skills, employers, certificates, custom fields, phone, source and contact notes. `⌘ K` opens a command palette.
- Filters for status, location, skill, job, stage, follow-up and **salary** (by currency, or listed / not listed). Salary text such as `USD 3,500–5,500 / mo` or `20–30tr` is parsed so columns sort by monthly amount; unreadable values always sort last and the original text is never changed.
- **Saved views** store a page's search, filters and sort under a name so recurring sourcing work is one click away.
- Candidate rows show ✉ / ☎ icons: hover to see the value, click to copy it. Copy feedback is shown on the control itself (icon turns into a check for about 2.5 seconds).

**Data transfer**

- Vendor CSV import (`Issue key` → `cpmID`) with a validation preview.
- Full workspace JSON backup and restore, plus candidate-only and job-only exports.
- **Field-by-field import preview**: for records that already exist, the import dialog lists each changed field (old → new) and lets you untick the changes you want to keep as they are.

## Quick start

Requirements: Node.js 22 or later and npm. Dependency installation needs internet access; running the built app does not.

```sh
npm ci
npm run build
npm run preview
```

Open **http://127.0.0.1:4173**. The server serves static files only, binds to the loopback address, and rejects other `Host` headers.

On macOS you can instead open `Start Recruitdesk.command`, which starts the same server and opens your browser. Keep its Terminal window open while you work.

> **Keep one origin.** Records are stored per browser profile *and* per origin (hostname + port). `PORT=4174 npm run preview`, `localhost` instead of `127.0.0.1`, or a different browser profile each open an empty database. Always use the same profile, hostname and port, and never open `dist/index.html` as a file.

After the first load installs the service worker, all production assets are cached and the app reopens without internet. If the browser cache is cleared or the worker has not installed, keep the local server available.

The committed `dist/` folder is a prebuilt snapshot for running without `npm ci`. It is not regenerated automatically: after changing source, run `npm run build` before using `npm run preview` or the macOS launcher.

## Development

```sh
npm run dev
```

Open **http://127.0.0.1:5173**. CSS updates immediately and React components use Fast Refresh; some changes need a full reload. The port is fixed so storage never silently moves: if 5173 is taken, startup fails. Choose another explicitly with `npm run dev -- --port 5174`.

The dev server uses its own browser database, separate from the offline app on 4173 (and any preview on 4175). Use fictional records while developing, and do not reuse an origin already controlled by a production service worker.

Only Vite-served HTML relaxes the Content Security Policy: inline scripts for React Refresh, and connections limited to the same origin plus loopback HMR WebSockets. The dev server registers no service worker. The source HTML and production build keep `script-src 'self'` and `connect-src 'none'`.

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server with live updates |
| `npm run build` | Type-check, build, and generate the offline service worker |
| `npm run preview` | Serve `dist/` on 127.0.0.1:4173 |
| `npm test` | Data, search, transfer, offline and scale tests (Vitest) |
| `npm run test:browser` | Chrome end-to-end tests (Playwright; needs the preview running) |
| `npm run test:hmr` | Verifies live CSS/React updates in an isolated Vite server and Chrome profile |
| `npm run format` | Prettier |

## Keyboard shortcuts

Press `?` anywhere for the in-app list. Shortcuts are ignored while typing in a field.

| Keys | Action |
|---|---|
| `⌘ K` | Command palette |
| `/` | Focus search |
| `N` | New record on the current page |
| `G` then `T` `C` `J` `A` `P` `S` | Go to Today, Candidates, Jobs, Applications, Companies, Settings |
| `J` / `K` | Next / previous row in a list |
| `Enter` | Open the focused row |
| `Esc` | Close the open record or dialog |

## Data, privacy and backups

Records live in IndexedDB in this browser profile, scoped to the exact origin. The server never receives candidate data. The production page's Content Security Policy disables network connections; its service worker only fetches same-origin static files. Fonts and dependencies are bundled. Documentation links below are never requested by the running app.

There is no password or application-level encryption: anyone with access to the OS account or browser profile can read the workspace, and exported JSON and imported CSV files are unencrypted. Use an OS login, disk encryption, screen lock and a protected backup location. Private browsing, clearing site data, uninstalling the browser, storage pressure or browser policy can remove data, and requesting persistent storage is not a guarantee. This is not a substitute for your organisation's access-control or retention requirements.

Make regular **full JSON backups** (Settings & data → Back up), especially before imports and updates. Keep a copy outside browser storage and test a restore with disposable data.

- A vendor CSV is an interchange format, not a backup: relationships, settings and notes do not survive a CSV round trip.
- JSON **restore merges** into the current workspace and replaces settings after confirmation; it never clears existing data.
- Full backups include all collections, settings and saved views. Candidate-only exports omit relationships; job exports include referenced companies and omit applications.

## Imports and identity

Candidates are identified by `cpmID`; the vendor column **Issue key** maps to it. The import screen previews recognised fields, validation issues and duplicate handling before anything is written, and updates to existing records need explicit confirmation.

| Vendor column | Field |
|---|---|
| Issue key | `cpmID` |
| Summary | Name |
| Custom field (Years of experience) | Years of experience |
| Custom field (Skill Set) | Skills |
| Custom field (Country/ City) | Location |

The short aliases `YOE`, `Skill Set` and `Country/ City` are also accepted; exact custom-field headers win when both are present. Vendor `Status` is kept as source data and never changes candidate availability. All original vendor values are retained in `vendorData`. The only vendor material supplied was a header row, so compatibility with a real export still needs verifying.

**Transfer limits.** Vendor CSV batches are limited to 100 MiB and 100,000 candidate rows. Native JSON backups have no fixed size or count cap, so a workspace that was valid to build is always valid to back up; strict version, field and relationship validation still applies. Native JSON files over 100 MiB ask for confirmation before they are read. Everything is processed in browser memory, so very large files can pause the interface or exceed the browser's practical limits.

**Sample workspace.** `samples/recruitdesk-full-sample.json` is a fictional workspace (24 candidates, 12 jobs, 8 companies, 36 applications). Load it from Settings & data → Restore workspace JSON; it is never loaded automatically. See [samples/README.md](samples/README.md).

## Editing safeguards

- Fields autosave with optimistic concurrency: an edit made from a stale value opens a conflict choice instead of overwriting a change from another tab.
- If a live update filters a row out while you are editing it, the draft stays tracked. A valid draft still saves; a failed one appears in an **Unsaved drafts** panel where it can be copied, retried or explicitly discarded. Navigation and export stay blocked until drafts are resolved.
- **Durable recovery.** Unsaved edits are also mirrored to browser storage. If the tab is closed or crashes before a save completes, reopening the same record restores the draft, saves it, and shows "Recovered an unsaved edit". The mirror is removed after a clean save, discard or Escape. This protects against crashes and reloads, not against clearing site data.
- Removing profile entries, contact logs and custom fields asks for confirmation. **Delete all data** requires typing `DELETE`.

## Updating and recovery

Before replacing a build, make a JSON backup. Then rebuild, start the server, open the app once so the new service worker downloads the bundle, **close every tab and window** for the app, and reopen it. The new worker waits for old tabs to close instead of replacing running code. Previous version caches are kept to protect open tabs and use some disk space.

Do not clear all site data to update: that also deletes IndexedDB. If you remove caches manually in browser tools, keep the IndexedDB database and a separate backup.

## Testing

```sh
npm test                # 71 data, search, transfer, offline and scale tests
npm run build
npm run preview         # in another terminal
npm run test:browser    # 35 Chrome end-to-end tests
npm run test:hmr
```

The browser suite uses installed Google Chrome (or a configured Playwright browser) against `http://127.0.0.1:4173`; set `PLAYWRIGHT_BASE_URL` to test a preview on another port (for example `http://127.0.0.1:4175`). Tests use isolated browser contexts and fictional data. Automated checks do not prove long-term browser storage durability. For a manual release check: start the production server, create a fictional record, reload, back up and restore in a disposable profile, let the worker activate, reload offline, and confirm in the network panel that no external requests occur.

## Project documents

| Document | Purpose |
|---|---|
| [PRODUCT.md](PRODUCT.md) | Product purpose, users, constraints and principles |
| [DESIGN.md](DESIGN.md) | Design tokens, components and layout rules |
| [VALIDATION.md](VALIDATION.md) | Current verification status, evidence and known limits |
| [UI-UX-AUDIT.md](UI-UX-AUDIT.md) | Audit findings, fixes and recommendation status (dated snapshot) |
| [POLISH-ROUND-2.md](POLISH-ROUND-2.md) | Motion and responsive refinement notes (dated snapshot) |
| [samples/README.md](samples/README.md) | Contents of the sample workspace |
| [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) | Dependency licences |

Implementation references: the [shadcn data-table pattern](https://ui.shadcn.com/docs/components/radix/data-table), [Dexie live queries](https://dexie.org/docs/dexie-react-hooks/useLiveQuery%28%29) for cross-tab updates, and [CSP connect-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src).

## Scope and limitations

Recruitdesk is single-user and browser-local. It does not provide cross-device sync, server backup, team permissions, encrypted storage, email sending, calendar integration, attachment hosting or vendor API synchronisation. Verification so far is on desktop Chrome and emulated mobile viewports; Safari, Firefox, physical phones and screen readers have not been comprehensively tested. Keep records and backups consistent with your own data-handling obligations.
