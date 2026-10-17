# Recruitdesk — UI/UX, feature and reliability audit

Date: 17 October 2026. Reviewed by the main agent with three independent Astra Medium agents. Scope: Candidates, Jobs, Applications, Companies, Settings, detail editors, creation forms, JSON/CSV transfer, autosave, cross-tab updates, and desktop/mobile/light/dark behavior. All browser mutations used isolated fictional test profiles.

## Conclusion

The audit found real data-loss and workflow defects, not just visual polish opportunities. The confirmed defects below have been corrected and their targeted regressions pass. No remaining blocking defect was observed in the tested flows. This is not a guarantee for every browser, dataset size or interruption scenario.

Implementation integrity: coherent recruiter-specific system; retain the light-blue palette, editable records, CPM identity and candidate–job application model. Avoid replacing useful data with a decorative dashboard.

## Current audit health

These are qualitative implementation scores, not accessibility certification.

| Dimension | Score / 4 | Evidence and remaining gap |
|---|---:|---|
| Accessibility | 3 | Explicit field/error semantics, IME handling, skip link and dialog focus restoration. No full assistive-technology certification. |
| Performance | 2 | Memoized search text/count maps/application results and bounded table pages. The main live query still loads the whole dataset; entity pickers still render all options. |
| Responsive design | 3 | Desktop/tablet/mobile tested; touch-sized controls, 16px mobile inputs, safe areas, pinned-name bounds and unobstructed bottom navigation. No physical iOS/Android test. |
| Theming | 4 | Token-based light/dark blue palette, readable semantic color pairs and matching browser theme metadata in tested views. |
| Implementation integrity | 3 | Atomic writes, explicit conflict guards, verified backup format and repeatable sample data. Validation schemas remain duplicated; design documentation abbreviates some existing size/radius values. |
| **Total** | **15 / 20** | **Good — strongest next investment is large-dataset workflow and query efficiency.** |

## Confirmed findings and applied fixes

| Priority | Finding and practical effect | Resolution / current source |
|---|---|---|
| P1 | A second tab could rename a candidate so that a filtered row disappeared before debounce; the unsaved field was discarded while the header said saved. | Autosave now retains detached controllers, completes valid writes, and exposes failed drafts for retry/copy/explicit discard. `src/components/autosave.tsx:31`. |
| P1 | Multiple individually valid imports could grow the database above 100 MiB, after which full backup refused to export. | Native Recruitdesk JSON has no arbitrary cumulative file/count limit. Strict field/format validation remains. Large native files require confirmation before reading; CSV batch limits remain. `src/lib/transfer.ts:304`, `src/lib/transfer.ts:539`, `src/components/import-dialog.tsx:43`. |
| P2 | Whitespace normalization during an in-flight CPM edit caused a false cross-tab conflict for the next queued edit. | Canonicalize the submitted value/baseline and wait for the live query to acknowledge it without replacing newer typing. `src/components/autosave.tsx:178`. |
| P2 | A failed detached custom field could be preserved outside a modal but inaccessible because closing the modal retried the failed draft forever. | Details may close when only detached drafts remain, exposing recovery; navigation/export still require all drafts to be resolved. `src/components/details.tsx:77`. |
| P2 | Imported timestamp follow-ups were displayed as dates but compared against a shortened expected value, making detail edits fail. | Compare against the actual stored timestamp while editing its date representation. `src/components/details.tsx`, ApplicationDetail follow-up field. |
| P2 | Mobile import toast overlapped bottom navigation and could intercept taps. | Toast offset clears the navigation bar and safe area. `src/App.tsx:416`. |
| P2 | Closing sheets and nested dialogs left keyboard focus on the document body. | Restore focus to a connected, visible opener; confirmation dialogs share the behavior. `src/components/ui/dialog.tsx:5`, `src/components/ui/confirm.tsx`. |
| P2 | Profile entries, contact logs and custom fields were deleted immediately. | Explicit confirmation before removal; invalid attached drafts must be resolved first. `src/components/remove-item.tsx`. |
| P2 | A very long candidate name expanded the pinned identity column over other mobile columns. | Bound the identity cell and truncate the list label; full names remain available and wrap in detail. `src/styles.css`, final candidate-table rules. |
| P2 | Small controls and small input text were poor touch targets and could trigger mobile focus zoom. | 44px coarse-pointer targets, 16px input text including spreadsheet edits, safe-area spacing and modal scroll containment. `src/styles.css`, final responsive rules. |
| P2 | Enter during IME composition could prematurely commit an edited field. | Respect composing keyboard events. `src/components/autosave.tsx`, input key handler. |
| P2 | Free-text salary sorting produced an incorrect numeric order, even for $900 versus $1,000. | Removed the misleading sort action. Salary stays editable free text until amount/currency/period are structured. `src/pages/candidates.tsx:298`, `src/pages/records.tsx`. |
| P3 | Candidate search missed past employers, certificates, custom fields, phone and contact notes. | Search now includes all those profile fields, with memoized search text. `src/lib/search.ts`, `src/pages/candidates.tsx:69`. |
| P3 | Each visible row scanned every relationship to display its count. | Build count maps once and memoize Applications filtering/sorting. `src/lib/search.ts:31`, `src/pages/records.tsx:576`. |
| P3 | Sidebar Applications count excluded terminal stages while the page count included them. | Both now show the total application count. `src/App.tsx:215`. |

