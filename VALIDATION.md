# Verification status

Last full run: 17 October 2026, Node 22, installed Google Chrome on macOS. No real candidate records were supplied; every test and screenshot uses fictional data.

## Current results

| Check | Result |
|---|---|
| `tsc -b` (type check) | Pass |
| `npm test` (Vitest) | **71 / 71** — database 13, transfer 18, search 15, workflow 14, salary 5, offline/server 3, sample file 2, scale 1 |
| `npm run test:browser` (Playwright, production preview) | **35 / 35** — end-to-end 9, workflow 9, autosave audit 5, audit features 4, motion 3, refinement 3, detail modal 2 |

The `dist/` folder committed to the repository is an older prebuilt snapshot; the results above were produced from a fresh `npm run build`. Rebuild before running the preview or launcher.

## What the tests cover

**Data and transfer**

- Case-insensitive CPM uniqueness, relationship integrity, deletion protections, stage history and atomic writes.
- Malformed and duplicate CSV rejection, valid CSV import, and exact vendor header mapping.
- Field-by-field import preview: per-field old/new diff for existing records, and kept fields retained when updates are applied.
- Saved views: save, replace by name, delete, and survival through a workspace export.
- Salary parsing: currency, amount and period, ranges with `k`, VND shorthand such as `20–30tr`, yearly-to-monthly normalisation, and unreadable values returning no amount.
- Full-workspace JSON backup and restore into an isolated context, including settings.
- The complete sample file: first preview adds 80 records plus one settings update; a repeat preview reports 81 updates.
- 10,000 fictional candidate profiles imported, re-previewed as updates, exported and restored with company/job/application links intact. This uses fake-indexeddb and does not establish browser performance limits.

**Browser**

- Empty first run and explicit sample opt-in; candidate, job, company and application CRUD; live updates across tabs.
- Autosave across reloads, same-field conflict handling, invalid-draft guards and in-session detached-draft recovery.
- Today follow-ups with snooze and undo, bulk selection with undo, Applications board moves by keyboard, LinkedIn link editing, and the typed-`DELETE` confirmation.
- Backup restore in an isolated profile; offline reload, edit and reload.
- Navigation and reduced-motion behaviour; desktop, mobile, short-landscape and dark layouts without document overflow.
- The offline regression observed no external HTTP requests. Static CSP and worker tests confirm page connections are disabled, external worker requests are blocked and the file server is loopback-only.

## Checked manually, not automated

These were exercised in Chrome against the dev server with fictional data, but have no automated regression yet:

- Durable draft restore after a reload or closed tab.
- Keyboard shortcuts (`?`, `G` sequences, `J`/`K`) and the shortcuts dialog.
- The Views menu on Candidates, Jobs and Applications, salary filter/sort in the UI, and the field-by-field import dialog.
- Copy-to-clipboard controls (✉ / ☎ icons and detail-sheet buttons) and their in-control "Copied" state.
- The grouped toolbar actions at 1280px and 390px widths.

## Practical limits

- Browser evidence is Chrome on one Mac, including emulated mobile viewports. Safari, Firefox, physical iOS/Android devices, screen readers and long-term storage durability are not claimed.
- Vendor compatibility is checked against the supplied header row and synthetic quoted/multiline values; no real vendor file was available.
- Lists paginate, but filtering, sorting and transfer parsing run in browser memory, and the main live query still reads whole collections. Only the entity picker (combobox) is capped (100 shown, type to narrow). Vendor CSV batches are limited to 100 MiB / 100,000 rows; native JSON has no fixed cap and asks for confirmation above 100 MiB, with browser memory as the practical limit.
- Draft recovery relies on browser local storage; clearing site data removes both the workspace and any pending drafts.
- Salary values are parsed from free text for sorting and filtering only. The text itself remains the stored, editable value; unrecognised formats are listed under "No salary listed" filters and sort last.
- No application-level encryption, login, multi-device sync or cloud backup. IndexedDB and exported JSON need protection through the device and backup location.
- Restore is an atomic merge with explicit duplicate and settings confirmation; it does not remove unrelated existing records.
- The production build emits a non-fatal large-chunk warning (roughly 670 kB uncompressed). All assets are local; this is not a correctness issue.
- Updates preserve running tabs and old caches; close all app tabs to activate a downloaded build. Never clear site data as an update method.

## Reproduce

```sh
npm ci
npm test
npm run build
npm run preview          # leave running
npm run test:browser     # in another terminal
```

Tests use isolated browser contexts and synthetic data. The browser suite uses installed Google Chrome on macOS, or a Playwright browser if configured elsewhere. Set `PLAYWRIGHT_BASE_URL` to test a preview on a different origin.

## History

- **Initial release:** 32 data tests and 9 browser tests; light-blue palette and full sample added (palette contrast pairs above 4.5:1, primary button 7.67:1).
- **Audit round:** 44 data tests and 18 browser tests — see [UI-UX-AUDIT.md](UI-UX-AUDIT.md).
- **Refinement round 2:** 44 data tests and 26 browser tests — see [POLISH-ROUND-2.md](POLISH-ROUND-2.md).
- **Productivity round:** keyboard shortcuts, saved views, salary sort/filter, field-by-field import preview, durable draft recovery, combobox cap, copy-to-clipboard controls and grouped toolbar actions — 71 data tests and 35 browser tests.

Earlier counts describe earlier builds and are kept only as history.
