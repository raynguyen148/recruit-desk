# Refinement round 2 — motion, smoothness and responsive UI

17 October 2026. Main implementation plus independent Astra Medium responsive and performance reviews. Existing recruiting workflows, browser database and backup formats remain intact.

## Shipped changes

- Deliberate page navigation uses one 160ms opacity transition on the existing content wrapper. It does not remount the wrapper, animate table rows, replay on autosave, or delay input. Rapid navigation cancels the previous animation.
- Detail sheets enter over 220ms and remain fully opaque. Modal and menu entrances are short (180ms / 140ms); menus leave over 100ms. Controls, filter/detail content and save-state icons provide small, consistent feedback.
- Reduced motion disables spatial/keyframe effects and JavaScript page animation, while preserving status text and short color feedback. Changing the preference cancels an active navigation animation.
- Autosave actions and pending-status subscriptions are separated. Typing no longer broadcasts a changing context value to every editor and the workspace shell. Detached-draft recovery and conflict protection remain covered by regressions.
- Reused `Intl.Collator` instances replace per-comparison locale configuration. Candidate and other record lists retain their existing comparison rules.
- Mobile save feedback now has a visible icon and an explicit accessible status name, even when the compact header hides its text label.

## Verification

- TypeScript and production build: pass.
- Data/offline/search suite: **44 tests pass**.
- Chrome end-to-end suite: **21 tests pass**, including the existing cross-tab, orphan-draft, import/export and offline regressions, plus new navigation-motion, reduced-motion and short-landscape tests.
- Responsive review: 320×568, 390×844, 768×1024, 1024×768, 1440×900, and 568×320. Comfortable and compact tables, full sample import, settings, new-candidate dialog and detail sections were exercised. No new important responsive defect or document/dialog horizontal overflow was found. Table horizontal scrolling is intentional.
- Keyboard inspection: skip link first; modal focus remains contained; Escape returns to its opener. At 568×320, dialog content scrolls and the submit action remains reachable.
- Actual in-app preview confirms the revised sheet animation is 220ms with opacity 1. No user records were changed during verification.
- Mechanical scan reports only existing design-documentation size/radius advisories (79), not additional runtime defects. No unrelated style overhaul was performed.

## Local performance observations

Measured in isolated Chrome with 1,000 fictional candidates, 18 input events at 70ms intervals. Metric: input event to the second animation frame; it includes browser scheduling and is not an interaction SLA.

| Visible rows | Before median | After median |
|---|---:|---:|
| 50 | 27.25ms | 26.70ms |
| 100 | 41.85ms | 35.05ms |

The 100-row run improved by about 16%; the 50-row result is effectively unchanged. A separate 10,000-name sort microbenchmark retained identical order and reduced comparator work from roughly 159–174ms to 8.8–9.7ms. That does not mean the whole app became proportionally faster.

## Scope limits

Evidence is desktop Chrome and emulated mobile/touch contexts on this Mac. Physical iOS/Android, Safari/Firefox and low-end-device frame rates are not claimed. The main live query still reads full dataset snapshots after saves; that remains a future large-dataset optimization. Local recovery drafts remain in memory until saved. No animation dependency, telemetry, external assets or runtime network service was added.

## Follow-up: workspace-wide visual refinement

17 October 2026, current pass. Direct implementation and browser verification; no subagent review in this pass.

- Increased desktop table text to 12px, secondary text to 11px and controls to 12px. Removed the extra line caused by the candidate reveal icon; ordinary desktop rows now fit their intended 66px height. Quiet borders and consistent type establish hierarchy across all four record lists.
- Full-width mobile search, a separate action row, a narrower pinned identity column and clearer active bottom navigation. Touch fields preserve 16px text and controls preserve 44px targets. Candidate names use matching 16px semibold text on mobile.
- Shared keyboard-scrollable table regions and conditional horizontal-scroll guidance. All record types retain identity while scrolling; candidate row numbers scroll away before the name column reaches its pinned edge.
- Visible removable filter chips when the candidate filters are collapsed. Clear search restores input focus. Available status uses the same semantic green in the table and profile.
- Preferences lead Settings; a section index reaches backup, transfer, storage and sample sections without changing the route. Inventory counts use a compact text row. Changing workspace pages returns to the top.
- Dropdowns fit available viewport height, provide scrolling controls, and acknowledge open state with a bounded arrow transition. Existing page/sheet/modal motion remains bounded and respects reduced motion. No animation package or data-layer change.

### Verified final state

- TypeScript and production build passed. Final offline asset version: `031c1a587092c3121e4d56ba`.
- 44 data/search/transfer/offline tests and 24 Chrome browser tests passed. Browser coverage includes three new regressions for hidden filters/search focus, keyboard table scrolling/pinned identity, and Settings section navigation/page scroll restoration.
- Reviewed all five pages in light/dark at 1440px, plus mobile captures. A 20-case layout sweep covered all five pages at 320, 375, 414 and 768px with no document overflow or page errors. Final browser suite additionally covered 390px mobile and 568×320 landscape; touch field sizing was explicitly preserved after a regression check caught an undersized intermediate version.
- Static semantic-token contrast checks: main/muted/accent/primary/status text pairs are at least 4.56:1 in light and 6.42:1 in dark. This is not a full WCAG audit or a claim about every transient animation frame.
- The existing server at 4173 served an older build, so its initial test results were excluded from final evidence. Final verification used a separate server serving this checkout at 4175. Tests now accept `PLAYWRIGHT_BASE_URL`, including restore and offline origin checks.
- The checked-in prebuilt `dist/` was regenerated. The existing build-size warning remains: the main JavaScript bundle is about 678kB before gzip / 207kB gzip. No claim is made about physical-device frame rates or Safari/Firefox.

Design self-review: philosophy 4/5, hierarchy 4/5, execution 4/5, specificity 4/5, restraint 5/5, variety 4/5. Existing visual identity is intentionally preserved across pages.

## Detail views: wide centered modals

17 October 2026. Ray requested replacing every right-side detail panel with a comfortable wide popup.

- Candidates, jobs, companies, applications and the deleted-record fallback now share `DetailModal`: centered, maximum 1080px width and 860px height, with 32px desktop viewport margins and 12px mobile margins.
- Header and close action remain fixed; only the detail body scrolls. Existing desktop two-column forms, narrow-screen single-column forms and sticky section tabs are retained.
- Detail entrances use the existing 180ms centered modal animation instead of a right-edge slide. Reduced-motion rules include the new modal. Nested creation/confirmation overlays now dim the parent detail modal and render above it.
- Autosave, invalid-draft closure guards, deletion confirmation, linked-record navigation and focus restoration remain intact. No database or transfer-format change.
- Production build passed; all 26 browser tests passed, including all four record types, centered width, 320/375/768px touch layouts, 568×320 landscape, fixed-header scrolling, reduced motion, nested-dialog focus and the full existing data-editing regressions. Light/dark desktop and mobile renderings were inspected. Tests use isolated sample data.