## Verification

- Production TypeScript check and build: pass.
- Unit/integration tests: **44 passed** across database, transfer, search/counts, full sample, offline/server and 10,000-profile round trip.
- Chrome end-to-end suite: **18 passed**, including every reproduced autosave issue, timestamp editing, deletion confirmation, mobile toast clearance, large-file approval before reading, existing CRUD/import/export/offline and cross-tab flows.
- Additional isolated touch-enabled Chrome inspection: all five pages; candidate/job tabs; company/application detail; nested Escape and Cancel focus; 280-character unbroken name; 196px pinned identity width on a 390px viewport; 44px primary action; no page errors.
- Desktop, dark and mobile captures inspected. Tests did not find document-level overflow. Table-level horizontal scrolling is intentional.
- The offline browser regression still observed no external HTTP requests in its exercised flow.
- Mechanical detector: **77 advisory documentation mismatches** (72 typography and 5 radius values). These are differences between existing CSS values and the abbreviated DESIGN.md scale, not evidence of 77 runtime bugs. They were not used to justify unrelated visual changes.

## Recommended next work — not silently added

1. **Searchable entity pickers and saved views.** Replace all-record candidate/job selection menus with searchable, bounded results. Save common filter/sort/column combinations for recurring sourcing work.
2. **Daily follow-up view.** Group overdue, today and upcoming actions; support explicit complete/reschedule operations and link each action to its application.
3. **Field-by-field import preview.** Show old/new values and let the recruiter accept selected changes instead of one aggregate overwrite checkbox.
4. **Structured compensation.** Store minimum/maximum, currency and pay period separately before adding reliable sorting/filtering. Keep original text for provenance.
5. **Durable draft recovery and editable contact logs.** Persist local draft snapshots across crashes, and permit correcting contact entries without deleting/recreating them.
6. **Indexed/paged live queries and shared validation schemas.** Profile actual large browser workspaces, then stop rereading full record payloads on each write. Unify persistence/transfer validation to prevent schema drift.

## Remaining limits

- Draft recovery added here is in memory for the current app session. Before-unload warnings help, but forced termination can still lose unsaved text.
- Large native JSON files are read, parsed and serialized in browser memory. Removing an artificial format cap does not remove browser memory limits or guarantee arbitrarily large transfers.
- Browser evidence is Chrome on this Mac, including emulated mobile viewports/touch capability. Safari, Firefox, physical mobile devices and screen readers were not comprehensively verified.
- IndexedDB and exported JSON are not application-encrypted. Offline operation does not protect data from someone with access to the browser profile/device or backup files.
- No real vendor file was supplied; compatibility tests use the exact provided columns with fictional values.
- The application bundle remains about 671 kB uncompressed / 206 kB gzip. Splitting it is a lower priority than query and selector scaling for this local-only app.

## Review references

The review combined current source and browser evidence with [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md) and the installed Impeccable audit/hardening guidance. Generic rules were adapted to the explicit offline, data-dense recruiter brief; no remote fonts, analytics or integrations were introduced.

## Second refinement pass

The current refinement passes 44 data tests and 21 browser tests. See `POLISH-ROUND-2.md` for motion behavior, responsive coverage and qualified before/after performance evidence.
