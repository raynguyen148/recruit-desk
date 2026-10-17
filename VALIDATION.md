# Release verification — 17 October 2026

The delivered production build was tested locally with Node 24 and installed Google Chrome. No real candidate records were supplied; all tests and screenshots use fictional records.

## Confirmed

- TypeScript check and production build pass.
- 32 automated data/offline tests pass: 11 database, 17 transfer, 3 offline/server and 1 large-dataset round trip.
- 9 Chrome end-to-end tests pass: empty first run and explicit sample opt-in; candidate CRUD and case-insensitive CPM uniqueness; autosave across reloads; live updates across tabs; company/job/application relationships and deletion protections; stage history; malformed/duplicate CSV rejection; valid CSV imports; backup restore into an isolated browser context; offline reload/edit/reload; same-field conflict draft retention; invalid-draft guards; desktop/mobile/dark layout checks.
- The browser offline test observed zero external HTTP requests during its tested flow. Static CSP and worker tests verify page connections disabled, external worker requests blocked, and a loopback-only file server.
- 10,000 fictional candidate profiles imported with exact vendor headers, detected as 10,000 updates on a second preview, exported and restored into an empty test database while preserving company/job/application/candidate links. This uses fake-indexeddb and does not establish browser performance limits.
- Independent data audit findings were fixed: protected tab switching for dirty fields, aligned local/import size constraints, and timezone-offset timestamp compatibility.
- Independent visual review disposition: ship for captured desktop/mobile/light/dark candidate list and desktop job/application details. The final inline availability Select was additionally verified through the visible app.
- Mechanical Impeccable scan reported no findings. Design tokens and component behavior are documented in DESIGN.md and .impeccable/design.json.

## Practical limits

- Browser evidence is Chrome/local only. Safari, Firefox, accessibility certification, and long-term storage durability are not claimed.
- Vendor compatibility is checked against the exact supplied headers and synthetic quoted/multiline values; no real vendor file was available.
- The UI paginates records, but filtering/sorting and full transfer parsing operate in browser memory. Vendor CSV batches are limited to 100 MiB / 100,000 candidate rows. Native JSON has no fixed file/count cap and warns before reading files above 100 MiB; browser memory remains the practical limit.
- No application-level encryption, login, multi-device sync, or cloud backup. IndexedDB and exported JSON require protection through the device and backup location.
- Restore is an atomic merge with explicit duplicate/settings confirmation. It does not remove unrelated records already in the workspace.
- The production build has a non-fatal large JavaScript chunk warning (about 667 kB uncompressed, 204 kB gzip). All assets remain local; this is not a correctness failure.
- Updates preserve running tabs and old caches; close all app tabs to activate a downloaded new build. Do not clear browser site data as an update method.

## Reproduce

From the app directory, run `npm ci`, `npm test`, `npm run build`, and `npm run preview`. In another terminal run `npm run test:browser`. Tests use isolated browser contexts and synthetic data. The browser suite uses installed Google Chrome on macOS, or a Playwright browser if configured on another platform.

## Light-blue palette and full sample follow-up

The requested palette uses pale-blue primary fills with dark-blue text in both themes. Measured key text/background pairs exceed 4.5:1; the light primary button pair is 7.67:1. A Chrome visual check passed for desktop, dark and mobile with no page errors or document overflow. The mechanical detector now reports advisory differences between existing typography/radii and their abbreviated design documentation; this color change does not alter those dimensions.

The complete sample file passed two isolated data tests and an actual browser file import: 24 candidates, 12 jobs, 8 companies, 36 applications, profile details and related jobs. First preview: 80 new records plus one settings update. Repeat preview requires confirmation of 81 updates. The browser verification used an isolated profile and did not import into the user workspace.

## Full audit follow-up

The current build passes 44 unit/integration tests and 18 Chrome browser tests. The full findings, fixes, evidence boundaries and prioritized next work are in `UI-UX-AUDIT.md`. This supersedes the earlier counts above; those describe the prior release.

## Second refinement pass

The current refinement passes 44 data tests and 21 browser tests. See `POLISH-ROUND-2.md` for motion behavior, responsive coverage and qualified before/after performance evidence.
