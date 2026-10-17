# Recruitdesk interaction refinement

Mode: Operate. Preserve the existing blue recruiter workspace and all data boundaries.

- Focal interaction: a fully opaque candidate/job detail sheet settles from the right over 220 ms; it retains list context without exposing text underneath.
- Continuity: deliberate page navigation gets a 160 ms opacity transition on the existing wrapper. No remount, per-row movement, delayed input, or replay on autosave. Rapid navigation cancels the previous animation.
- Feedback: controls change color/border over 140 ms, focused modal/menu entrances stay short, filter/detail sections settle without movement, and save-state icons acknowledge status changes.
- Budget: CSS and one bounded WAAPI animation; no animation package, layout animation, permanent will-change or mass row effects.
- Reduced motion: skip spatial/keyframe movement and JS navigation animation, retain immediate status text and 80 ms color feedback. Live preference changes cancel navigation motion.
- Validation: keyboard and rapid repeated interactions, multi-tab/draft regressions, desktop/tablet/mobile/landscape, reduced motion, and same dataset input/sort profiling.
