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
