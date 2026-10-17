# Recruitdesk

A personal recruiting workspace built with React, TypeScript, Vite, Tailwind, Radix components and Dexie/IndexedDB. The production app runs locally with bundled scripts, icons and fonts. There is no account, password, backend, analytics or external API.

## Start locally

Use a supported Node.js release (Node 22 recommended) and npm. From this folder:

```sh
npm ci
npm run build
npm run preview
```

Open **http://127.0.0.1:4173**. Dependency installation needs internet access; the built app does not. The preview server binds only to the local loopback address. Keep the terminal open for predictable startup. `PORT=4174 npm run preview` changes the port, but also changes the browser storage origin: your existing records will not appear there. Use the same browser profile, hostname and port every time. Do not open `dist/index.html` as a file.

After the initial local load and successful service worker installation, all production assets are cached for offline use. The app can then reopen without internet; keep the local server available if browser cache has been cleared or the worker has not installed. Browser support and storage policies can affect this behavior. After source changes, rebuild and close/reopen all production app tabs to load the new cached version.

## Develop with live updates

```sh
npm run dev
```

Open **http://127.0.0.1:5173**. Vite updates CSS immediately and React components through Fast Refresh when you save source files; some changes require a full reload. The port is fixed: if 5173 is occupied, startup fails instead of silently changing your browser storage origin. Stop the other development server or choose an explicit port with `npm run dev -- --port 5174`.

Dev uses a separate browser database from the offline app at 4173 (and any preview at 4175). Use fictional records for development. No data is moved or cleared when switching servers. Keep dev on its own origin; do not reuse an origin already controlled by a production service worker.

Only Vite-served HTML relaxes CSP: inline scripts support React Refresh, and connections are limited to the same origin plus loopback HMR WebSockets on the configured port. External connections remain blocked; dev registers no service worker and sets `worker-src 'none'`. The source HTML and production build retain `script-src 'self'` and `connect-src 'none'`; the production static server and offline worker are unchanged.

`npm run test:hmr` verifies real CSS and React file saves using an isolated temporary source copy and Chrome profile. It checks that the page updates without reloading or losing search state, verifies the dev CSP, and removes its temporary workspace afterward. It needs installed Google Chrome (or Playwright Chromium) and an available loopback port.

## Local data and privacy

Records live in IndexedDB in this browser profile, scoped to this exact origin. The server serves static files only; it does not receive candidate data. The production page's Content Security Policy disables network connections. Its service worker can fetch same-origin static files during installation and serves subsequent requests from its versioned cache. Cross-origin requests are blocked. All fonts and application dependencies are bundled.

There is no password or application-level encryption. Anyone with access to the OS account/browser profile can access the workspace. Exported JSON backups and imported CSV files are unencrypted. Use an OS login, disk encryption, screen locking and an appropriate protected backup location. Browser private mode, clearing site data, uninstalling a browser, storage pressure or browser policies can remove data. Requesting persistent storage is not a guarantee. This is not a substitute for your organization's access-control or retention requirements.

Make regular **full JSON backups**, especially before imports and upgrades. Keep a copy outside browser storage and verify a restore with disposable data. A vendor CSV is an interchange format, not a complete backup: relationships, settings, notes and other workspace structures may not survive a CSV round trip. JSON restore merges records into the current workspace and restores settings after confirmation; it does not clear existing data. Export a backup first and review conflicts carefully.

## Imports and identity

Candidate identity uses `cpmID`; the vendor column **Issue key** maps to `cpmID`. The import screen previews recognized fields and validation issues before any write. Review duplicate handling and explicitly confirm updates. **Summary** maps to candidate name, **Custom field (Years of experience)** to years of experience, **Custom field (Skill Set)** to skills, and **Custom field (Country/ City)** to location. Short aliases `YOE`, `Skill Set`, and `Country/ City` are also accepted; exact custom-field headers take precedence when both are present. Vendor `Status` is preserved as source data and never changes candidate availability. Original vendor values are retained in `vendorData`. The supplied source material contained headers only, so compatibility with a real vendor file still needs verification. Any sample workspace is fictional and must be loaded explicitly.

