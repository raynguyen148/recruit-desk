# Recruitdesk
<!-- impeccable:product-schema 1 -->
## Platform
web
## Stack
Delegated by Ray: React, TypeScript, Vite, Tailwind, shadcn-style Radix components, Dexie IndexedDB. Local-only static app; no hosted service.
## Users
A personal recruiter managing candidates, jobs, companies and hiring relationships.
## Product Purpose
Maintain a searchable candidate library and track each candidate-job application with reliable private storage.
## Operating Context
Desktop-first, large candidate tables, quick edits, multiple simultaneous browser tabs. English UI. Import vendor CSV with Issue key mapped to cpmID.
## Capabilities and Constraints
No authentication, analytics, remote assets, external requests or backend. Full CRUD, field autosave, flexible profile entries, many-to-many applications, contacts, follow-ups, light/dark/system, validated previewed imports and full JSON backups including settings. Duplicate updates require explicit confirmation. Browser storage is origin-specific and not encryption at rest.
## Brand Commitments
Clean, refined professional recruiter UI; Radix, shadcn and Tailwind. User delegates remaining design decisions. Primary color: light blue (explicit request, 17 October 2026).
## Evidence on Hand
Only CSV header schema is supplied. No candidate data. Any sample data must be fictional and explicitly opt-in.
## Product Principles
- Candidate identity is explicit and unique through cpmID.
- Preserve provenance and avoid silent overwrites.
- Data stays on this browser and exports remain user-controlled.
- Daily work is a searchable editable table, not a decorative dashboard.
## Assumptions selected under delegated authority
Name Recruitdesk; Candidates default route; optional synthetic sample workspace; code-first implementation for a functional data-dense app.