Applications connect candidates to jobs. Jobs connect to companies. Full JSON backups preserve all workspace collections and settings. Candidate-only JSON exports omit relationships; job JSON exports include referenced companies and omit applications. CSV is an import-only vendor format. Files are not uploaded to an external service.

## Updates and recovery

Before replacing a build, make a JSON backup. Rebuild, start the server, open the app once to let the new service worker download the local bundle, then **close every tab/window for this app** and reopen it. A new worker waits for old tabs to close instead of forcibly replacing their running code. Old version caches are deliberately retained to protect existing tabs; they consume some disk space. Do not clear all site data to update the app, because that also deletes IndexedDB. If you manually remove caches in browser tools, preserve the IndexedDB database and keep a separate backup.

The app is single-user and browser-local. It does not provide synchronization across devices or browsers, server backup, team permissions, encrypted storage, email sending, calendar integration, attachment hosting, or vendor API synchronization. Keep records and backup files consistent with your own data-handling obligations.

## Verification

```sh
npm test
npm run build
npm run test:browser  # with the production preview running; uses installed Google Chrome
npm run test:hmr      # starts and cleans up its own isolated Vite server
```

Tests cover domain behavior and the generated offline worker/static server boundaries. Automated checks are not proof of long-term browser storage durability. To verify a release manually: start the production server, create a fictional record, reload, export and restore a backup in a disposable browser profile, allow the worker to activate, then test an offline reload and inspect the browser network panel for external requests.

### Supported transfer limits

Vendor CSV batches are limited to 100 MiB and 100,000 candidate rows. Native Recruitdesk JSON exports and restores have no fixed file-size or collection-count cap, so multiple valid imports do not leave a workspace that the format refuses to back up. Strict version, field validation, duplicate detection and relationship checks remain. Native JSON files larger than 100 MiB ask for explicit confirmation before they are read. All JSON processing still happens in browser memory: very large files can pause the interface or exceed the browser's practical memory limits. Keep regular backups; separate candidate/job exports do not replace a full relational backup.

## Ready-to-run local package

The included `dist/` folder is already built. On macOS, open `Start Recruitdesk.command` to start the local server and open your browser. Node.js must be installed; no dependency installation is needed to run this prebuilt package. Keep its Terminal window open while using the app. Use `http://127.0.0.1:4173` consistently; changing the hostname, port, or browser profile opens a different browser database.

## Implementation references

The UI follows the [shadcn data-table pattern](https://ui.shadcn.com/docs/components/radix/data-table), with locally owned React components, Radix primitives and Tailwind. [Dexie live queries](https://dexie.org/docs/dexie-react-hooks/useLiveQuery%28%29) propagate committed database changes across tabs. The production page uses [CSP connect-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src) set to none. These documentation links are only in the source guide, never requested by the running app.

## Complete importable sample

Use `samples/recruitdesk-full-sample.json` with **Settings & data → Restore workspace JSON**. It contains 24 fictional candidates, 12 jobs, 8 companies, 36 applications and workspace settings. Review the confirmation before importing. Stable IDs support repeated imports without duplicates. See `samples/README.md` for detailed coverage.

## Editing safeguards

Inline drafts remain tracked if a live update removes their row from the current filter. A valid draft finishes saving; a failed draft appears in an Unsaved drafts recovery panel where its text can be copied, retried or explicitly discarded. This recovery is in-memory for the current app session; a forced browser shutdown is not a durable draft backup. Closing a detail panel can reveal detached recovery drafts, while navigation and export remain blocked until they are resolved. Profile subitems require confirmation before permanent removal.

Candidate search includes phone, source, experience, education, certificates, projects, custom fields and contact notes. Salary stays a free-text field and is not offered as a numerical sort until structured compensation is supported.

## Audit and next work

See `UI-UX-AUDIT.md` for the full UI/UX and data-reliability review, applied fixes, current 44+18 test results, and remaining browser/performance limits.

## Motion and responsive refinement

`POLISH-ROUND-2.md` documents subtle interaction feedback, reduced-motion support, responsive verification and local performance measurements. The current suite contains 44 data tests and 26 browser tests. The follow-up in `POLISH-ROUND-2.md` covers the full-workspace typography, tables, filters, Settings and mobile refinement. Use `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4175 npm run test:browser` when verifying a separate local preview; browser storage remains specific to each origin.
